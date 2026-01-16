# Tests Events

Ce dossier contient des événements de test pour la Lambda RecipeKeeper AI API.

## Utilisation

### Dans la console AWS Lambda

1. Ouvrez votre fonction Lambda dans la console AWS
2. Cliquez sur l'onglet "Test"
3. Créez un nouvel événement de test
4. Copiez le contenu d'un des fichiers JSON ci-dessous
5. Donnez un nom à votre événement de test
6. Cliquez sur "Test" pour exécuter

### Avec AWS CLI

```bash
aws lambda invoke \
  --function-name recipekeeper-ai-api \
  --payload file://tests/events/extract-recipe-simple.json \
  response.json
```

### Avec SAM CLI

```bash
sam local invoke RecipeExtractorFunction \
  --event tests/events/extract-recipe-simple.json
```

## Fichiers disponibles

### Tests de succès

#### [extract-recipe-simple.json](extract-recipe-simple.json)
Recette simple de pâtes carbonara - Cas d'usage standard

#### [extract-recipe-complex.json](extract-recipe-complex.json)
Recette complexe de tarte aux pommes avec plusieurs étapes et ingrédients multiples

#### [extract-recipe-minimal.json](extract-recipe-minimal.json)
Recette minimaliste de salade verte - Test avec peu d'informations

#### [extract-recipe-with-tags.json](extract-recipe-with-tags.json)
Recette de crêpes avec tags explicites dans le texte

#### [health-check.json](health-check.json)
Vérification de la santé du service et de ses dépendances

#### [cors-preflight.json](cors-preflight.json)
Requête OPTIONS pour le preflight CORS

### Tests d'erreurs

#### [invalid-missing-text.json](invalid-missing-text.json)
Test avec body vide - Devrait retourner une erreur 400

#### [invalid-json.json](invalid-json.json)
Test avec JSON invalide - Devrait retourner une erreur 400

## Format des événements

Les événements suivent le format AWS API Gateway Lambda Proxy Integration :

```json
{
  "httpMethod": "POST",
  "path": "/extract-recipe",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"recipeText\":\"...\"}"
}
```

## Codes de réponse attendus

- **200** : Extraction réussie
- **400** : Paramètres invalides ou manquants
- **422** : Impossible d'extraire une recette valide
- **500** : Erreur interne du serveur
- **503** : Service Bedrock temporairement indisponible

## Variables d'environnement requises

Pour que les tests fonctionnent correctement, assurez-vous que les variables suivantes sont configurées :

```bash
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
ENV=preprod
```

## Résultats attendus

Chaque test devrait retourner une réponse structurée contenant :
- `success`: boolean
- `data`: objet contenant la recette extraite et la réponse de l'API
- `apiResponse`: résultat de l'envoi à recipekeeper-api-<env>
- `metadata`: informations sur l'extraction
