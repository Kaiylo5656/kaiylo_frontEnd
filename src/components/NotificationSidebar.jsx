import React, { useState, useMemo } from 'react';
import ContainedSideSheet from './ui/ContainedSideSheet';
import { Bell } from 'lucide-react';

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Format: "3 avr. 12:03"
    const day = date.getDate();
    const month = date.toLocaleString('fr-FR', { month: 'short' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month} ${hours}:${minutes}`;
  } catch {
    return '';
  }
};

const NotificationSidebar = ({ isOpen, onClose, onNotificationClick, notifications = [] }) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Filter notifications based on toggle state
  const filteredNotifications = useMemo(() => {
    if (showUnreadOnly) {
      return notifications.filter(notif => notif.read === false);
    }
    return notifications;
  }, [notifications, showUnreadOnly]);

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
        {/* Filter Toggle */}
        <div className="px-4 pt-4 pb-3 border-b border-[#262626]">
          <div className="flex items-center justify-between gap-[15px]">
            <label 
              htmlFor="unread-filter"
              className="text-[15px] text-white/75 font-extralight cursor-pointer select-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Afficher uniquement les non lus
            </label>
            {/* Toggle Switch */}
            <div className="relative inline-block w-10 h-[18px] shrink-0">
              <input
                type="checkbox"
                id="unread-filter"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="sr-only"
              />
              <label
                htmlFor="unread-filter"
                className={`block h-[18px] rounded-full cursor-pointer transition-colors duration-200 ${
                  showUnreadOnly ? 'bg-orange-500' : 'bg-[#404040]'
                }`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                    showUnreadOnly ? 'translate-x-[22px]' : 'translate-x-0'
                  }`}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 mt-10">
              <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4 border border-[#333]">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {showUnreadOnly ? 'Aucune notification non lue' : 'Aucune notification'}
              </h3>
              <p className="text-sm text-gray-400 max-w-[240px]">
                {showUnreadOnly 
                  ? 'Vous n\'avez aucune notification non lue.'
                  : 'Vous serez notifié ici des nouvelles activités.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              // Build exercise name with set number (e.g., "traction 3/3")
              const exerciseName = notif.exerciseName || 'Exercice';
              const setNumber = notif.setInfo?.setNumber;
              const exerciseDisplay = setNumber ? `${exerciseName} ${setNumber}/${setNumber}` : exerciseName;
              
              // Build full display text with session name for video_upload notifications
              const sessionName = notif.sessionName;
              const fullDisplay = (notif.type === 'video_upload' && sessionName) 
                ? `${sessionName} - ${exerciseDisplay}`
                : exerciseDisplay;
              
              // Get initial for avatar and display name based on notification type
              const isFeedbackNotification = notif.type === 'video_feedback';
              const displayName = isFeedbackNotification 
                ? (notif.coachName || 'Coach')
                : (notif.studentName || 'Élève');
              const initial = displayName ? displayName.charAt(0).toUpperCase() : (isFeedbackNotification ? 'C' : 'E');
              const isUnread = notif.read === false;

              return (
                <div
                  key={notif.id || notif.timestamp || Math.random()}
                  onClick={() => onNotificationClick && onNotificationClick(notif)}
                  className={`relative bg-[#1a1a1a] border ${isUnread ? 'border-orange-500/30' : 'border-[#262626]'} rounded-xl p-3 flex gap-3 hover:bg-[#1f1f1f] transition-colors cursor-pointer group`}
                >
                  {/* Unread Indicator */}
                  {isUnread && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                  )}

                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center border border-[#333] text-orange-500 font-medium text-sm">
                    {initial}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="text-[13px] text-white/90 leading-tight">
                      <span className="font-semibold text-white block mb-0.5">{displayName}</span>
                      {isFeedbackNotification ? (
                        <>
                          <span className="text-gray-400">A ajouté un feedback sur votre vidéo : </span>
                          <span className="text-white font-medium">
                            {notif.sessionName ? `${notif.sessionName} - ${exerciseDisplay}` : exerciseDisplay}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400">A ajouté une vidéo : </span>
                          <span className="text-white font-medium">{fullDisplay}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Date */}
                    <div className="text-[11px] text-gray-500 font-medium">
                      {formatDate(notif.timestamp || notif.createdAt || Date.now())}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ContainedSideSheet>
  );
};

export default NotificationSidebar;
