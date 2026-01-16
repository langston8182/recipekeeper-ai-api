/**
 * Modèle de données pour une recette
 */

/**
 * Schéma JSON pour une recette extraite
 */
const recipeSchema = {
  title: {
    type: 'string',
    required: true
  },
  servings: {
    type: 'number',
    required: true,
    default: 4
  },
  ingredients: {
    type: 'array',
    required: true,
    items: {
      name: { type: 'string', required: true },
      quantity: { type: 'number', required: true, default: 1 },
      unit: { type: 'string', required: true }
    }
  },
  steps: {
    type: 'array',
    required: true,
    items: {
      order: { type: 'number', required: true },
      text: { type: 'string', required: true }
    }
  },
  tags: {
    type: 'array',
    required: true,
    items: { type: 'string' }
  }
};

/**
 * Valide une recette selon le schéma défini
 * @param {Object} recipe - La recette à valider
 * @returns {Object} - { valid: boolean, errors: Array }
 */
function validateRecipe(recipe) {
  const errors = [];

  if (!recipe) {
    return { valid: false, errors: ['Recipe object is required'] };
  }

  // Validation du titre
  if (!recipe.title || typeof recipe.title !== 'string') {
    errors.push('Title is required and must be a string');
  }

  // Validation des servings
  if (!recipe.servings || typeof recipe.servings !== 'number') {
    errors.push('Servings is required and must be a number');
  }

  // Validation des ingrédients
  if (!Array.isArray(recipe.ingredients)) {
    errors.push('Ingredients must be an array');
  } else {
    recipe.ingredients.forEach((ingredient, index) => {
      if (!ingredient.name || typeof ingredient.name !== 'string') {
        errors.push(`Ingredient ${index}: name is required and must be a string`);
      }
      if (typeof ingredient.quantity !== 'number') {
        errors.push(`Ingredient ${index}: quantity must be a number`);
      }
      if (!ingredient.unit || typeof ingredient.unit !== 'string') {
        errors.push(`Ingredient ${index}: unit is required and must be a string`);
      }
    });
  }

  // Validation des étapes
  if (!Array.isArray(recipe.steps)) {
    errors.push('Steps must be an array');
  } else {
    recipe.steps.forEach((step, index) => {
      if (typeof step.order !== 'number') {
        errors.push(`Step ${index}: order must be a number`);
      }
      if (!step.text || typeof step.text !== 'string') {
        errors.push(`Step ${index}: text is required and must be a string`);
      }
    });
  }

  // Validation des tags
  if (!Array.isArray(recipe.tags)) {
    errors.push('Tags must be an array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  recipeSchema,
  validateRecipe
};
