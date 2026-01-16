/**
 * Exemple d'utilisation de la Lambda pour l'extraction de recettes
 */

// Exemple 1: Recette simple
const event1 = {
  body: JSON.stringify({
    recipeText: `
      Recette de pâtes carbonara pour 2 personnes
      
      Ingrédients:
      - 200g de pâtes
      - 100g de lardons
      - 2 œufs
      - 50g de parmesan râpé
      - Sel et poivre
      
      Préparation:
      1. Faire cuire les pâtes dans une grande casserole d'eau salée
      2. Pendant ce temps, faire revenir les lardons dans une poêle
      3. Battre les œufs avec le parmesan
      4. Égoutter les pâtes et les mélanger avec les lardons
      5. Retirer du feu et incorporer le mélange œufs-parmesan
      6. Servir immédiatement avec du poivre
    `
  })
};

// Exemple 2: Recette plus complexe
const event2 = {
  body: JSON.stringify({
    recipeText: `
      Tarte aux pommes maison - 6 personnes
      
      Pour la pâte:
      - 250g de farine
      - 125g de beurre
      - 1 œuf
      - 50ml d'eau
      - 1 pincée de sel
      
      Pour la garniture:
      - 5 pommes
      - 100g de sucre
      - 1 cuillère à soupe de cannelle
      - 30g de beurre
      
      Instructions:
      1. Préparer la pâte en mélangeant farine, beurre coupé en dés et sel
      2. Ajouter l'œuf et l'eau, former une boule
      3. Laisser reposer 30 minutes au frais
      4. Éplucher et couper les pommes en tranches fines
      5. Étaler la pâte dans un moule à tarte
      6. Disposer les pommes en rosace
      7. Saupoudrer de sucre et cannelle
      8. Parsemer de noisettes de beurre
      9. Cuire 35 minutes à 180°C
    `
  })
};

// Exemple 3: Texte minimaliste
const event3 = {
  body: JSON.stringify({
    recipeText: "Salade verte: laitue, tomates, concombre, vinaigrette. Laver et couper les légumes, assaisonner."
  })
};

console.log('Exemple 1 - Pâtes Carbonara:');
console.log(JSON.stringify(event1, null, 2));

console.log('\n\nExemple 2 - Tarte aux Pommes:');
console.log(JSON.stringify(event2, null, 2));

console.log('\n\nExemple 3 - Salade Simple:');
console.log(JSON.stringify(event3, null, 2));
