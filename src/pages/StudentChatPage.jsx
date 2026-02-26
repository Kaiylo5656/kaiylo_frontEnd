import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import BottomNavBar from '../components/BottomNavBar';
import Header from '../components/Header';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { getCachedConversations, setCachedConversations, getCacheTimestamp, mergeSyncedConversations } from '../utils/chatCache';
import { ChevronLeft, Search } from 'lucide-react';

/**
 * Mobile-optimized chat page for students
 * Full-screen layout with mobile-friendly navigation
 */
const StudentChatPage = () => {
  const { getAuthToken, user } = useAuth();
  const { isConnected, connectionError, markMessagesAsRead, socket } = useSocket();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read cache synchronously during state initialization — no async delay
  const initialCache = user?.id ? getCachedConversations(user.id) : null;
  const [conversations, setConversations] = useState(() => initialCache?.data || []);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(() => !initialCache?.data?.length);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);
  const [coachNamesMap, setCoachNamesMap] = useState({});

  // Get studentId from URL parameters (for coaches linking to chat)
  const studentId = searchParams.get('studentId');

  // Track whether we've loaded cache
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
        } else {
          setLoading(true);
        }
      } else if (!isBackgroundRefresh && !cacheLoadedRef.current) {
        setLoading(true);
      }

      const token = await getAuthToken();

      // Delta sync: if background refresh and we have a cache timestamp, use sync endpoint
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
            setCachedConversations(user.id, conversations.length ? conversations : (getCachedConversations(user.id)?.data || []));
            setError(null);
            setLoading(false);
            return;
          }
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
      const convs = data.data || [];
      const sortedConversations = sortConversations(convs);

      setConversations(sortedConversations);
      setError(null);

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

  // Fetch coach info (runs in parallel with conversations - no dependency on conversations)
  const fetchCoachInfo = async () => {
    if (!user || user.role !== 'student') return;
    try {
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/coach'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        const coachData = Array.isArray(data.data) ? data.data[0] : (data.data || {});
        if (coachData?.id && coachData?.name) {
          setCoachNamesMap({ [coachData.id]: coachData.name, 'coach': coachData.name });
        }
      }
    } catch (error) {
      logger.error('Error fetching coach info:', error);
    }
  };

  // Load conversations + coach info in parallel for faster page load
  useEffect(() => {
    if (!user) return;
    Promise.all([fetchConversations(), fetchCoachInfo()]);

    // Refresh conversations when page becomes visible again (background refresh)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchConversations(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user?.id, fetchConversations]);

  // Listen for socket events (new_message, messages_read)
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessageSocket = (data) => {
      const conversationId = data.conversationId || data.conversation_id;
      const senderId = data.sender_id;

      setConversations(prev => {
        // Check if conversation exists
        const exists = prev.some(c => c.id === conversationId);
        if (!exists) {
          // If we don't have the conversation, we might want to fetch it or ignore
          // For now, we'll ignore to avoid complexity, or trigger a refetch
          fetchConversations();
          return prev;
        }

        return prev.map(conv => {
          if (conv.id === conversationId) {
            const isMyMessage = senderId === user?.id;

            // If message is from other user AND we are not currently viewing this conversation, increment unread_count
            // Note: If selectedConversation is this conversation, we might want to mark as read immediately?
            // But usually we rely on the ChatWindow to call markMessagesAsRead.
            // However, ChatWindow logic runs inside ChatWindow. 
            // Here we are updating the list state. 
            // If the user is IN the conversation (selectedConversation?.id === conversationId), 
            // the unread count in the list should ideally stay 0 or be reset.

            let newUnreadCount = conv.unread_count || 0;
            if (!isMyMessage && selectedConversation?.id !== conversationId) {
              newUnreadCount += 1;
            }

            return {
              ...conv,
              last_message: data,
              last_message_at: data.created_at,
              unread_count: newUnreadCount
            };
          }
          return conv;
        });
      });
    };

    const handleMessagesReadSocket = (data) => {
      const { conversationId, userId, readAt } = data;
      const convId = conversationId || data.conversation_id;

      setConversations(prev => prev.map(conv => {
        if (conv.id === convId) {
          // If I read the messages, reset unread count
          if (userId === user?.id) {
            return {
              ...conv,
              unread_count: 0,
              last_read_at: readAt
            };
          }
          // If other user read messages, update other_participant_last_read_at
          else {
            return {
              ...conv,
              other_participant_last_read_at: readAt
            };
          }
        }
        return conv;
      }));
    };

    socket.on('new_message', handleNewMessageSocket);
    socket.on('messages_read', handleMessagesReadSocket);

    return () => {
      socket.off('new_message', handleNewMessageSocket);
      socket.off('messages_read', handleMessagesReadSocket);
    };
  }, [socket, isConnected, user, selectedConversation?.id]);

  // Auto-open conversation with specific student if studentId is provided
  useEffect(() => {
    if (studentId && conversations.length > 0) {
      // Look for existing conversation with this student
      const existingConversation = conversations.find(conv =>
        conv.other_participant_id === studentId
      );

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setShowConversationList(false); // Hide list and show chat window on mobile
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
          return prev;
        }
        return [newConversation, ...prev];
      });

      setSelectedConversation(newConversation);
      setShowConversationList(false); // Hide list and show chat window on mobile
    } catch (err) {
      logger.error('Error creating conversation:', err);
    }
  };

  // Handle conversation selection - on mobile, hide list and show chat
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setShowConversationList(false); // Hide conversation list on mobile

    // Mark as read locally and via socket/HTTP
    if (conversation.unread_count > 0) {
      setConversations(prev => prev.map(c =>
        c.id === conversation.id ? { ...c, unread_count: 0, last_read_at: new Date().toISOString() } : c
      ));

      // Mark as read on server via HTTP for reliability
      try {
        const token = await getAuthToken();
        await fetch(buildApiUrl(`/api/chat/conversations/${conversation.id}/read`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        logger.error('❌ Error marking messages as read via HTTP:', error);
        // Fallback to socket
        if (isConnected && markMessagesAsRead) {
          markMessagesAsRead(conversation.id);
        }
      }
    }
  };

  // Handle back from chat window - show conversation list
  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowConversationList(true);
  };

  // Handle new message
  const handleNewMessage = useCallback((conversationId, message) => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      if (user?.id) setCachedConversations(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  // Handle message sent
  const handleMessageSent = useCallback((conversationId, message) => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      if (user?.id) setCachedConversations(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  // Extract potential first name from email (e.g., "tchomarat2001@gmail.com" -> "Tchomarat")
  const extractNameFromEmail = (email) => {
    if (!email || !email.includes('@')) return null;

    const emailPart = email.split('@')[0];
    // Remove numbers and special characters, keep only letters
    const namePart = emailPart.replace(/\d+/g, '').trim();

    if (namePart.length > 0) {
      // Capitalize first letter
      return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
    }

    return null;
  };

  // Get coach display name (Coach [Prénom] format)
  const getCoachDisplayName = (conversation) => {
    // For students, there's only one coach, so try to get it from coachNamesMap
    // Try with the special 'coach' key first, then with any ID in the map
    let coachName = null;

    if (coachNamesMap['coach']) {
      // Use the stored coach name directly (for students, there's only one coach)
      coachName = coachNamesMap['coach'];
    } else if (Object.keys(coachNamesMap).length > 0) {
      // If there's any entry in the map, use the first one (for students, there's only one coach)
      const firstCoachId = Object.keys(coachNamesMap).find(key => key !== 'coach');
      if (firstCoachId) {
        coachName = coachNamesMap[firstCoachId];
      } else {
        // If only 'coach' key exists or no valid ID, use the first value
        const values = Object.values(coachNamesMap);
        if (values.length > 0) {
          coachName = values[0];
        }
      }
    }

    // If we have the coach name from the API, extract first name (same logic as ChatWindow)
    if (coachName) {
      // If it looks like an email, return just "Coach" (shouldn't happen if API returns correctly)
      if (coachName.includes('@')) {
        return 'Coach';
      }
      // Extract first name (first word) from full name - same as ChatWindow
      const firstName = coachName.split(' ')[0] || coachName;
      return `Coach ${firstName}`;
    }

    // Fallback: if coach name is not yet loaded from API, don't use email extraction
    // Just return "Coach" until the API call completes
    return 'Coach';
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => {
    const displayName = getCoachDisplayName(conv);
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Format duration for voice message preview (e.g. 65 -> "1:05")
  const formatVoiceDuration = (seconds) => {
    if (seconds == null || isNaN(seconds) || seconds < 0) return null;
    const s = Math.floor(Number(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format last message preview (Instagram-style for voice: "Message vocal • 0:45")
  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    // Voice/audio message: show "Message vocal • 0:45" instead of filename
    const isVoice = message.message_type === 'audio' || message.file_type?.startsWith('audio/') ||
      (message.content && (message.content.includes('voice-message') || /\.(webm|ogg|m4a|mp3)$/i.test(message.content)));
    if (isVoice) {
      const durationStr = formatVoiceDuration(message.duration);
      return durationStr ? `Message vocal • ${durationStr}` : 'Message vocal';
    }
    const content = message.content || '';
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  return (
    <>
      <div
        className="text-foreground w-full h-full relative overflow-hidden flex flex-col"
        style={{
          background: 'unset',
          backgroundImage: 'none',
          height: '100vh',
          overflow: 'hidden'
        }}
      >
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

        {/* Top glow to match WorkoutSessionExecution */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 w-[120%] max-w-[700px] h-[260px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(60, 60, 60, 0.4) 0%, rgba(0, 0, 0, 1) 100%)',
            opacity: 0.35
          }}
        />
        {/* Warm orange glow from timeline */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[26%] -left-[6%] w-[420px] h-[420px] blur-[200px]"
          style={{
            background: 'radial-gradient(circle, rgba(212,132,90,0.6) 0%, rgba(5,5,5,0) 65%)',
            opacity: 0.45
          }}
        />
        {/* Subtle bottom depth glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-18%] right-[-12%] w-[480px] h-[480px] blur-[230px]"
          style={{
            background: 'radial-gradient(circle, rgba(60,60,60,0.4) 0%, rgba(0,0,0,0) 70%)',
            opacity: 0.25
          }}
        />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* List view: show when loading (with skeleton), on error, or when no conversation selected */}
          {(loading || error || (showConversationList && !selectedConversation)) ? (
            <>
              <Header />
              <div className="px-10 pt-6 pb-4 w-full max-w-6xl mx-auto relative z-10 flex flex-col items-center">
                <h1 className="text-[28px] font-light text-center text-white mb-6">
                  Messages
                </h1>
              </div>

              {!error && (
                <div className="px-10 py-3 flex-shrink-0 w-full max-w-6xl mx-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-[#404040] rounded-[99px] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      style={{ color: 'rgba(255, 255, 255, 1)', fontWeight: 400 }}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 px-10 w-full max-w-6xl mx-auto">
                {loading ? (
                  <div className="space-y-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="px-4 py-4 rounded-lg mb-2 animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255, 255, 255, 0.1)', borderRadius: '15px' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex-shrink-0 bg-white/10" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 rounded w-2/3 bg-white/10" />
                            <div className="h-3 rounded w-full bg-white/5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center px-4">
                      <div className="text-red-400 text-lg font-semibold mb-2">Erreur</div>
                      <div className="text-gray-400 mb-4">{error}</div>
                      <button
                        onClick={fetchConversations}
                        className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 touch-target"
                      >
                        Réessayer
                      </button>
                    </div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <div className="text-sm text-white/50">
                      {searchTerm ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                    </div>
                    <div className="text-xs mt-2 text-white/50 font-light">
                      {searchTerm ? 'Essayez un autre terme de recherche' : 'Commencez une nouvelle conversation'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation)}
                        className="px-4 py-4 bg-[rgba(255,255,255,0.03)] active:bg-[#262626] touch-target cursor-pointer rounded-lg mb-2"
                        style={{
                          borderWidth: '0.5px',
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderBottomStyle: 'solid',
                          borderRadius: '15px'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0 relative">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-medium text-lg">
                              {getCoachDisplayName(conversation).charAt(0).toUpperCase() || 'C'}
                            </div>
                            {conversation.unread_count > 0 && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#d4845a] rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-[#0a0a0a]">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-white truncate text-sm">
                                {getCoachDisplayName(conversation)}
                              </h4>
                              <time className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {formatTimestamp(conversation.last_message_at)}
                              </time>
                            </div>
                            <p className="text-xs text-gray-400 truncate">
                              {formatLastMessage(conversation.last_message)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Chat Window - Full Screen on Mobile with flex layout */
            <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
              <ChatWindow
                conversation={selectedConversation}
                currentUser={user}
                onNewMessage={handleNewMessage}
                onMessageSent={handleMessageSent}
                onBack={handleBackToList}
              />
            </div>
          )}
        </div>
      </div>
      {/* Bottom Navigation Bar - Show on other views (not in chat) */}
      {showConversationList && <BottomNavBar />}
    </>
  );
};

export default StudentChatPage;
