/**
 * Point d'entrée de la fonction Lambda
 * Gère les requêtes pour l'extraction de recettes via AWS Bedrock
 */
const recipeController = require('./controllers/recipe.controller');
const { successResponse, errorResponse } = require('./utils/response.util');

/**
 * Handler principal pour l'extraction de recettes
 * 
 * @param {Object} event - L'événement Lambda contenant le corps de la requête
 * @param {Object} context - Le contexte d'exécution Lambda
 * @returns {Promise<Object>} - La réponse HTTP formatée
 * 
 * Exemple de corps de requête:
 * {
 *   "recipeText": "Recette de pâtes carbonara pour 2 personnes..."
 * }
 */
exports.extractRecipe = async (event, context) => {
  console.log('Lambda invoked for recipe extraction');
  console.log('Event:', JSON.stringify(event, null, 2));

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
    if (!body || !body.recipeText) {
      return errorResponse('Missing required parameter: recipeText', 400);
    }

    const { recipeText } = body;

    // Validation de la longueur du texte
    if (recipeText.length > 50000) {
      return errorResponse('Recipe text too long (max 50000 characters)', 400);
    }

    // Extraction de la recette
    console.log('Processing recipe extraction...');
    const result = await recipeController.extractRecipeFromText(recipeText);

    console.log('Recipe extracted successfully');
    return successResponse(result, 200);

  } catch (error) {
    console.error('Error in extractRecipe handler:', error);

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
};

/**
 * Handler pour vérifier la santé du service
 * 
 * @param {Object} event - L'événement Lambda
 * @param {Object} context - Le contexte d'exécution Lambda
 * @returns {Promise<Object>} - La réponse HTTP formatée avec le statut du service
 */
exports.healthCheck = async (event, context) => {
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
exports.options = async (event, context) => {
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
