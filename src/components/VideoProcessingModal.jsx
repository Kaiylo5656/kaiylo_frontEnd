import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Loader2 } from 'lucide-react';

const VideoProcessingModal = ({ isOpen, progress, isCompressing, isComplete }) => {
  let title = 'Téléversement des vidéos';
  let description = `Envoi en cours: ${progress?.current || 0}/${progress?.total || 0}...`;

  if (isCompressing) {
    title = 'Traitement des vidéos';
    description = 'Optimisation de vos vidéos en cours, veuillez patienter...';
  }

  if (isComplete) {
    title = 'Téléversement terminé';
    description = 'Vos vidéos ont été envoyées et seront disponibles sous peu.';
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="dialog-content bg-[#121212] border-[#262626] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e87c3e] text-lg font-medium text-center">{title}</DialogTitle>
          <DialogDescription className="text-gray-400 text-center text-sm mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-12 w-12 text-[#e87c3e] animate-spin" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoProcessingModal;

