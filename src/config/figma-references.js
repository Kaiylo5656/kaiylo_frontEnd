/**
 * Références centralisées aux designs Figma
 * Utilisez ce fichier pour maintenir les liens vers vos designs Figma
 * et faciliter la navigation entre le code et les designs
 */

export const FIGMA_DESIGNS = {
  // Modals
  ExerciseInfoModal: {
    nodeId: '2-13235',
    description: 'Modal pour afficher les informations d\'un exercice (instructions et vidéo)',
    // URL complète à ajouter : https://www.figma.com/file/[FILE_ID]/...?node-id=2-13235
  },
  ExerciseCommentModal: {
    nodeId: '428-1220',
    description: 'Modal pour ajouter un commentaire à un exercice',
  },
  MissingVideosWarningModal: {
    nodeId: '348-730',
    description: 'Modal d\'avertissement pour les vidéos manquantes',
  },
  MissingVideosValidationErrorModal: {
    nodeId: '348-730',
    description: 'Modal d\'erreur de validation pour les vidéos manquantes',
  },
  StudentVideoDetailModal: {
    description: 'Modal de détails vidéo étudiant avec overlay centré',
  },

  // Pages principales
  LoginPage: {
    description: 'Page de connexion - Dimensions: 1857x1015',
    position: { x: -59, y: 102 },
  },
  StudentDashboard: {
    description: 'Dashboard étudiant avec planning de la semaine',
  },

  // Composants complexes
  WorkoutSessionExecution: {
    description: 'Exécution de session d\'entraînement avec gradients et effets',
    notes: 'Inclut des gradients correspondant au design Figma',
  },
  StudentDetailView: {
    description: 'Vue détaillée de l\'étudiant avec séparateurs',
    assets: {
      separator: 'https://www.figma.com/api/mcp/asset/9fa52d82-d8b7-44d9-a21b-f89ba65e4a7f',
    },
  },
};

/**
 * Helper pour obtenir l'URL complète d'un design Figma
 * @param {string} fileId - L'ID du fichier Figma
 * @param {string} nodeId - L'ID du node (ex: '2-13235')
 * @returns {string} URL complète vers le design
 */
export function getFigmaUrl(fileId, nodeId) {
  return `https://www.figma.com/file/${fileId}?node-id=${nodeId}`;
}

/**
 * Helper pour ouvrir un design Figma dans le navigateur
 * @param {string} fileId - L'ID du fichier Figma
 * @param {string} nodeId - L'ID du node
 */
export function openFigmaDesign(fileId, nodeId) {
  const url = getFigmaUrl(fileId, nodeId);
  window.open(url, '_blank');
}

