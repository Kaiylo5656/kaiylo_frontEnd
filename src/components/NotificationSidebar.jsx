import React from 'react';
import ContainedSideSheet from './ui/ContainedSideSheet';
import { Bell } from 'lucide-react';

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const NotificationSidebar = ({ isOpen, onClose, notifications = [] }) => {
  return (
    <ContainedSideSheet
      open={isOpen}
      onClose={onClose}
      title="Notifications"
      widthClass="max-w-md"
      contained={false}
      zIndex={9999}
      modalId="notification-sidebar"
    >
      <div className="h-full flex flex-col bg-[#121212] text-white">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 mt-10">
              <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4 border border-[#333]">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Aucune notification</h3>
              <p className="text-sm text-gray-400 max-w-[240px]">
                Vous serez notifié ici des nouvelles vidéos uploadées par vos élèves.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id || notif.timestamp || Math.random()}
                className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-3 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-[#d4845a]">Nouvelle vidéo</span>
                  <span className="text-[10px] text-gray-500">
                    {formatDate(notif.timestamp || notif.createdAt || Date.now())}
                  </span>
                </div>
                <div className="text-sm text-white/90">
                  {notif.studentName || 'Élève'} a uploadé une vidéo
                  {notif.exerciseName ? ` pour ${notif.exerciseName}` : ''}
                  {notif.setInfo?.setNumber ? ` (série ${notif.setInfo.setNumber})` : ''}
                </div>
                {notif.sessionName && (
                  <div className="text-xs text-gray-400">
                    Session : {notif.sessionName}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </ContainedSideSheet>
  );
};

export default NotificationSidebar;
