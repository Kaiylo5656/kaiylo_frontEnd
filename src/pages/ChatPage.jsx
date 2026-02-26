import logger from '../utils/logger';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useSearchParams } from 'react-router-dom';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useHideMainHeaderInChat } from '../components/MainLayout';
import { getCachedConversations, setCachedConversations, getCacheTimestamp, mergeSyncedConversations } from '../utils/chatCache';
import { Search, MoreVertical, ChevronLeft, ChevronRight, Users, Dumbbell, Video, FileText } from 'lucide-react';

// Custom MessageSquare Icon Component (Font Awesome)
const MessageSquareIcon = ({ className, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M267.7 576.9C267.7 576.9 267.7 576.9 267.7 576.9L229.9 603.6C222.6 608.8 213 609.4 205 605.3C197 601.2 192 593 192 584L192 512L160 512C107 512 64 469 64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L359.6 512L267.7 576.9zM332 472.8C340.1 467.1 349.8 464 359.7 464L480 464C506.5 464 528 442.5 528 416L528 192C528 165.5 506.5 144 480 144L160 144C133.5 144 112 165.5 112 192L112 416C112 442.5 133.5 464 160 464L216 464C226.4 464 235.3 470.6 238.6 479.9C239.5 482.4 240 485.1 240 488L240 537.7C272.7 514.6 303.3 493 331.9 472.8z" />
  </svg>
);

const ChatPage = () => {
  const { getAuthToken, user } = useAuth();
  const { socket, isConnected, connectionError, markMessagesAsRead } = useSocket();
  const { setHideMainHeaderInChatThread } = useHideMainHeaderInChat();
  const [searchParams] = useSearchParams();

  // Read cache synchronously during state initialization — no async delay
  const initialCache = user?.id ? getCachedConversations(user.id) : null;
  const [conversations, setConversations] = useState(() => initialCache?.data || []);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(() => !initialCache?.data?.length);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get studentId from URL parameters
  const studentId = searchParams.get('studentId');

  // Mobile state: show conversation list or chat window
  const [showConversationList, setShowConversationList] = useState(true);

  // Hide main header when in thread view (conversation open), show it on list view
  useEffect(() => {
    const inThread = !!selectedConversation && !showConversationList;
    setHideMainHeaderInChatThread(inThread);
    return () => setHideMainHeaderInChatThread(false);
  }, [selectedConversation, showConversationList, setHideMainHeaderInChatThread]);

  // Track whether we've loaded cache (to avoid re-reading on re-renders)
  const cacheLoadedRef = useRef(!!initialCache?.data?.length);

  // Sort helper
  const sortConversations = (convs) => convs.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) {
      return new Date(b.created_at) - new Date(a.created_at);
    }
    if (!a.last_message_at) return 1;
    if (!b.last_message_at) return -1;
    return new Date(b.last_message_at) - new Date(a.created_at);
  });

  // Fetch user's conversations (cache-first: show cached data, then refresh in background)
  const fetchConversations = useCallback(async (isBackgroundRefresh = false) => {
    try {
      // On first call when user wasn't available during init, try cache now
      if (!cacheLoadedRef.current && user?.id) {
        cacheLoadedRef.current = true;
        const cached = getCachedConversations(user.id);
        if (cached?.data?.length) {
          setConversations(cached.data);
          setLoading(false);
          // Continue to background refresh below (don't return)
        } else {
          setLoading(true);
        }
      } else if (!isBackgroundRefresh && !cacheLoadedRef.current) {
        // No user yet and not a background refresh — show loading
        setLoading(true);
      }
      // If cache was already loaded, background refresh keeps current data visible (no loading state)

      const token = await getAuthToken();

      // Delta sync: if this is a background refresh and we have a cache timestamp, use sync endpoint
      const sinceTs = isBackgroundRefresh && user?.id ? getCacheTimestamp(user.id) : null;
      if (sinceTs) {
        try {
          const syncRes = await fetch(buildApiUrl(`/api/chat/conversations/sync?since=${encodeURIComponent(sinceTs)}`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.data?.length) {
              const merged = mergeSyncedConversations(user.id, syncData.data);
              if (merged) {
                setConversations(sortConversations([...merged]));
              }
            }
            // Even if no changes, update cache timestamp
            setCachedConversations(user.id, conversations.length ? conversations : (getCachedConversations(user.id)?.data || []));
            setError(null);
            setLoading(false);
            return;
          }
          // If sync endpoint fails (e.g. 404), fall through to full fetch
        } catch {
          // Fall through to full fetch
        }
      }

      const response = await fetch(buildApiUrl('/api/chat/conversations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      const fetchedConversations = data.data || [];
      const sortedConversations = sortConversations(fetchedConversations);

      setConversations(sortedConversations);
      setError(null);

      // Persist to cache
      if (user?.id) {
        setCachedConversations(user.id, sortedConversations);
      }
    } catch (err) {
      logger.error('Error fetching conversations:', err);
      if (!conversations.length) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, user?.id]);

  useEffect(() => {
    fetchConversations();

    // Refresh conversations when page becomes visible again (background refresh)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchConversations(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchConversations]);

  // Listen for messages_read events to update last_read_at
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMessagesRead = (data) => {
      logger.debug('🔌 Messages marked as read:', data);
      // Update last_read_at for the conversation
      // The server may send conversationId or conversation_id
      const conversationId = data?.conversationId || data?.conversation_id;
      const userId = data?.userId;

      if (conversationId) {
        // Use server's last_read_at if provided, otherwise use current time
        const readAt = data?.last_read_at || new Date().toISOString();

        setConversations(prev =>
          prev.map(conv => {
            if (conv.id === conversationId) {
              // If I read the messages, reset unread count
              if (userId === user?.id) {
                return { ...conv, last_read_at: readAt, unread_count: 0 };
              }
              // If other user read messages, update other_participant_last_read_at
              else {
                return { ...conv, other_participant_last_read_at: readAt };
              }
            }
            return conv;
          })
        );

        // Refresh conversations after a delay to ensure server has persisted the update
        // This ensures that when the page is refreshed, the badge won't reappear
        setTimeout(() => {
          fetchConversations(true);
        }, 1000);
      }
    };

    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, isConnected]);

  // Auto-open conversation with specific student if studentId is provided
  useEffect(() => {
    if (studentId && conversations.length > 0) {
      // Look for existing conversation with this student
      const existingConversation = conversations.find(conv =>
        conv.other_participant_id === studentId
      );

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setShowConversationList(false); // Hide list on mobile when auto-opening
      } else {
        // Create new conversation with this student
        createConversation(studentId);
      }
    }
  }, [studentId, conversations]);

  // Create new conversation
  const createConversation = async (participantId) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/chat/conversations'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId })
      });

      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      const newConversation = data.data;

      setConversations(prev => {
        // Check if the conversation already exists in the list
        if (prev.some(conv => conv.id === newConversation.id)) {
          return prev; // If it exists, don't add it again
        }
        // Otherwise, add the new conversation to the list
        return [newConversation, ...prev];
      });

      setSelectedConversation(newConversation);
      setShowConversationList(false); // Hide list on mobile when creating new conversation
    } catch (err) {
      logger.error('Error creating conversation:', err);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    // On mobile, hide conversation list and show chat window
    setShowConversationList(false);

    // Mark messages as read when conversation is selected
    // Check if there are unread messages (either via count or timestamp check)
    let shouldMarkAsRead = false;

    if (conversation.unread_count > 0) {
      shouldMarkAsRead = true;
    } else if (conversation?.last_message) {
      // Fallback check if unread_count is missing or 0 but timestamps mismatch
      // (e.g. real-time update didn't increment count properly)
      const lastMessage = conversation.last_message;
      const isSentByOtherUser = lastMessage.sender_id !== user?.id;

      if (isSentByOtherUser) {
        const hasUnread = !conversation.last_read_at ||
          (lastMessage.created_at && new Date(conversation.last_read_at) < new Date(lastMessage.created_at));
        if (hasUnread) shouldMarkAsRead = true;
      }
    }

    if (shouldMarkAsRead) {
      // Update locally for immediate UI feedback
      const now = new Date().toISOString();
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id
            ? { ...conv, last_read_at: now, unread_count: 0 }
            : conv
        )
      );

      // Mark as read on server via HTTP for reliability
      // The server will verify persistence and emit the socket event
      try {
        const token = await getAuthToken();
        const response = await fetch(buildApiUrl(`/api/chat/conversations/${conversation.id}/read`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to mark as read via HTTP');
        }
      } catch (error) {
        logger.error('❌ Error marking messages as read via HTTP:', error);
        // Fallback to socket if HTTP fails
        if (isConnected && markMessagesAsRead) {
          logger.debug('🔄 Falling back to socket for read status...');
          markMessagesAsRead(conversation.id);
        }
      }
    }
  };

  // Helper to persist current conversations to cache after state update
  const persistConversationsToCache = useCallback((updatedConversations) => {
    if (user?.id) {
      setCachedConversations(user.id, updatedConversations);
    }
  }, [user?.id]);

  // Handle new message
  const handleNewMessage = useCallback((conversationId, message) => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      persistConversationsToCache(updated);
      return updated;
    });
  }, [persistConversationsToCache]);

  // Handle message sent
  const handleMessageSent = useCallback((conversationId, message) => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      persistConversationsToCache(updated);
      return updated;
    });
  }, [persistConversationsToCache]);

  // Handle conversation deletion
  const handleDeleteConversation = async (conversationId) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl(`/api/chat/conversations/${conversationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
    } catch (err) {
      logger.error('Error deleting conversation:', err);
    }
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv =>
    conv.other_participant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full text-foreground flex flex-col relative">
      {/* Mobile Background Elements (Hidden on Desktop) */}
      <div className="md:hidden">
        {/* Image de fond */}
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundImage: 'url(/background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 1,
            backgroundColor: '#0a0a0a'
          }}
        />

        {/* Layer blur sur l'écran */}
        <div
          style={{
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backdropFilter: 'blur(50px)',
            WebkitBackdropFilter: 'blur(100px)',
            backgroundColor: 'rgba(0, 0, 0, 0.01)',
            zIndex: 6,
            pointerEvents: 'none',
            opacity: 1
          }}
        />

        {/* Gradient conique Figma - partie droite */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '0',
            transform: 'translateY(-50%)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite'
          }}
        />

        {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
        <div
          style={{
            position: 'absolute',
            top: '-25px',
            left: '50vw',
            transform: 'translateY(-50%) scaleX(-1)',
            width: '50vw',
            height: '900px',
            borderRadius: '0',
            background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
            backdropFilter: 'blur(75px)',
            boxShadow: 'none',
            filter: 'brightness(1.5)',
            zIndex: 5,
            pointerEvents: 'none',
            opacity: 1.0,
            animation: 'organicGradientBright 15s ease-in-out infinite 1.5s'
          }}
        />

        {/* Top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
            opacity: 0.35,
            zIndex: 5
          }}
        />
        {/* Warm orange glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
          style={{
            background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
            opacity: 0.45,
            zIndex: 5
          }}
        />
        {/* Subtle bottom depth glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
          style={{
            background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
            opacity: 0.25,
            zIndex: 5
          }}
        />
      </div>
      {/* Inline error banner - does not block layout */}
      {error && !loading && (
        <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between gap-2 bg-destructive/10 border-b border-destructive/20">
          <span className="text-destructive text-sm">{error}</span>
          <button
            onClick={fetchConversations}
            className="text-primary font-medium text-sm hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 relative z-10">
        {/* Contact List - Mobile: Hidden when chat is open, Desktop: Always visible */}
        <div className={`${showConversationList ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-col flex-shrink-0`}>
          <ChatList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onCreateConversation={createConversation}
            currentUser={user}
            onDeleteConversation={handleDeleteConversation}
            conversationsLoading={loading}
            onConversationsUpdate={persistConversationsToCache}
          />
        </div>

        {/* Chat Window - Mobile: Hidden when list is shown, Desktop: Takes remaining space */}
        <div className={`${selectedConversation && !showConversationList ? 'flex' : 'hidden'} md:flex flex-1 flex-col min-w-0 md:pr-6`}>
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={user}
              onNewMessage={handleNewMessage}
              onMessageSent={handleMessageSent}
              onBack={() => {
                setSelectedConversation(null);
                setShowConversationList(true);
              }}
            />
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-2 rounded-full flex items-center justify-center">
                  <MessageSquareIcon className="w-10 h-10" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
                </div>
                <h3 className="text-base font-extralight mb-3" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Sélectionner une conversation</h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;