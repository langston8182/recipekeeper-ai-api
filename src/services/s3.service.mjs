/**
 * Service pour interagir avec S3
 */
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Configuration du client S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

/**
 * Vérifie si un fichier est un PDF ou une image supportée
 * @param {string} key - La clé du fichier dans S3
 * @returns {boolean}
 */
function isSupportedFile(key) {
  const lowerKey = key.toLowerCase();
  return lowerKey.endsWith('.pdf') || 
         lowerKey.endsWith('.jpg') || 
         lowerKey.endsWith('.jpeg') || 
         lowerKey.endsWith('.png');
}

/**
 * Vérifie si un fichier est un PDF
 * @param {string} key - La clé du fichier dans S3
 * @returns {boolean}
 */
function isPdfFile(key) {
  return key.toLowerCase().endsWith('.pdf');
}

/**
 * Récupère les métadonnées d'un objet S3
 * @param {string} bucket - Le nom du bucket
 * @param {string} key - La clé du fichier
 * @returns {Promise<Object>}
 */
async function getObjectMetadata(bucket, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await s3Client.send(command);
    
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata
    };
  } catch (error) {
    console.error('Error getting S3 object metadata:', error);
    throw new Error(`Failed to get S3 metadata: ${error.message}`);
  }
}

export {
  isSupportedFile,
  isPdfFile,
  getObjectMetadata
};
