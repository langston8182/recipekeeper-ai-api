/**
 * Service pour invoquer d'autres Lambda
 */
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

// Configuration du client Lambda
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Envoie la recette extraite à l'API RecipeKeeper
 * @param {Object} recipe - La recette à envoyer
 * @returns {Promise<Object>} - La réponse de l'API
 */
async function sendRecipeToAPI(recipe) {
  const env = process.env.ENVIRONMENT || 'preprod';
  const lambdaName = `recipekeeper-api-${env}`;
  
  console.log(`Invoking Lambda: ${lambdaName}`);

  try {
    // Préparation du payload pour l'API
    const payload = {
      httpMethod: 'POST',
      path: '/recipes',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recipe)
    };

    // Création de la commande pour invoquer la Lambda
    const command = new InvokeCommand({
      FunctionName: lambdaName,
      InvocationType: 'RequestResponse', // Synchrone
      Payload: JSON.stringify(payload)
    });

    // Invocation de la Lambda
    const response = await lambdaClient.send(command);

    // Décodage de la réponse
    const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log('Lambda invocation successful');

    // Vérification du statut de la réponse
    if (response.FunctionError) {
      console.error('Lambda execution error:', responsePayload);
      throw new Error(`Lambda execution failed: ${JSON.stringify(responsePayload)}`);
    }

    // Parse du body si c'est une réponse API Gateway
    let parsedResponse = responsePayload;
    if (responsePayload.body && typeof responsePayload.body === 'string') {
      parsedResponse = {
        ...responsePayload,
        body: JSON.parse(responsePayload.body)
      };
    }

    // Vérification du code de statut
    if (parsedResponse.statusCode && parsedResponse.statusCode >= 400) {
      throw new Error(`API returned error status ${parsedResponse.statusCode}: ${JSON.stringify(parsedResponse.body)}`);
    }

    return parsedResponse;

  } catch (error) {
    console.error(`Error invoking Lambda ${lambdaName}:`, error);

    // Gestion des erreurs spécifiques AWS
    if (error.name === 'ResourceNotFoundException') {
      throw new Error(`Lambda function ${lambdaName} not found. Check ENV variable.`);
    }

    if (error.name === 'AccessDeniedException') {
      throw new Error(`No permission to invoke Lambda ${lambdaName}`);
    }

    throw error;
  }
}

/**
 * Vérifie si la Lambda cible est accessible
 * @returns {Promise<boolean>}
 */
async function checkAPIAvailability() {
  const env = process.env.ENVIRONMENT || 'preprod';
  const lambdaName = `recipekeeper-api-${env}`;

  try {
    // Test simple d'invocation (pourrait être un endpoint de health check)
    const testPayload = {
      httpMethod: 'GET',
      path: '/health',
      headers: {}
    };

    const command = new InvokeCommand({
      FunctionName: lambdaName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(testPayload)
    });

    await lambdaClient.send(command);
    return true;
  } catch (error) {
    console.error('API availability check failed:', error);
    return false;
  }
}

export {
  sendRecipeToAPI,
  checkAPIAvailability
};
