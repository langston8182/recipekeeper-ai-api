/**
 * Service pour interagir avec AWS Bedrock
 */
import {getConfigValue} from "../utils/config.appconfig.mjs";
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Configuration du client Bedrock
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Prompt system pour l'extraction de recettes
const SYSTEM_PROMPT = `Tu es un extracteur de recettes. Retourne UNIQUEMENT un JSON valide, sans texte autour. Schéma: { "title": string, "servings": number, "ingredients": [{"name": string, "quantity": number, "unit": string}], "steps": [{"order": number, "text": string}], "tags": [string] } Contraintes:

servings: si absent -> 4
ingredients: quantity numérique (si inconnu -> 1), unit en minuscule
steps: order commence à 1`;

/**
 * Extrait une recette structurée à partir d'un texte brut en utilisant AWS Bedrock
 * @param {string} recipeText - Le texte brut de la recette
 * @returns {Promise<Object>} - La recette structurée au format JSON
 */
async function extractRecipe(recipeText) {
  let modelId = await getConfigValue('bedrock', 'MODEL_ID');
  
  // Conversion du model ID en inference profile pour Nova
  if (modelId.includes('amazon.nova')) {
    // Extraire le nom du modèle (ex: "amazon.nova-2-lite-v1:0" -> "nova-lite-v1:0")
    const modelName = modelId.replace('amazon.', '').replace('nova-2-', 'nova-');
    // Utiliser le préfixe régional basé sur la région AWS
    const region = process.env.AWS_REGION || 'us-east-1';
    const regionPrefix = region.startsWith('us-') ? 'us' : 
                        region.startsWith('eu-') ? 'eu' : 
                        region.startsWith('ap-') ? 'ap' : 'us';
    modelId = `${regionPrefix}.amazon.${modelName}`;
    console.log(`Using inference profile: ${modelId}`);
  }
  
  if (!recipeText || typeof recipeText !== 'string') {
    throw new Error('Recipe text is required and must be a string');
  }

  try {
    // Préparation de la requête (format universel compatible Claude et Nova)
    const payload = {
      schemaVersion: 'messages-v1',
      system: [
        {
          text: SYSTEM_PROMPT
        }
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              text: recipeText
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 4096,
        temperature: 0.2
      }
    };

    // Création de la commande pour invoquer le modèle
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload)
    });

    // Appel à Bedrock
    console.log('Calling AWS Bedrock with model:', modelId);
    const response = await bedrockClient.send(command);

    // Décodage de la réponse
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Bedrock response received');

    // Extraction du contenu de la réponse (format universel)
    let textContent;
    
    // Format Nova/Messages API
    if (responseBody.output && responseBody.output.message) {
      const message = responseBody.output.message;
      if (message.content && Array.isArray(message.content) && message.content.length > 0) {
        textContent = message.content.find(item => item.text);
      }
    }
    // Format Claude/Anthropic
    else if (responseBody.content && Array.isArray(responseBody.content)) {
      textContent = responseBody.content.find(item => item.type === 'text');
    }

    if (!textContent || !textContent.text) {
      console.error('Unexpected response format:', JSON.stringify(responseBody, null, 2));
      throw new Error('No text content found in Bedrock response');
    }

    // Parsing du JSON de la recette
    const recipe = JSON.parse(textContent.text);

    // Application des valeurs par défaut
    if (!recipe.servings) {
      recipe.servings = 4;
    }

    // Normalisation des ingrédients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients = recipe.ingredients.map(ingredient => ({
        name: ingredient.name,
        quantity: ingredient.quantity || 1,
        unit: (ingredient.unit || '').toLowerCase()
      }));
    }

    // Vérification des étapes
    if (recipe.steps && Array.isArray(recipe.steps)) {
      recipe.steps = recipe.steps.map((step, index) => ({
        order: step.order || index + 1,
        text: step.text
      }));
    }

    // Initialisation des tags si absent
    if (!recipe.tags) {
      recipe.tags = [];
    }

    return recipe;

  } catch (error) {
    console.error('Error calling Bedrock:', error);
    
    // Gestion des erreurs spécifiques
    if (error.name === 'SyntaxError') {
      throw new Error('Failed to parse recipe JSON from Bedrock response');
    }
    
    if (error.$metadata) {
      throw new Error(`AWS Bedrock error: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Vérifie si le service Bedrock est accessible
 * @returns {Promise<boolean>}
 */
async function checkBedrockAvailability() {
  try {
    // Test simple avec un texte minimal
    await extractRecipe('Test recipe: pasta with tomato sauce');
    return true;
  } catch (error) {
    console.error('Bedrock availability check failed:', error);
    return false;
  }
}

export {
  extractRecipe,
  checkBedrockAvailability,
  SYSTEM_PROMPT
};
