import React, { useState, useMemo, useRef, useEffect } from 'react';
import ContainedSideSheet from './ui/ContainedSideSheet';

// Custom Notification Icon Component
const NotificationIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M320 64C302.3 64 288 78.3 288 96L288 99.2C215 114 160 178.6 160 256L160 277.7C160 325.8 143.6 372.5 113.6 410.1L103.8 422.3C98.7 428.6 96 436.4 96 444.5C96 464.1 111.9 480 131.5 480L508.4 480C528 480 543.9 464.1 543.9 444.5C543.9 436.4 541.2 428.6 536.1 422.3L526.3 410.1C496.4 372.5 480 325.8 480 277.7L480 256C480 178.6 425 114 352 99.2L352 96C352 78.3 337.7 64 320 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"/>
  </svg>
);

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

const NotificationSidebar = ({ isOpen, onClose, onNotificationClick, onMarkAllAsRead, onToggleRead, notifications = [] }) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});

  // Filter notifications based on toggle state
  const filteredNotifications = useMemo(() => {
    if (showUnreadOnly) {
      return notifications.filter(notif => notif.read === false);
    }
    return notifications;
  }, [notifications, showUnreadOnly]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return notifications.filter(notif => notif.read === false).length;
  }, [notifications]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && menuRefs.current[openMenuId]) {
        if (!menuRefs.current[openMenuId].contains(event.target)) {
          setOpenMenuId(null);
        }
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const handleMenuToggle = (notifId, e) => {
    e.stopPropagation(); // Prevent triggering notification click
    setOpenMenuId(openMenuId === notifId ? null : notifId);
  };

  const handleToggleRead = (notif, e) => {
    e.stopPropagation(); // Prevent triggering notification click
    if (onToggleRead) {
      onToggleRead(notif);
    }
    setOpenMenuId(null); // Close menu after action
  };

  return (
    <ContainedSideSheet
      open={isOpen}
      onClose={onClose}
      title="Notifications"
      widthClass="max-w-lg"
      contained={false}
      zIndex={9999}
      modalId="notification-sidebar"
      badgeCount={unreadCount}
    >
      <div className="h-full flex flex-col text-white">
        {/* Filter Toggle */}
        <div className="px-6 pt-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <label 
              htmlFor="unread-filter"
              className="text-[14px] text-white/50 font-extralight cursor-pointer select-none"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Afficher uniquement les non lus
            </label>
            {/* Toggle Switch */}
            <div className="relative inline-block w-9 h-[18px] shrink-0">
              <input
                type="checkbox"
                id="unread-filter"
                checked={showUnreadOnly}
                onChange={(e) => setShowUnreadOnly(e.target.checked)}
                className="sr-only"
              />
              <label
                htmlFor="unread-filter"
                className="block h-[18px] rounded-full cursor-pointer transition-colors duration-200"
                style={{
                  backgroundColor: showUnreadOnly ? 'var(--kaiylo-primary-hex)' : '#404040'
                }}
              >
                <span
                  className={`absolute top-[3px] left-[3px] w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                    showUnreadOnly ? 'translate-x-[18px]' : 'translate-x-0'
                  }`}
                />
              </label>
            </div>
            {/* Mark All as Read Button */}
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                onClick={onMarkAllAsRead}
                className="text-[11px] font-normal py-1 px-2 rounded-md transition-colors duration-200 bg-white/5 border whitespace-nowrap ml-auto"
                style={{ 
                  fontFamily: "'Inter', sans-serif",
                  color: 'var(--kaiylo-primary-hex)',
                  borderColor: 'var(--kaiylo-primary-hex)',
                  borderWidth: '1px'
                }}
              >
                Tout marquer lu
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto notification-sidebar-scrollbar">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2">
                <NotificationIcon style={{ width: '32px', height: '32px', color: 'rgba(255, 255, 255, 0.5)' }} />
              </div>
              <h3 className="text-lg font-light mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {showUnreadOnly ? 'Aucune notification non lue' : 'Aucune notification'}
              </h3>
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
                : (notif.studentName || 'Client');
              const initial = displayName ? displayName.charAt(0).toUpperCase() : (isFeedbackNotification ? 'C' : 'E');
              const isUnread = notif.read === false;

              const notifId = notif.id || notif.timestamp || Math.random();
              const isMenuOpen = openMenuId === notifId;

              return (
                <div
                  key={notifId}
                  onClick={() => onNotificationClick && onNotificationClick(notif)}
                  className={`relative w-full py-3 px-6 flex items-start gap-3 transition-colors cursor-pointer group backdrop-blur-sm border-b border-white/5 ${
                    isUnread 
                      ? 'bg-[#2a1f1a]/60 hover:bg-[#2a1f1a]/70' 
                      : ''
                  }`}
                  style={isUnread ? {
                    borderLeft: '3px solid var(--kaiylo-primary-hex)'
                  } : {}}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0 pt-0.5">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm`}
                      style={isUnread ? { 
                        color: 'rgba(255, 255, 255, 1)',
                        backgroundColor: 'rgba(212, 132, 90, 1)',
                        borderWidth: '0px',
                        borderStyle: 'none',
                        borderColor: 'rgba(0, 0, 0, 0)',
                        borderImage: 'none'
                      } : {
                        color: 'rgba(255, 255, 255, 1)',
                        backgroundColor: 'var(--kaiylo-primary-hex)',
                        borderWidth: '0px',
                        borderStyle: 'none',
                        borderColor: 'rgba(0, 0, 0, 0)',
                        borderImage: 'none'
                      }}
                    >
                      {initial}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="text-[13px] text-white/90 leading-tight">
                      <span className="font-normal text-white block mb-0.5">{displayName}</span>
                      {isFeedbackNotification ? (
                        <>
                          <span className="text-gray-400">A ajouté un feedback sur votre vidéo : </span>
                          <span className="text-white font-normal">
                            {notif.sessionName ? `${notif.sessionName} - ${exerciseDisplay}` : exerciseDisplay}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-400">A ajouté une vidéo : </span>
                          <span className="font-normal" style={{ color: 'rgba(212, 132, 90, 1)' }}>{fullDisplay}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Date */}
                    <div className="text-[11px] text-gray-500 font-medium">
                      {formatDate(notif.timestamp || notif.createdAt || Date.now())}
                    </div>
                  </div>

                  {/* Menu button (3 dots) */}
                  <div className="relative flex-shrink-0 pt-0.5" ref={el => menuRefs.current[notifId] = el}>
                    <button
                      onClick={(e) => handleMenuToggle(notifId, e)}
                      className="p-1 rounded-md hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Options de notification"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5 text-white/50"
                      >
                        <circle cx="5" cy="12" r="1" />
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-8 z-50 min-w-[160px] bg-[#1a1a1a] border border-white/10 rounded-md shadow-lg overflow-hidden">
                        <button
                          onClick={(e) => handleToggleRead(notif, e)}
                          className="w-full px-3.5 py-1.5 text-left text-xs hover:bg-[rgba(14,14,16,1)] transition-colors whitespace-nowrap"
                          style={{ 
                            fontFamily: "'Inter', sans-serif",
                            color: 'var(--kaiylo-primary-hex)'
                          }}
                        >
                          {isUnread ? 'Marquer comme lu' : 'Marquer comme non lu'}
                        </button>
                      </div>
                    )}
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
