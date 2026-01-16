/**
 * Service pour extraire du texte depuis des PDFs avec AWS Textract
 */
import { 
  TextractClient, 
  StartDocumentTextDetectionCommand, 
  GetDocumentTextDetectionCommand,
  DetectDocumentTextCommand 
} from '@aws-sdk/client-textract';

// Configuration du client Textract
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Démarre l'extraction de texte d'un document PDF dans S3
 * @param {string} bucket - Le nom du bucket S3
 * @param {string} key - La clé du fichier dans S3
 * @param {string} snsTopicArn - L'ARN du topic SNS pour les notifications
 * @param {string} roleArn - L'ARN du rôle IAM pour Textract
 * @returns {Promise<Object>} - Contient le JobId de Textract
 */
async function startTextExtraction(bucket, key, snsTopicArn, roleArn) {
  console.log(`Starting Textract job for s3://${bucket}/${key}`);

  const command = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    },
    NotificationChannel: {
      SNSTopicArn: snsTopicArn,
      RoleArn: roleArn
    }
  });

  try {
    const response = await textractClient.send(command);
    console.log('Textract job started:', response.JobId);
    
    return {
      jobId: response.JobId,
      status: 'STARTED'
    };
  } catch (error) {
    console.error('Error starting Textract job:', error);
    throw new Error(`Failed to start Textract: ${error.message}`);
  }
}

/**
 * Récupère le résultat d'un job Textract
 * @param {string} jobId - L'ID du job Textract
 * @returns {Promise<string>} - Le texte extrait
 */
async function getTextExtractionResult(jobId) {
  console.log(`Getting Textract results for job: ${jobId}`);

  let nextToken = null;
  let allText = [];

  try {
    do {
      const command = new GetDocumentTextDetectionCommand({
        JobId: jobId,
        NextToken: nextToken
      });

      const response = await textractClient.send(command);

      if (response.JobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${response.StatusMessage}`);
      }

      if (response.JobStatus !== 'SUCCEEDED') {
        throw new Error(`Textract job not completed yet. Status: ${response.JobStatus}`);
      }

      // Extraire le texte des blocs LINE
      if (response.Blocks) {
        const lines = response.Blocks
          .filter(block => block.BlockType === 'LINE')
          .map(block => block.Text);
        
        allText.push(...lines);
      }

      nextToken = response.NextToken;
    } while (nextToken);

    const extractedText = allText.join('\n');
    console.log(`Extracted ${extractedText.length} characters from document`);

    return extractedText;

  } catch (error) {
    console.error('Error getting Textract results:', error);
    throw new Error(`Failed to get Textract results: ${error.message}`);
  }
}

/**
 * Extrait le texte d'un document de manière synchrone (max 5 pages)
 * @param {string} bucket - Le nom du bucket S3
 * @param {string} key - La clé du fichier dans S3
 * @returns {Promise<string>} - Le texte extrait
 */
async function detectDocumentTextSync(bucket, key) {
  console.log(`Starting synchronous Textract for s3://${bucket}/${key}`);

  const command = new DetectDocumentTextCommand({
    Document: {
      S3Object: {
        Bucket: bucket,
        Name: key
      }
    }
  });

  try {
    const response = await textractClient.send(command);
    
    // Extraire le texte des blocs LINE
    const lines = response.Blocks
      .filter(block => block.BlockType === 'LINE')
      .map(block => block.Text);
    
    const extractedText = lines.join('\n');
    console.log(`Extracted ${extractedText.length} characters from document (sync mode)`);
    
    return extractedText;

  } catch (error) {
    console.error('Error in synchronous Textract:', error);
    throw new Error(`Failed to extract text (sync): ${error.message}`);
  }
}

export {
  startTextExtraction,
  getTextExtractionResult,
  detectDocumentTextSync
};
