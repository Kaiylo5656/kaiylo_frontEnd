# Guide : Visualiser Figma dans Cursor

## Méthode 1 : Extension Figma (Recommandée)

### Installation
1. Dans Cursor, appuyez sur `Ctrl+Shift+X` pour ouvrir les Extensions
2. Recherchez "Figma" et installez une des extensions suivantes :
   - **Figma** (par Figma)
   - **Figma for VS Code** (par Figma)
   - **Figma Tokens** (pour les design tokens)

### Utilisation
1. Ouvrez votre design dans Figma (dans le navigateur ou l'app desktop)
2. Copiez l'URL du design ou du frame spécifique
3. Dans Cursor, utilisez la commande palette (`Ctrl+Shift+P`) et tapez "Figma"
4. Sélectionnez "Open Figma Design" et collez l'URL

## Méthode 2 : Navigateur intégré de Cursor

1. Appuyez sur `Ctrl+Shift+P` pour ouvrir la palette de commandes
2. Tapez "Simple Browser" ou "Open Preview"
3. Collez l'URL de votre design Figma
4. Le design s'affichera dans un panneau latéral

## Méthode 3 : Vue côte à côte (Split View)

1. Ouvrez votre design Figma dans votre navigateur par défaut
2. Dans Cursor, utilisez `Ctrl+\` pour diviser l'éditeur
3. Ajustez les panneaux pour avoir le code et le navigateur côte à côte

## Méthode 4 : Utiliser MCP Figma Desktop (Avancé)

Si vous avez configuré MCP (Model Context Protocol) avec Figma Desktop, vous pouvez :
1. Utiliser les ressources MCP directement dans Cursor
2. Accéder aux assets Figma via l'API MCP
3. Voir les designs directement dans l'éditeur

Votre projet utilise déjà des assets Figma via MCP :
```jsx
src="https://www.figma.com/api/mcp/asset/9fa52d82-d8b7-44d9-a21b-f89ba65e4a7f"
```

## Méthode 5 : Utiliser les références Figma dans le code

Vous pouvez déjà voir que votre projet référence Figma dans les commentaires :
```jsx
// Design basé sur Figma node-id=2-13235
```

Un fichier de référence centralisé a été créé : `src/config/figma-references.js`

## Astuce : Dev Mode de Figma

Si vous avez accès à Figma Dev Mode :
1. Ouvrez votre design dans Figma
2. Activez le "Dev Mode" (icône en haut à droite)
3. Vous verrez les spécifications CSS/Tailwind directement dans Figma
4. Copiez les valeurs et utilisez-les dans votre code

## Configuration recommandée

Pour une meilleure expérience, configurez Cursor pour :
- Avoir Figma ouvert dans un navigateur séparé
- Utiliser un écran secondaire si disponible
- Garder les références Figma dans les commentaires du code

