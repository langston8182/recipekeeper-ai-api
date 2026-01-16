/**
 * Controller pour gérer l'extraction de recettes
 */
import {getConfigValue} from "../utils/config.appconfig.mjs";
import * as bedrockService from '../services/bedrock.service.mjs';
import * as lambdaService from '../services/lambda.service.mjs';
import { validateRecipe } from '../models/recipe.model.mjs';

/**
 * Extrait une recette à partir d'un texte brut
 * @param {string} recipeText - Le texte de la recette
 * @returns {Promise<Object>} - La recette extraite et validée
 */
async function extractRecipeFromText(recipeText) {
  const modelId = await getConfigValue('bedrock', 'MODEL_ID');
  // Validation de l'entrée
  if (!recipeText || typeof recipeText !== 'string' || recipeText.trim().length === 0) {
    throw new Error('Recipe text is required and cannot be empty');
  }

  try {
    console.log('Starting recipe extraction...');
    
    // Appel au service Bedrock pour extraire la recette
    const extractedRecipe = await bedrockService.extractRecipe(recipeText);
    
    console.log('Recipe extracted, validating...');
    
    // Validation de la recette extraite
    const validation = validateRecipe(extractedRecipe);
    
    if (!validation.valid) {
      console.error('Recipe validation failed:', validation.errors);
      throw new Error(`Invalid recipe format: ${validation.errors.join(', ')}`);
    }

    console.log('Recipe validated successfully');
    
    // Envoi de la recette à l'API RecipeKeeper
    console.log('Sending recipe to RecipeKeeper API...');
    let apiResponse;
    try {
      apiResponse = await lambdaService.sendRecipeToAPI(extractedRecipe);
      console.log('Recipe successfully sent to API');
    } catch (apiError) {
      console.error('Failed to send recipe to API:', apiError);
      // On continue même si l'envoi à l'API échoue
      apiResponse = {
        error: apiError.message,
        sent: false
      };
    }
    
    return {
      recipe: extractedRecipe,
      apiResponse,
      metadata: {
        extractedAt: new Date().toISOString(),
        modelUsed: modelId
      }
    };

  } catch (error) {
    console.error('Error in extractRecipeFromText:', error);
    
    // Enrichissement du message d'erreur
    if (error.message.includes('Bedrock')) {
      throw new Error(`Bedrock service error: ${error.message}`);
    }
    
    if (error.message.includes('parse')) {
      throw new Error('Failed to parse recipe from AI response. The text might not be a valid recipe.');
    }

    throw error;
  }
}

/**
 * Vérifie la santé du service
 * @returns {Promise<Object>} - Statut du service
 */
async function healthCheck() {
  try {
    const bedrockAvailable = await bedrockService.checkBedrockAvailability();
    const apiAvailable = await lambdaService.checkAPIAvailability();
    
    const allHealthy = bedrockAvailable && apiAvailable;
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services: {
        bedrock: bedrockAvailable ? 'available' : 'unavailable',
        recipeKeeperAPI: apiAvailable ? 'available' : 'unavailable'
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  extractRecipeFromText,
  healthCheck
};
