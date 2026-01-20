import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bell, Zap, Search, User, CreditCard, Menu } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import MobileNavigationDrawer from './MobileNavigationDrawer';
import NotificationSidebar from './NotificationSidebar';
import { useLocation } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import axios from 'axios';
import { getApiBaseUrlWithApi } from '../config/api';
import VideoDetailModal from './VideoDetailModal';
import StudentVideoDetailModal from './StudentVideoDetailModal';
import { useModalManager } from './ui/modal/ModalManager';

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

// Custom Settings Icon Component
const SettingsIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M259.1 73.5C262.1 58.7 275.2 48 290.4 48L350.2 48C365.4 48 378.5 58.7 381.5 73.5L396 143.5C410.1 149.5 423.3 157.2 435.3 166.3L503.1 143.8C517.5 139 533.3 145 540.9 158.2L570.8 210C578.4 223.2 575.7 239.8 564.3 249.9L511 297.3C511.9 304.7 512.3 312.3 512.3 320C512.3 327.7 511.8 335.3 511 342.7L564.4 390.2C575.8 400.3 578.4 417 570.9 430.1L541 481.9C533.4 495 517.6 501.1 503.2 496.3L435.4 473.8C423.3 482.9 410.1 490.5 396.1 496.6L381.7 566.5C378.6 581.4 365.5 592 350.4 592L290.6 592C275.4 592 262.3 581.3 259.3 566.5L244.9 496.6C230.8 490.6 217.7 482.9 205.6 473.8L137.5 496.3C123.1 501.1 107.3 495.1 99.7 481.9L69.8 430.1C62.2 416.9 64.9 400.3 76.3 390.2L129.7 342.7C128.8 335.3 128.4 327.7 128.4 320C128.4 312.3 128.9 304.7 129.7 297.3L76.3 249.8C64.9 239.7 62.3 223 69.8 209.9L99.7 158.1C107.3 144.9 123.1 138.9 137.5 143.7L205.3 166.2C217.4 157.1 230.6 149.5 244.6 143.4L259.1 73.5zM320.3 400C364.5 399.8 400.2 363.9 400 319.7C399.8 275.5 363.9 239.8 319.7 240C275.5 240.2 239.8 276.1 240 320.3C240.2 364.5 276.1 400.2 320.3 400z"/>
  </svg>
);

const Header = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const location = useLocation();
  const { onVideoUpload, onFeedback } = useSocket();
  
  // Check if any modal is open by looking for backdrop elements in the DOM
  // This works for all modals, not just those registered in ModalManager
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const checkForModal = () => {
      // Check for elements with fixed inset-0 backdrop-blur (typical modal backdrop)
      const backdrops = document.querySelectorAll('[class*="fixed"][class*="inset-0"][class*="backdrop-blur"]');
      const hasModal = backdrops.length > 0;
      setIsModalOpen(hasModal);
    };
    
    // Check initially
    checkForModal();
    
    // Use MutationObserver to watch for DOM changes (modals opening/closing)
    const observer = new MutationObserver(checkForModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    return () => observer.disconnect();
  }, []);

  // Load notifications from server on mount (for both coaches and students)
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const apiUrl = `${getApiBaseUrlWithApi()}/notifications`;
        const response = await axios.get(
          apiUrl,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            params: {
              limit: 50
            }
          }
        );

        if (response.data.success && Array.isArray(response.data.data)) {
          // Transform database notifications to the format expected by the UI
          const transformedNotifications = response.data.data.map((notif) => {
            // Different format for coaches (video_upload) vs students (video_feedback)
            if (notif.type === 'video_upload') {
              // Coach notification (student uploaded a video)
              return {
                id: notif.id,
                type: 'video_upload',
                studentName: notif.data?.studentName || 'Client',
                exerciseName: notif.data?.exerciseName || '',
                setInfo: notif.data?.setInfo || null,
                sessionName: notif.data?.sessionName || null,
                timestamp: notif.created_at || notif.data?.timestamp || new Date().toISOString(),
                read: notif.read || false,
                videoId: notif.data?.videoId,
                // Include full data object for setNumber and setIndex (totalSets)
                data: notif.data || {},
                // Include message and title for parsing the format
                message: notif.message || '',
                title: notif.title || ''
              };
            } else if (notif.type === 'video_feedback') {
              // Student notification (coach sent feedback)
              return {
                id: notif.id,
                type: 'video_feedback',
                coachName: notif.data?.coachName || 'Coach',
                exerciseName: notif.data?.exerciseName || '',
                sessionName: notif.data?.sessionName || null,
                setInfo: notif.data?.setInfo || null,
                feedback: notif.data?.feedback || '',
                rating: notif.data?.rating || null,
                timestamp: notif.created_at || notif.data?.timestamp || new Date().toISOString(),
                read: notif.read || false,
                videoId: notif.data?.videoId,
                // Include full data object for setNumber and setIndex (totalSets)
                data: notif.data || {},
                // Include message and title for parsing the format
                message: notif.message || '',
                title: notif.title || ''
              };
            }
            return null;
          }).filter(Boolean);

          setNotifications(transformedNotifications);
        }
      } catch (error) {
        console.error('❌ Error loading notifications:', error.message);
      }
    };

    fetchNotifications();
  }, [user?.role, user?.id]);

  // Listen for video upload events (coach side)
  useEffect(() => {
    if (user?.role !== 'coach' || !onVideoUpload) return;

    const unsubscribe = onVideoUpload((payload) => {
      setNotifications((prev) => {
        // Extract notification data from payload (could be in payload.notification or payload directly)
        const notification = payload?.notification || payload;
        const newNotification = {
          id: notification?.id || payload?.notificationId || payload?.id || payload?.videoId || `${Date.now()}-${Math.random()}`,
          type: 'video_upload',
          studentName: notification?.data?.studentName || payload?.studentName || payload?.student?.name || payload?.studentEmail || 'Client',
          exerciseName: notification?.data?.exerciseName || payload?.exerciseName || payload?.exercise?.name || '',
          setInfo: notification?.data?.setInfo || payload?.setInfo,
          sessionName: notification?.data?.sessionName || payload?.sessionName || null,
          timestamp: notification?.created_at || payload?.timestamp || new Date().toISOString(),
          read: false,
          videoId: notification?.data?.videoId || payload?.videoId,
          // Include full data object for setNumber and setIndex (totalSets)
          data: {
            ...(notification?.data || {}),
            setNumber: payload?.setNumber || notification?.data?.setNumber,
            setIndex: payload?.totalSets || notification?.data?.setIndex || notification?.data?.totalSets
          },
          // Include message and title for parsing the format
          message: notification?.message || '',
          title: notification?.title || ''
        };

        // Check if this notification already exists (avoid duplicates)
        const exists = prev.some(n => n.videoId === newNotification.videoId && n.type === 'video_upload');
        if (exists) {
          return prev;
        }

        return [newNotification, ...prev].slice(0, 50); // cap to 50
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.role, onVideoUpload]);

  // Listen for feedback events (student side)
  useEffect(() => {
    if (user?.role !== 'student' || !onFeedback) return;

    const unsubscribe = onFeedback((payload) => {
      setNotifications((prev) => {
        // Extract notification data from payload (could be in payload.notification or payload directly)
        const notification = payload?.notification || payload;
        const newNotification = {
          id: notification?.id || payload?.notificationId || payload?.id || payload?.videoId || `${Date.now()}-${Math.random()}`,
          type: 'video_feedback',
          coachName: notification?.data?.coachName || payload?.coachName || 'Coach',
          exerciseName: notification?.data?.exerciseName || payload?.exerciseName || '',
          sessionName: notification?.data?.sessionName || payload?.sessionName || null,
          setInfo: notification?.data?.setInfo || payload?.setInfo,
          feedback: notification?.data?.feedback || payload?.feedback || '',
          rating: notification?.data?.rating || payload?.rating || null,
          timestamp: notification?.created_at || payload?.timestamp || new Date().toISOString(),
          read: false,
          videoId: notification?.data?.videoId || payload?.videoId,
          // Include full data object for setNumber and setIndex (totalSets)
          data: {
            ...(notification?.data || {}),
            setNumber: payload?.setNumber || notification?.data?.setNumber,
            setIndex: payload?.totalSets || notification?.data?.setIndex || notification?.data?.totalSets
          },
          // Include message and title for parsing the format
          message: notification?.message || '',
          title: notification?.title || ''
        };

        // Check if this notification already exists (avoid duplicates)
        const exists = prev.some(n => n.videoId === newNotification.videoId && n.type === 'video_feedback');
        if (exists) {
          return prev;
        }

        return [newNotification, ...prev].slice(0, 50); // cap to 50
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.role, onFeedback]);

  // Determine page title based on current route
  const getPageTitle = () => {
    if (location.pathname.includes('/exercises')) {
      return 'Exercices';
    }
    if (location.pathname.includes('/videotheque') || location.pathname.includes('/videos')) {
      return 'Vidéothèque';
    }
    if (location.pathname.includes('/chat')) {
      return 'Messages';
    }
    if (location.pathname.includes('/coach/dashboard') || location.pathname === '/dashboard') {
      return 'Clients';
    }
    // Add more route-based titles as needed
    return 'Clients';
  };

  const handleNotificationClick = async (notif) => {
    // Close notification sidebar
    setIsNotificationOpen(false);

    // Mark as read only if the notification has a valid database ID
    // WebSocket notifications might have a different ID structure
    if (!notif.read && notif.id && typeof notif.id === 'string' && notif.id.length === 36) {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        await axios.patch(
          `${getApiBaseUrlWithApi()}/notifications/${notif.id}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
        );
      } catch (error) {
        // Only log if it's not a 404 (404 means notification doesn't exist in DB, which is OK for WebSocket notifications)
        if (error.response?.status !== 404) {
          console.error('Error marking notification as read:', error);
        }
        // Still update local state to mark as read visually
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
        );
      }
    } else if (!notif.read) {
      // For WebSocket notifications without DB ID, just mark as read locally
      setNotifications(prev => 
        prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
      );
    }

    // Open video if it's a video notification
    if (notif.videoId) { 
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        // Fetch video details
        const response = await axios.get(
          `${getApiBaseUrlWithApi()}/videos/${notif.videoId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success && response.data.video) {
          setSelectedVideo(response.data.video);
          setIsVideoModalOpen(true);
        }
      } catch (error) {
        console.error('Error opening video:', error);
        if (error.response?.status === 404) {
          alert('La vidéo associée à cette notification n\'existe plus ou n\'est pas accessible.');
        } else {
          alert('Erreur lors du chargement de la vidéo. Veuillez réessayer.');
        }
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      // Try to mark all as read via API (if endpoint exists)
      // First, try a bulk endpoint
      try {
        await axios.patch(
          `${getApiBaseUrlWithApi()}/notifications/read-all`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (bulkError) {
        // If bulk endpoint doesn't exist, mark each notification individually
        if (bulkError.response?.status === 404 || bulkError.response?.status === 405) {
          // Mark each notification with a valid DB ID
          const validNotifications = unreadNotifications.filter(
            n => n.id && typeof n.id === 'string' && n.id.length === 36
          );
          
          await Promise.allSettled(
            validNotifications.map(notif =>
              axios.patch(
                `${getApiBaseUrlWithApi()}/notifications/${notif.id}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
        } else {
          throw bulkError;
        }
      }

      // Update local state - mark all as read
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Still update local state to mark as read visually
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    }
  };

  const handleToggleNotificationRead = async (notif) => {
    const newReadState = !notif.read;
    
    // Update local state immediately for better UX
    setNotifications(prev => 
      prev.map(n => n.id === notif.id ? { ...n, read: newReadState } : n)
    );

    // If notification has a valid database ID, update on server
    if (notif.id && typeof notif.id === 'string' && notif.id.length === 36) {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        if (newReadState) {
          // Mark as read
          await axios.patch(
            `${getApiBaseUrlWithApi()}/notifications/${notif.id}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          // Mark as unread - try unread endpoint, fallback to read with false
          try {
            await axios.patch(
              `${getApiBaseUrlWithApi()}/notifications/${notif.id}/unread`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (unreadError) {
            // If unread endpoint doesn't exist, try alternative approach
            if (unreadError.response?.status === 404 || unreadError.response?.status === 405) {
              // Some APIs might accept a body with read: false
              await axios.patch(
                `${getApiBaseUrlWithApi()}/notifications/${notif.id}/read`,
                { read: false },
                { headers: { Authorization: `Bearer ${token}` } }
              );
            } else {
              throw unreadError;
            }
          }
        }
      } catch (error) {
        // Revert local state on error
        setNotifications(prev => 
          prev.map(n => n.id === notif.id ? { ...n, read: !newReadState } : n)
        );
        console.error('Error toggling notification read state:', error);
      }
    }
  };

  const renderCoachHeader = () => (
    <div className="flex items-center w-full pb-3 border-b border-white/10">
      {/* Left side - Title and Hamburger menu */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger menu (mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9 flex-shrink-0"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
        </Button>
        
        {/* Page Title */}
        <h1 className="text-[32px] text-white leading-[0] not-italic whitespace-nowrap" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 200, color: 'rgba(255, 255, 255, 1)' }}>
          <span className="leading-[normal]" style={{ color: 'rgba(255, 255, 255, 1)' }}>{getPageTitle()}</span>
        </h1>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-0 flex-shrink-0">
        {/* Settings icon */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white/75 hover:text-[#d4845a] h-9 w-9"
          style={{ background: 'unset', backgroundColor: 'unset' }}
        >
          <SettingsIcon style={{ width: '24px', height: '24px' }} />
        </Button>

        {/* Notification icon */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative text-white/75 hover:text-[#d4845a]"
          onClick={() => setIsNotificationOpen(true)}
          style={{ background: 'unset', backgroundColor: 'unset' }}
        >
          <NotificationIcon style={{ width: '24px', height: '24px' }} />
          {notifications.filter(n => !n.read).length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#d4845a]" />
          )}
        </Button>
      </div>
    </div>
  );

  const renderStudentHeader = () => (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Hamburger menu (mobile only) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden text-muted-foreground hover:text-foreground h-9 w-9"
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
      </Button>

      <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-foreground h-9 w-9">
        <User style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
      </Button>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" style={{ width: '18px', height: '18px', color: 'rgba(255, 255, 255, 0.7)' }} />
        <Input
          type="search"
          placeholder="Search"
          className="pl-10 border-none placeholder:text-muted-foreground rounded-[99px] font-light"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        />
      </div>
      {/* Notification icon */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative text-white/75 hover:text-white hover:bg-white/10"
        onClick={() => setIsNotificationOpen(true)}
      >
        <Bell className="h-5 w-5" style={{ color: 'rgba(255, 255, 255, 0.75)' }} />
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#d4845a]" />
        )}
      </Button>
    </div>
  );

  // In a mobile view (e.g., md breakpoint in tailwind), the header is not shown, 
  // because the MainLayout hides it. This Header is for desktop.
  // The student mobile header is part of the StudentDashboard.
  // So we only need to care about coach desktop and student desktop.
  // Wait, the logic is that the sidebar is hidden on mobile, so the header is still visible.
  // The bottom nav bar appears on mobile. The header should adapt.

  // Let's check MainLayout again.
  // Header is inside <main>. Navigation is outside.
  // On mobile (hidden md:flex for Navigation), the header should still be there.
  // So, the header needs to be responsive.

  const isStudent = user?.role === 'student';

  return (
    <>
      <header 
        className={`relative px-4 sm:px-6 pt-3 pb-3 ${isModalOpen ? 'z-[1]' : 'z-20'}`}
        style={isModalOpen ? { pointerEvents: 'none' } : {}}
      >
        {isStudent ? renderStudentHeader() : renderCoachHeader()}
      </header>
      <MobileNavigationDrawer 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      <NotificationSidebar 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
        onNotificationClick={handleNotificationClick}
        onMarkAllAsRead={handleMarkAllAsRead}
        onToggleRead={handleToggleNotificationRead}
        notifications={notifications}
      />
      {isStudent ? (
        <StudentVideoDetailModal
          isOpen={isVideoModalOpen}
          onClose={() => {
            setIsVideoModalOpen(false);
            setSelectedVideo(null);
          }}
          video={selectedVideo}
          onFeedbackUpdate={() => {
            // Refresh notifications if needed
            // For now, no action needed here as Header doesn't manage the list
          }}
        />
      ) : (
        <VideoDetailModal
          isOpen={isVideoModalOpen}
          onClose={() => {
            setIsVideoModalOpen(false);
            setSelectedVideo(null);
          }}
          video={selectedVideo}
          videoType="student"
          isCoachView={true}
          onFeedbackUpdate={() => {
            // Ideally, refresh notifications or list if needed
            // For now, no action needed here as Header doesn't manage the list
          }}
        />
      )}
    </>
  );
};

export default Header;
