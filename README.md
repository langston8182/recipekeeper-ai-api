# RecipeKeeper AI API

Lambda AWS pour extraire des recettes structurées à partir de texte brut en utilisant AWS Bedrock.

## 📁 Structure du projet

```
recipekeeper-ai-api/
├── handler.mjs              # Point d'entrée de la Lambda
├── controllers/
│   └── recipe.controller.mjs # Orchestration de la logique métier
├── services/
│   ├── bedrock.service.mjs   # Service d'appel à AWS Bedrock
│   └── lambda.service.mjs    # Service d'invocation de la Lambda RecipeKeeper API
├── models/
│   └── recipe.model.mjs      # Schéma et validation des recettes
├── utils/
│   └── response.util.mjs     # Utilitaires de formatage des réponses
└── package.json
```

## 🚀 Installation

```bash
npm install
```

## 📝 Utilisation

### Handler principal: `extractRecipe`

Extrait une recette structurée à partir d'un texte brut.

**Requête:**
```json
{
  "recipeText": "Recette de pâtes carbonara pour 2 personnes. Ingrédients: 200g de pâtes, 100g de lardons, 2 œufs, parmesan. Étapes: 1. Cuire les pâtes. 2. Faire revenir les lardons. 3. Mélanger avec les œufs et le parmesan."
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "title": "Pâtes Carbonara",
      "servings": 2,
      "ingredients": [
        { "name": "pâtes", "quantity": 200, "unit": "g" },
        { "name": "lardons", "quantity": 100, "unit": "g" },
        { "name": "œufs", "quantity": 2, "unit": "unité" },
        { "name": "parmesan", "quantity": 1, "unit": "portion" }
      ],
      "steps": [
        { "order": 1, "text": "Cuire les pâtes" },
        { "order": 2, "text": "Faire revenir les lardons" },
        { "order": 3, "text": "Mélanger avec les œufs et le parmesan" }
      ],
      "tags": ["pâtes", "italien", "rapide"]
    },
    "apiResponse": {
      "statusCode": 200,
      "body": {
        "id": "recipe-123",
        "message": "Recipe created successfully"
      }
    },
    "metadata": {
      "extractedAt": "2026-01-16T10:30:00.000Z",
      "modelUsed": "anthropic.claude-3-sonnet-20240229-v1:0"
    }
  }
}
```

### Handler de santé: `healthCheck`

Vérifie la disponibilité du service.

**Réponse:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "bedrock": "available",
      "recipeKeeperAPI": "available"
    },
    "timestamp": "2026-01-16T10:30:00.000Z"
  }
}
```

## 🔧 Configuration

### Variables d'environnement

- `AWS_REGION`: Région AWS pour Bedrock (défaut: `us-east-1`)
- `BEDROCK_MODEL_ID`: ID du modèle Bedrock à utiliser (défaut: `anthropic.claude-3-sonnet-20240229-v1:0`)
- `ENV`: Environnement pour l'API RecipeKeeper (`preprod` ou `prod`, défaut: `preprod`)

### Permissions IAM requises

La Lambda nécessite les permissions suivantes:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction"
      ],
      "Resource": [
        "arn:aws:lambda:*:*:function:recipekeeper-api-preprod",
        "arn:aws:lambda:*:*:function:recipekeeper-api-prod"
      ]
    }
  ]
}
```

## 📋 Format de la recette

Le JSON retourné suit ce schéma:

```typescript
{
  title: string,           // Titre de la recette
  servings: number,        // Nombre de portions (défaut: 4)
  ingredients: [
    {
      name: string,        // Nom de l'ingrédient
      quantity: number,    // Quantité (défaut: 1)
      unit: string         // Unité en minuscule
    }
  ],
  steps: [
    {
      order: number,       // Ordre de l'étape (commence à 1)
      text: string         // Description de l'étape
    }
  ],
  tags: string[]          // Tags/catégories
}
```

## 🎯 Prompt System

Le prompt system utilisé pour l'extraction:

```
Tu es un extracteur de recettes. Retourne UNIQUEMENT un JSON valide, sans texte autour. 
Schéma: { "title": string, "servings": number, "ingredients": [{"name": string, 
"quantity": number, "unit": string}], "steps": [{"order": number, "text": string}], 
"tags": [string] } 

Contraintes:
- servings: si absent -> 4
- ingredients: quantity numérique (si inconnu -> 1), unit en minuscule
- steps: order commence à 1
```

## 🛠️ Déploiement

### Avec AWS SAM

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  RecipeExtractorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handler.handler
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 512
      Environment:
        Variables:
          AWS_REGION: us-east-1
          BEDROCK_MODEL_ID: anthropic.claude-3-sonnet-20240229-v1:0
          ENV: preprod
      Policies:
        - Statement:
          - Effect: Allow
            Action:
              - bedrock:InvokeModel
            Resource: 
              - arn:aws:bedrock:*::foundation-model/anthropic.claude-3-*
          - Effect: Allow
            Action:
              - lambda:InvokeFunction
            Resource:
              - arn:aws:lambda:*:*:function:recipekeeper-api-preprod
              - arn:aws:lambda:*:*:function:recipekeeper-api-prod
```

### Avec Terraform

```hcl
resource "aws_lambda_function" "recipe_extractor" {
  filename      = "lambda.zip"
  function_name = "recipe-extractor"
  role          = aws_iam_role.lambda_role.arn
  handler       = "handler.handler"
  runtime       = "nodejs18.x"
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      AWS_REGION = "us-east-1"
      BEDROCK_MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0"
      ENV = "preprod"
    }
  }
}
```

## 📊 Logs

Les logs sont automatiquement envoyés à CloudWatch Logs avec les informations suivantes:
- Invocations de la Lambda
- Appels à Bedrock
- Erreurs de validation
- Résultats d'extraction

## 🔍 Gestion des erreurs

Le service gère plusieurs types d'erreurs:

- **400**: Paramètres manquants ou invalides
- **422**: Impossible d'extraire une recette valide du texte
- **500**: Erreur interne du serveur
- **503**: Service Bedrock temporairement indisponible

## 📄 Licence

ISC
