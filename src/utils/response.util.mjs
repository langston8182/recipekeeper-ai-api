/**
 * Utilitaires pour formater les réponses HTTP
 */

/**
 * Crée une réponse de succès
 * @param {Object} data - Les données à retourner
 * @param {number} statusCode - Le code de statut HTTP (défaut: 200)
 * @returns {Object} - Réponse formatée pour API Gateway
 */
function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      success: true,
      data
    })
  };
}

/**
 * Crée une réponse d'erreur
 * @param {string} message - Le message d'erreur
 * @param {number} statusCode - Le code de statut HTTP (défaut: 400)
 * @param {Array} details - Détails supplémentaires de l'erreur
 * @returns {Object} - Réponse formatée pour API Gateway
 */
function errorResponse(message, statusCode = 400, details = []) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify({
      success: false,
      error: {
        message,
        details
      }
    })
  };
}

export {
  successResponse,
  errorResponse
};
