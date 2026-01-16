/**
 * Point d'entrée de la fonction Lambda
 * Gère les requêtes pour l'extraction de recettes via AWS Bedrock
 * Supporte :
 * - Événements API Gateway (HTTP POST)
 * - Événements S3 (upload de PDF)
 * - Événements SQS (résultats Textract)
 */
import {getConfigValue} from "./utils/config.appconfig.mjs";
import recipeController from './controllers/recipe.controller.mjs';
import { successResponse, errorResponse } from './utils/response.util.mjs';
import * as textractService from './services/textract.service.mjs';
import * as s3Service from './services/s3.service.mjs';
import * as webpageService from './services/webpage.service.mjs';

/**
 * Handler principal pour l'extraction de recettes
 * 
 * @param {Object} event - L'événement Lambda (API Gateway, S3, ou SQS)
 * @param {Object} context - Le contexte d'exécution Lambda
 * @returns {Promise<Object>} - La réponse HTTP formatée
 * 
 * Exemple de corps de requête API Gateway:
 * {
 *   "recipeText": "Recette de pâtes carbonara pour 2 personnes..."
 * }
 */
export const handler = async (event, context) => {
  console.log('Lambda invoked');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Détection du type d'événement
    
    // 1. Événement SQS (résultat de Textract via SNS)
    if (event.Records && event.Records[0]?.eventSource === 'aws:sqs') {
      return await handleSqsEvent(event);
    }
    
    // 2. Événement S3 (nouveau fichier PDF)
    if (event.Records && event.Records[0]?.eventSource === 'aws:s3') {
      return await handleS3Event(event);
    }
    
    // 3. Événement API Gateway (requête HTTP directe)
    return await handleApiGatewayEvent(event);

  } catch (error) {
    console.error('Error in handler:', error);
    return errorResponse('Internal server error', 500, [error.message]);
  }
};

/**
 * Gère les événements S3 (nouveau fichier PDF uploadé)
 */
async function handleS3Event(event) {
  console.log('Processing S3 event');
  
  // Déterminer le mode Textract (synchrone pour tests, asynchrone par défaut)
  const useSyncMode = process.env.USE_SYNC_TEXTRACT === 'true';
  console.log(`Textract mode: ${useSyncMode ? 'synchronous' : 'asynchronous'}`);
  
  // Configuration requise uniquement pour le mode asynchrone
  let snsTopicArn, textractRoleArn;
  if (!useSyncMode) {
    snsTopicArn = await getConfigValue('textract', 'SNS_TEXTRACT_ARN');
    textractRoleArn = await getConfigValue('textract', 'ROLE_ARN');
    
    if (!snsTopicArn || !textractRoleArn) {
      return errorResponse('Missing Textract configuration', 500, [
        'TEXTRACT_SNS_TOPIC_ARN and TEXTRACT_ROLE_ARN must be set for async mode'
      ]);
    }
  }

  const results = [];

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: s3://${bucket}/${key}`);

    // Vérifier que c'est un fichier supporté (PDF ou image)
    if (!s3Service.isSupportedFile(key)) {
      console.log(`Skipping unsupported file type: ${key}`);
      results.push({
        bucket,
        key,
        status: 'skipped',
        reason: 'Not a PDF file'
      });
      continue;
    }

    try {
      if (useSyncMode) {
        // Mode synchrone : extraction et traitement immédiat
        console.log(`Extracting text synchronously from ${key}`);
        const extractedText = await textractService.detectDocumentTextSync(bucket, key);
        
        // Traiter immédiatement avec Bedrock
        console.log(`Processing extracted text with Bedrock`);
        const recipe = await recipeController.extractRecipeFromText(extractedText);
        
        results.push({
          bucket,
          key,
          status: 'completed',
          mode: 'synchronous',
          recipe
        });
      } else {
        // Mode asynchrone : démarrer Textract job
        const textractResult = await textractService.startTextExtraction(
          bucket,
          key,
          snsTopicArn,
          textractRoleArn
        );

        results.push({
          bucket,
          key,
          status: 'processing',
          mode: 'asynchronous',
          jobId: textractResult.jobId
        });
      }

    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      results.push({
        bucket,
        key,
        status: 'error',
        error: error.message
      });
    }
  }

  return successResponse({
    message: 'S3 event processed',
    results
  }, 202);
}

/**
 * Gère les événements SQS (résultat de Textract via SNS)
 */
async function handleSqsEvent(event) {
  console.log('Processing SQS event');

  const results = [];

  for (const record of event.Records) {
    try {
      // Parser le message SNS dans le message SQS
      const snsMessage = JSON.parse(record.body);
      const textractMessage = JSON.parse(snsMessage.Message);

      console.log('Textract notification:', textractMessage);

      const jobId = textractMessage.JobId;
      const status = textractMessage.Status;

      if (status !== 'SUCCEEDED') {
        console.log(`Textract job ${jobId} status: ${status}`);
        results.push({
          jobId,
          status,
          processed: false
        });
        continue;
      }

      // Récupérer le texte extrait
      console.log(`Retrieving text for job: ${jobId}`);
      const extractedText = await textractService.getTextExtractionResult(jobId);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text extracted from document');
      }

      // Extraire la recette avec Bedrock
      console.log('Extracting recipe from text...');
      const result = await recipeController.extractRecipeFromText(extractedText);

      results.push({
        jobId,
        status: 'completed',
        recipe: result.recipe,
        apiResponse: result.apiResponse
      });

    } catch (error) {
      console.error('Error processing SQS record:', error);
      results.push({
        messageId: record.messageId,
        status: 'error',
        error: error.message
      });
    }
  }

  return successResponse({
    message: 'SQS event processed',
    results
  }, 200);
}

/**
 * Gère les événements API Gateway (requête HTTP directe)
 */
async function handleApiGatewayEvent(event) {
  console.log('Processing API Gateway event');

  try {
    // Parsing du corps de la requête
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return errorResponse('Invalid JSON in request body', 400);
    }

    // Validation des paramètres
    if (!body) {
      return errorResponse('Missing request body', 400);
    }

    // Cas 1 : Extraction depuis une URL
    if (body.url) {
      return await handleUrlExtraction(body.url);
    }

    // Cas 2 : Extraction depuis du texte brut
    if (body.recipeText) {
      return await handleTextExtraction(body.recipeText);
    }

    return errorResponse('Missing required parameter: url or recipeText', 400);

  } catch (error) {
    console.error('Error in API Gateway handler:', error);

    // Gestion des différents types d'erreurs
    if (error.message.includes('Bedrock')) {
      return errorResponse('AI service temporarily unavailable', 503, [error.message]);
    }

    if (error.message.includes('parse') || error.message.includes('Invalid recipe')) {
      return errorResponse('Could not extract valid recipe from text', 422, [error.message]);
    }

    if (error.message.includes('required')) {
      return errorResponse(error.message, 400);
    }

    // Erreur générique
    return errorResponse('Internal server error', 500, [error.message]);
  }
}

/**
 * Gère l'extraction depuis une URL
 */
async function handleUrlExtraction(url) {
  // Validation de l'URL
  if (!webpageService.isValidUrl(url)) {
    return errorResponse('Invalid URL format', 400);
  }

  console.log(`Extracting recipe from URL: ${url}`);

  try {
    // Récupérer le contenu de la page web
    const webContent = await webpageService.fetchAndExtractWebpage(url);

    if (!webContent.text || webContent.text.trim().length === 0) {
      return errorResponse('No text content found at URL', 422);
    }

    // Limiter la taille du texte
    let textToProcess = webContent.text;
    if (textToProcess.length > 50000) {
      console.log(`Text too long (${textToProcess.length} chars), truncating to 50000`);
      textToProcess = textToProcess.substring(0, 50000);
    }

    // Extraire la recette
    console.log('Processing recipe extraction from URL...');
    const result = await recipeController.extractRecipeFromText(textToProcess);

    console.log('Recipe extracted successfully from URL');
    return successResponse({
      ...result,
      sourceUrl: url,
      extractedTextLength: webContent.text.length
    }, 200);

  } catch (error) {
    console.error('Error extracting from URL:', error);

    if (error.message.includes('fetch') || error.message.includes('timeout')) {
      return errorResponse('Failed to fetch webpage', 502, [error.message]);
    }

    throw error;
  }
}

/**
 * Gère l'extraction depuis du texte brut
 */
async function handleTextExtraction(recipeText) {
  // Validation de la longueur du texte
  if (recipeText.length > 50000) {
    return errorResponse('Recipe text too long (max 50000 characters)', 400);
  }

  // Extraction de la recette
  console.log('Processing recipe extraction from text...');
  const result = await recipeController.extractRecipeFromText(recipeText);

  console.log('Recipe extracted successfully');
  return successResponse(result, 200);
}

/**
 * Handler pour vérifier la santé du service
 * 
 * @param {Object} event - L'événement Lambda
 * @param {Object} context - Le contexte d'exécution Lambda
 * @returns {Promise<Object>} - La réponse HTTP formatée avec le statut du service
 */
export const healthCheck = async (event, context) => {
  console.log('Health check invoked');

  try {
    const health = await recipeController.healthCheck();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 207 : 503;
    
    return successResponse(health, statusCode);

  } catch (error) {
    console.error('Error in healthCheck handler:', error);
    return errorResponse('Health check failed', 500, [error.message]);
  }
};

/**
 * Handler pour les requêtes OPTIONS (CORS preflight)
 * 
 * @param {Object} event - L'événement Lambda
 * @param {Object} context - Le contexte d'exécution Lambda
 * @returns {Object} - La réponse HTTP avec les en-têtes CORS
 */
export const options = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
};
