import logger from '../utils/logger';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import FileMessage from './FileMessage';
import VideoFeedbackMessage from './VideoFeedbackMessage';
import ReplyMessage from './ReplyMessage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { buildApiUrl } from '../config/api';
import { getCachedMessages, setCachedMessages, appendCachedMessage } from '../utils/chatCache';
import { Paperclip, ChevronLeft, Check, CheckCheck, Image as ImageIcon, Video } from 'lucide-react';
import DeleteMessageModal from './DeleteMessageModal';
import VoiceRecorder from './VoiceRecorder';
import VideoDetailModal from './VideoDetailModal';
import StudentVideoDetailModal from './StudentVideoDetailModal';

// Custom MessageSquare Icon Component (Font Awesome)
const MessageSquareIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 640 640"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M267.7 576.9C267.7 576.9 267.7 576.9 267.7 576.9L229.9 603.6C222.6 608.8 213 609.4 205 605.3C197 601.2 192 593 192 584L192 512L160 512C107 512 64 469 64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L359.6 512L267.7 576.9zM332 472.8C340.1 467.1 349.8 464 359.7 464L480 464C506.5 464 528 442.5 528 416L528 192C528 165.5 506.5 144 480 144L160 144C133.5 144 112 165.5 112 192L112 416C112 442.5 133.5 464 160 464L216 464C226.4 464 235.3 470.6 238.6 479.9C239.5 482.4 240 485.1 240 488L240 537.7C272.7 514.6 303.3 493 331.9 472.8z"/>
  </svg>
);

// Custom Reply Icon Component (Font Awesome)
const ReplyIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 512 512"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M204.2 18.4c12 5 19.8 16.6 19.8 29.6l0 80 112 0c97.2 0 176 78.8 176 176 0 113.3-81.5 163.9-100.2 174.1-2.5 1.4-5.3 1.9-8.1 1.9-10.9 0-19.7-8.9-19.7-19.7 0-7.5 4.3-14.4 9.8-19.5 9.4-8.8 22.2-26.4 22.2-56.7 0-53-43-96-96-96l-96 0 0 80c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-160-160c-12.5-12.5-12.5-32.8 0-45.3l160-160c9.2-9.2 22.9-11.9 34.9-6.9z"/>
  </svg>
);

const ChatWindow = ({ conversation, currentUser, onNewMessage, onMessageSent, onBack }) => {
  const { getAuthToken } = useAuth();
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage: sendSocketMessage, startTyping, stopTyping, markMessagesAsRead } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [nextCursor, setNextCursor] = useState(null); // New state for pagination cursor
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [participantInfo, setParticipantInfo] = useState({ name: null, email: null });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [otherParticipantReadAt, setOtherParticipantReadAt] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const virtuosoRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});
  const processedMessageIdsRef = useRef(new Set()); // Persist processed message IDs across renders
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  // Refs for stable socket listener callbacks (prevent useEffect re-runs)
  const onNewMessageRef = useRef(onNewMessage);
  const markMessagesAsReadRef = useRef(markMessagesAsRead);
  onNewMessageRef.current = onNewMessage;
  markMessagesAsReadRef.current = markMessagesAsRead;


  // Track whether we've checked the cache for this conversation
  const messageCacheCheckedRef = useRef(null);

  const fetchMessages = useCallback(async (cursor = null) => {
    if (!conversation?.id) return;

    try {
      // On initial load (no cursor), try cache first
      if (!cursor && messageCacheCheckedRef.current !== conversation.id) {
        messageCacheCheckedRef.current = conversation.id;
        const cached = getCachedMessages(conversation.id);
        if (cached?.messages?.length) {
          setMessages(cached.messages);
          setNextCursor(cached.nextCursor);
          setHasMoreMessages(!!cached.nextCursor);
          setIsInitialLoad(false);
          // Don't show spinner — we have cached messages
          // Continue to fetch fresh data in background below
        } else {
          setLoading(true); // No cache — show spinner
        }
      } else if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const token = await getAuthToken();

      // Build query parameters for pagination
      const params = new URLSearchParams({
        limit: '50' // Load 50 messages at a time
      });

      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(buildApiUrl(`/api/chat/conversations/${conversation.id}/messages?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      const { messages: newMessages, nextCursor: newNextCursor, other_participant_last_read_at } = data.data || { messages: [], nextCursor: null };

      // Update other participant's read time from API
      if (other_participant_last_read_at) {
        setOtherParticipantReadAt(other_participant_last_read_at);
      } else if (isInitialLoad && conversation?.other_participant_last_read_at) {
        // Fallback to conversation prop on initial load
        setOtherParticipantReadAt(conversation.other_participant_last_read_at);
      }

      if (cursor) {
        // When loading more, prepend older messages to the beginning of the array
        // API returns messages in newest-to-oldest order (descending)
        // We need to reverse them to oldest-to-newest before prepending
        const reversedOlderMessages = [...newMessages].reverse();
        setMessages(prev => [...reversedOlderMessages, ...prev]);
      } else {
        // Initial load
        // CRITICAL: API returns messages in newest-to-oldest order (descending)
        // We need to reverse them to oldest-to-newest for proper display (oldest at top, newest at bottom)
        const reversedMessages = [...newMessages].reverse();
        setMessages(reversedMessages);
        setIsInitialLoad(false); // Mark initial load as complete

        // Cache the latest page of messages
        setCachedMessages(conversation.id, reversedMessages, newNextCursor);
      }

      setNextCursor(newNextCursor);
      setHasMoreMessages(!!newNextCursor);

      // Clear old message refs when fetching new messages
      messageRefs.current = {};
    } catch (error) {
      logger.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversation?.id, getAuthToken]);

  // Load more messages when scrolling to the top
  const loadMoreMessages = useCallback(() => {
    if (!loadingMore && hasMoreMessages && nextCursor) {
      fetchMessages(nextCursor);
    }
  }, [loadingMore, hasMoreMessages, nextCursor, fetchMessages]);

  // Virtuoso's startReached callback for loading older messages
  const handleStartReached = useCallback(() => {
    if (!loadingMore && hasMoreMessages && nextCursor) {
      loadMoreMessages();
    }
  }, [loadingMore, hasMoreMessages, nextCursor, loadMoreMessages]);

  const handleFileUpload = useCallback(async (file) => {
    if (!conversation?.id || uploadingFile) return;

    setUploadingFile(true);

    try {
      logger.debug('📤 Uploading file:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        conversationId: conversation.id 
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversation.id);
      formData.append('content', '');

      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/chat/messages'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        // Try to get error message from response
        const errorData = await response.json().catch(() => ({}));
        logger.error('❌ Upload error response:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      logger.debug('✅ File uploaded successfully:', responseData);
      
      // Add the file message to the messages list if returned
      // Check for duplicates before adding (message might also arrive via WebSocket)
      if (responseData.data) {
        setMessages(prev => {
          // Check if message already exists (might have arrived via WebSocket first)
          const existingIndex = prev.findIndex(msg => msg.id === responseData.data.id);
          if (existingIndex !== -1) {
            logger.debug('⚠️ Message already exists in list, skipping duplicate:', responseData.data.id);
            return prev; // Return unchanged array to prevent duplicate
          }
          return [...prev, responseData.data];
        });
      }
    } catch (error) {
      logger.error('❌ File upload failed:', error);
      alert(error.message || 'Échec de l\'envoi du fichier. Veuillez réessayer.');
    } finally {
      setUploadingFile(false);
    }
  }, [conversation?.id, uploadingFile, getAuthToken]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/webm'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Type de fichier non supporté. Types autorisés: Images (JPEG, PNG, GIF, WebP) et Vidéos (MP4, MOV, AVI, WebM)');
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Validate file size (50MB)
    const maxFileSize = 50 * 1024 * 1024;
    if (file.size > maxFileSize) {
      alert('Fichier trop volumineux. Taille maximale: 50MB.');
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }
    
    // Store file and create preview instead of uploading immediately
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  const handleConfirmFileUpload = useCallback(() => {
    if (selectedFile) {
      handleFileUpload(selectedFile);
      setSelectedFile(null);
      setFilePreview(null);
    }
  }, [selectedFile, handleFileUpload]);
  
  const handleCancelFileUpload = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle voice message send
  const handleVoiceMessageSend = useCallback((audioFile) => {
    if (audioFile && conversation?.id) {
      handleFileUpload(audioFile);
      setShowVoiceRecorder(false);
    }
  }, [conversation?.id, handleFileUpload]);

  // Handle voice recorder cancel
  const handleVoiceRecorderCancel = useCallback(() => {
    setShowVoiceRecorder(false);
  }, []);

  const handleDeleteMessage = useCallback((messageId) => {
    if (!conversation?.id || !messageId) return;
    
    // Find the message to get its content for display
    const message = messages.find(msg => msg.id === messageId);
    setMessageToDelete({ id: messageId, content: message?.content || '' });
    setShowDeleteModal(true);
  }, [conversation?.id, messages]);

  const handleConfirmDelete = useCallback(async () => {
    if (!messageToDelete || !conversation?.id) return;

    try {
      setDeleting(true);
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl(`/api/chat/messages/${messageToDelete.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageToDelete.id));
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setMessageToDelete(null);
      
      logger.debug('✅ Message deleted successfully');
    } catch (error) {
      logger.error('❌ Error deleting message:', error);
      alert('Erreur lors de la suppression du message. Veuillez réessayer.');
    } finally {
      setDeleting(false);
    }
  }, [messageToDelete, conversation?.id, getAuthToken]);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    // Debug logging (reduced)
    logger.debug('🔍 sendMessage called for conversation:', conversation?.id);

    // Check if conversation has valid ID
    if (!conversation || !conversation.id) {
      logger.error('❌ No valid conversation or conversation ID found:', conversation);
      alert('No conversation selected. Please select a conversation first.');
      return;
    }

    const messageContent = newMessage.trim();
    const replyToMessageId = replyingTo?.id || null;
    
    setNewMessage('');
    setReplyingTo(null);
    setSending(true);

    try {
      stopTyping(conversation.id);
      setIsTyping(false);

      if (isConnected && socket) {
        logger.debug('📡 Using WebSocket to send message');

        const tempId = `temp_${Date.now()}`;
        const optimisticMessage = {
          id: tempId,
          content: messageContent,
          sender_id: currentUser.id,
          message_type: 'text',
          reply_to_message_id: replyToMessageId,
          created_at: new Date().toISOString(),
          conversationId: conversation.id,
          sender: { id: currentUser.id, email: currentUser.email },
          replyTo: replyingTo ? { ...replyingTo } : null
        };

        // Add optimistic message
        setMessages(prev => [...prev, optimisticMessage]);

        // Set a timeout to roll back if no server confirmation arrives
        const rollbackTimeout = setTimeout(() => {
          setMessages(prev => {
            const stillTemp = prev.find(m => m.id === tempId);
            if (stillTemp) {
              logger.warn('⚠️ Rolling back unconfirmed optimistic message:', tempId);
              return prev.filter(m => m.id !== tempId);
            }
            return prev;
          });
        }, 10000); // 10 second timeout

        sendSocketMessage(conversation.id, messageContent, 'text', replyToMessageId);

        if (onMessageSent) {
          onMessageSent(conversation.id, optimisticMessage);
        }
      } else {
        // Fallback to HTTP
        logger.debug('🌐 Using HTTP fallback to send message');
        const token = await getAuthToken();
        
        const requestBody = {
          conversationId: conversation.id,
          content: messageContent,
          replyToMessageId: replyToMessageId
        };
        
        logger.debug('📤 Sending HTTP request with body:', requestBody);
        
        const response = await fetch(buildApiUrl('/api/chat/messages'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('❌ HTTP response error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        logger.debug('✅ HTTP message sent successfully:', responseData);
        
        if (onMessageSent) {
          onMessageSent(conversation.id, responseData.data);
        }
      }
    } catch (error) {
      logger.error('❌ Error sending message:', error);
      // Roll back any optimistic message on failure
      setMessages(prev => prev.filter(m => !m.id?.startsWith('temp_') || m.content !== messageContent));
      alert(`Failed to send message: ${error.message}. Please try again.`);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  }, [
    newMessage, sending, replyingTo, conversation?.id, 
    currentUser, isConnected, socket, sendSocketMessage, 
    stopTyping, onMessageSent, getAuthToken
  ]);

  useEffect(() => {
    if (conversation?.id && socket && isConnected) {
      // Reset state when conversation changes
      setMessages([]);
      setNextCursor(null);
      setHasMoreMessages(true);
      setIsInitialLoad(true);
      messageCacheCheckedRef.current = null; // Allow cache check for new conversation

      // Clear processed message IDs when switching conversations
      processedMessageIdsRef.current.clear();

      fetchMessages(); // Initial load (no cursor)
      markMessagesAsReadRef.current(conversation.id);
      joinConversation(conversation.id);

      logger.debug('✅ Joined conversation room:', conversation.id);
    }

    return () => {
      if (conversation?.id && socket && isConnected) {
        leaveConversation(conversation.id);
        logger.debug('✅ Left conversation room:', conversation.id);
      }
    };
  }, [conversation?.id, socket, isConnected]);

  // Sync missed messages on socket reconnect
  useEffect(() => {
    if (!socket || !conversation?.id) return;

    const handleReconnect = async () => {
      logger.debug('🔄 Socket reconnected — syncing missed messages');
      // Find the most recent message timestamp we have
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg?.created_at) {
        // No messages loaded yet, do a full fetch
        fetchMessages();
        return;
      }

      try {
        const token = await getAuthToken();
        const params = new URLSearchParams({ limit: '100' });
        // Fetch only messages newer than our last known message
        // Use cursor-based fetch but with gt instead of lt — the API returns newest-first so
        // we'll just do a regular fetch and merge
        const response = await fetch(
          buildApiUrl(`/api/chat/conversations/${conversation.id}/messages?${params}`),
          { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (!response.ok) return;

        const data = await response.json();
        const freshMessages = (data.data?.messages || []).reverse(); // oldest-first

        if (freshMessages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newOnes = freshMessages.filter(m => !existingIds.has(m.id));
            if (newOnes.length === 0) return prev;
            return [...prev, ...newOnes];
          });
        }
      } catch (err) {
        logger.error('Error syncing messages on reconnect:', err);
      }

      // Re-join the conversation room after reconnect
      joinConversation(conversation.id);
      markMessagesAsReadRef.current(conversation.id);
    };

    socket.io.on('reconnect', handleReconnect);
    return () => {
      socket.io.off('reconnect', handleReconnect);
    };
  }, [socket, conversation?.id]);

  // Fetch participant information (name and email)
  useEffect(() => {
    const fetchParticipantInfo = async () => {
      if (!conversation?.other_participant_id || !currentUser) return;
      
      try {
        const token = await getAuthToken();
        const endpoint = currentUser?.role === 'coach' 
          ? '/api/coach/students' 
          : '/api/coach';
        
        const response = await fetch(buildApiUrl(endpoint), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const responseData = data.data || [];
          
          // For students, /api/coach returns a single object, not an array
          // For coaches, /api/coach/students returns an array
          let participant = null;
          if (Array.isArray(responseData)) {
            participant = responseData.find(user => user.id === conversation.other_participant_id);
          } else if (responseData.id === conversation.other_participant_id) {
            // Single object response (for students)
            participant = responseData;
          }
          
          if (participant) {
            setParticipantInfo({
              name: participant.name || conversation.other_participant_name || 'Unknown User',
              email: participant.email || conversation.other_participant_name || ''
            });
          } else {
            // Fallback to conversation data
            setParticipantInfo({
              name: conversation.other_participant_name || 'Unknown User',
              email: conversation.other_participant_name || ''
            });
          }
        }
      } catch (error) {
        logger.error('Error fetching participant info:', error);
        // Fallback to conversation data
        setParticipantInfo({
          name: conversation.other_participant_name || 'Unknown User',
          email: conversation.other_participant_name || ''
        });
      }
    };

    fetchParticipantInfo();
  }, [conversation?.other_participant_id, conversation?.other_participant_name, currentUser, getAuthToken]);

  useEffect(() => {
    if (!socket || !conversation?.id) return;

    const handleNewMessage = (messageData) => {
      // Only process messages for the current conversation
      const receivedConversationId = messageData.conversationId || messageData.conversation_id;
      if (receivedConversationId !== conversation.id) return;

      // Prevent duplicate processing
      if (processedMessageIdsRef.current.has(messageData.id)) return;
      processedMessageIdsRef.current.add(messageData.id);
      setTimeout(() => processedMessageIdsRef.current.delete(messageData.id), 5000);

      setMessages(prev => {
        // Check for exact ID match
        if (prev.some(msg => msg.id === messageData.id)) {
          processedMessageIdsRef.current.delete(messageData.id);
          return prev;
        }

        // Check for temp message to replace
        const tempIdx = prev.findIndex(msg =>
          msg.id?.startsWith('temp_') &&
          msg.content === messageData.content &&
          msg.sender_id === messageData.sender_id
        );

        if (tempIdx !== -1) {
          const newMessages = [...prev];
          newMessages[tempIdx] = {
            ...messageData,
            conversationId: receivedConversationId
          };
          return newMessages;
        }

        // Add new message to end
        return [...prev, {
          ...messageData,
          conversationId: receivedConversationId,
          message_type: messageData.message_type || 'text',
          created_at: messageData.created_at || new Date().toISOString(),
          sender: messageData.sender || { id: messageData.sender_id }
        }];
      });

      // Persist new message to cache
      appendCachedMessage(conversation.id, {
        ...messageData,
        conversationId: receivedConversationId,
        message_type: messageData.message_type || 'text',
        created_at: messageData.created_at || new Date().toISOString(),
        sender: messageData.sender || { id: messageData.sender_id }
      });

      // Scroll to bottom via Virtuoso
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'auto' });
      });

      // Notify parent and mark as read
      onNewMessageRef.current?.(conversation.id, messageData);
      markMessagesAsReadRef.current(conversation.id);
    };

    const handleUserTyping = (data) => {
      if (data.userId !== currentUser?.id) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return [...prev.filter(u => u.userId !== data.userId), data];
          }
          return prev.filter(u => u.userId !== data.userId);
        });
      }
    };

    const handleMessagesRead = (data) => {
      if (data.userId !== currentUser?.id && (data.conversationId === conversation.id || data.conversation_id === conversation.id)) {
        setOtherParticipantReadAt(data.readAt || data.last_read_at);
      }
    };

    const handleMessageDeleted = (data) => {
      if (data.conversationId === conversation.id || data.conversation_id === conversation.id) {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_joined', () => {});
    socket.on('user_left', () => {});
    socket.on('messages_read', handleMessagesRead);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket, conversation?.id]);

  // Virtuoso handles scroll-to-bottom via followOutput and initialTopMostItemIndex

  // Memoize filtered messages list (excludes video_upload type)
  const filteredMessages = useMemo(
    () => messages.filter(m => m.message_type !== 'video_upload'),
    [messages]
  );


  // Handle typing indicators
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(conversation.id);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      stopTyping(conversation.id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(conversation.id);
      }
    }, 1000);
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Format timestamp for messages
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Get user display name
  const getUserDisplayName = (userId) => {
    if (userId === currentUser?.id) {
      return 'You';
    }
    if (!userId || typeof userId !== 'string') return 'Unknown User';
    
    // If we have the conversation with other_participant_name, use it
    if (conversation?.other_participant_name && userId === conversation.other_participant_id) {
      return conversation.other_participant_name;
    }
    
    return `User ${userId.substring(0, 8)}`;
  };

  // Get participant display name formatted for display
  // For students: "Coach [Prénom]", for coaches: full name
  const getParticipantDisplayName = () => {
    const displayName = participantInfo.name || getUserDisplayName(conversation?.other_participant_id);
    
    // For students, format as "Coach [Prénom]"
    if (currentUser?.role === 'student') {
      // If it looks like an email, return just "Coach"
      if (displayName.includes('@')) {
        return 'Coach';
      }
      // Extract first name (first word) from full name
      const firstName = displayName.split(' ')[0] || displayName;
      return `Coach ${firstName}`;
    }
    
    // For coaches, return full name
    return displayName;
  };

  // Handle reply to message
  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    // Focus on the message input field using ref
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
    }
    }, 0);
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Handle clicking on a reply to navigate to the original message
  const handleReplyClick = useCallback((messageId) => {
    // Find message index in the filtered list
    const filteredMessages = messages.filter(m => m.message_type !== 'video_upload');
    const index = filteredMessages.findIndex(m => m.id === messageId);
    if (index !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 3000);
    } else {
      // Try DOM ref fallback
      const messageElement = messageRefs.current[messageId];
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }
    }
  }, [messages]);

  const handleVideoClick = (videoData) => {
    // Construct video object for the modal
    const videoObj = {
      id: videoData.videoId,
      video_url: videoData.videoUrl,
      video_filename: `video_${videoData.videoId}.mp4`,
      exercise_name: videoData.exerciseName,
      created_at: videoData.videoDate,
      set_number: videoData.setNumber,
      weight: videoData.weight,
      reps: videoData.reps,
      coach_rating: videoData.rating,
      coach_feedback: videoData.feedback,
      coach_feedback_audio_url: videoData.audioUrl,
      status: 'completed', // Assuming feedback exists
      student: {
        id: conversation.other_participant_id, // Assuming other participant is student if current user is coach
        raw_user_meta_data: {
          full_name: conversation.other_participant_name || 'Student'
        }
      }
    };
    
    // If current user is student, we need to adjust the student object
    if (currentUser.role === 'student') {
        videoObj.student = {
            id: currentUser.id,
            raw_user_meta_data: {
                full_name: currentUser.user_metadata?.full_name || currentUser.email
            }
        };
    }

    setSelectedVideo(videoObj);
    setIsVideoModalOpen(true);
  };

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-2xl mb-2">💬</div>
          <div className="text-lg font-medium mb-1">Select a conversation</div>
          <div className="text-sm">Choose a conversation from the list to start chatting</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full md:h-full">
      {/* Chat Header */}
      <div 
        className="pt-2 pb-1 flex-shrink-0"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          background: 'unset',
          paddingLeft: '8px',
          paddingRight: '8px'
        }}
      >
        <div 
          className="flex items-center space-x-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            paddingLeft: '4px',
            paddingRight: '24px',
            paddingTop: '4px',
            paddingBottom: '4px',
            borderRadius: '50px'
          }}
        >
          {/* Back button for mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
            {getParticipantDisplayName().charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="font-normal text-white">
                {getParticipantDisplayName()}
              </div>
              {participantInfo.email && currentUser?.role !== 'student' && (
                <div className="hidden md:block text-sm text-gray-400" style={{ fontWeight: 200 }}>
                  ({participantInfo.email})
                </div>
              )}
            </div>
            <div 
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected 
                  ? 'bg-green-500' 
                  : 'bg-gray-500/40'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Messages Area — Virtuoso */}
      <div className="flex-1 min-h-0" style={{ background: 'unset', backgroundColor: 'unset' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground flex flex-col items-center gap-3 py-8">
              <div
                className="rounded-full border-2 border-transparent animate-spin"
                style={{
                  borderTopColor: '#d4845a',
                  borderRightColor: '#d4845a',
                  width: '32px',
                  height: '32px'
                }}
              />
              <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Chargement des messages...</div>
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                <MessageSquareIcon className="w-8 h-8" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
              </div>
              <div className="text-sm font-extralight" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Aucun message pour le moment</div>
              <div className="text-xs mt-1 font-extralight" style={{ color: 'var(--kaiylo-primary-hex)' }}>Démarrez la conversation !</div>
            </div>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            data={filteredMessages}
            initialTopMostItemIndex={filteredMessages.length - 1}
            followOutput="smooth"
            startReached={handleStartReached}
            overscan={200}
            className="chat-scrollbar"
            style={{ height: '100%' }}
            components={{
              Header: () => (
                <>
                  {loadingMore && (
                    <div className="text-center text-muted-foreground py-4 flex flex-col items-center gap-2">
                      <div
                        className="rounded-full border-2 border-transparent animate-spin"
                        style={{
                          borderTopColor: '#d4845a',
                          borderRightColor: '#d4845a',
                          width: '24px',
                          height: '24px'
                        }}
                      />
                      <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Chargement des messages...</div>
                    </div>
                  )}
                  {!loadingMore && hasMoreMessages && filteredMessages.length > 0 && (
                    <div className="text-center py-2">
                      <button
                        onClick={loadMoreMessages}
                        className="text-sm text-primary hover:text-primary/80 underline"
                      >
                        Load older messages
                      </button>
                    </div>
                  )}
                </>
              ),
              Footer: () => (
                <>
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start p-2">
                      <Card className="max-w-xs">
                        <CardContent className="p-3">
                          <div className="text-sm text-muted-foreground">
                            {typingUsers.length === 1
                              ? `${typingUsers[0].userEmail} is typing...`
                              : `${typingUsers.length} people are typing...`
                            }
                          </div>
                          <div className="flex space-x-1 mt-1">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )
            }}
            itemContent={(index, message) => {
              if (!message || !message.id || (!message.content && message.message_type !== 'video_feedback')) {
                return null;
              }

              const isOwnMessage = message.sender_id === currentUser?.id;
              const isSent = isOwnMessage && !message.id?.startsWith('temp_');
              let isRead = false;
              if (isSent && otherParticipantReadAt && new Date(message.created_at) <= new Date(otherParticipantReadAt)) {
                isRead = true;
              }

              return (
                <div
                  data-message-id={message.id}
                  ref={(el) => { if (el) messageRefs.current[message.id] = el; }}
                  className={`message-container flex w-full px-2 md:px-4 py-1 ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                    highlightedMessageId === message.id ? 'message-highlighted' : ''
                  }`}
                >
                  <div className={`relative group flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                    {message.replyTo && (
                      <div className="mb-1.5" style={{ maxWidth: '75vw', width: 'fit-content' }}>
                        <ReplyMessage
                          replyTo={message.replyTo}
                          isOwnMessage={isOwnMessage}
                          onReplyClick={handleReplyClick}
                        />
                      </div>
                    )}

                    <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 flex items-center gap-1 pointer-events-none ${
                          isOwnMessage ? 'order-2' : 'order-3'
                        }`}
                        style={{ fontSize: "11px", color: 'rgba(255, 255, 255, 0.5)', whiteSpace: 'nowrap' }}
                      >
                        <span>{formatMessageTime(message.created_at)}</span>
                      </div>

                      <div className="relative">
                        {message.message_type === 'video_feedback' || message.message_type === 'video_upload' ? (
                          <VideoFeedbackMessage message={message} isOwnMessage={isOwnMessage} onVideoClick={handleVideoClick} />
                        ) : message.message_type === 'file' || message.message_type === 'audio' ? (
                          <FileMessage message={message} isOwnMessage={isOwnMessage} />
                        ) : (
                          <Card
                            className={`max-w-[75vw] sm:max-w-lg lg:max-w-2xl ${
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground border-primary rounded-[25px] pl-1 pr-1'
                                : 'bg-white/15 text-card-foreground border-0 rounded-[25px] pl-1 pr-1'
                            }`}
                            style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden' }}
                          >
                            <CardContent className="p-3" style={{ padding: "10px", minWidth: 0 }}>
                              <div className="flex items-end gap-1.5" style={{ minWidth: 0 }}>
                                <div
                                  className="text-xs font-normal break-words whitespace-pre-wrap flex-1"
                                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word', overflow: 'hidden', minWidth: 0 }}
                                >
                                  {message.content}
                                </div>
                                {isOwnMessage && isSent && (
                                  <span className="flex-shrink-0 flex items-center" style={{ marginBottom: '2px' }}>
                                    {isRead ? (
                                      <CheckCheck className="w-3 h-3" style={{ color: '#34b7f1' }} />
                                    ) : (
                                      <Check className="w-3 h-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                                    )}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {isOwnMessage && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full flex items-center justify-center flex-shrink-0 border-none outline-none focus:outline-none"
                          onClick={() => handleDeleteMessage(message.id)}
                          title="Supprimer le message"
                          style={{ color: 'rgba(255, 255, 255, 0.5)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--kaiylo-primary-hex)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'; }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                            <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                          </svg>
                        </button>
                      )}

                      {!isOwnMessage && (
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full flex items-center justify-center flex-shrink-0 border-none outline-none focus:outline-none"
                          onClick={() => handleReplyToMessage(message)}
                          title="Reply to this message"
                          style={{ color: 'rgba(255, 255, 255, 0.5)', backgroundColor: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--kaiylo-primary-hex)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'; }}
                        >
                          <ReplyIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* Reply Indicator - Modern style */}
      {replyingTo && (
        <div 
          className="mx-2 md:mx-4 mb-2 relative overflow-hidden transition-opacity duration-200"
          style={{ 
            background: 'linear-gradient(90deg, rgba(212, 132, 90, 0.2) 0%, rgba(212, 132, 90, 0.15) 50%, rgba(212, 132, 90, 0.05) 100%)',
            borderRadius: '8px',
            padding: '8px 12px 8px 28px',
            animation: 'slideDown 0.2s ease-out'
          }}
        >
          {/* Vertical line with spacing */}
          <div
            className="absolute left-2 top-2 bottom-2 transition-opacity duration-200"
            style={{
              width: '2px',
              backgroundColor: 'var(--kaiylo-primary-hex)',
              borderRadius: '5px'
            }}
          />
          
          {/* Reply content with cancel button */}
          <div className="flex items-start justify-between gap-2">
            <div 
              className="text-sm leading-relaxed break-words flex-1 min-w-0"
              style={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '13px',
                lineHeight: '1.4'
              }}
            >
              {replyingTo.message_type === 'file' 
                ? `📎 ${replyingTo.file_name || 'Fichier'}`
                : replyingTo.message_type === 'audio'
                ? `🎤 ${replyingTo.file_name || 'Message vocal'}`
                : replyingTo.content
              }
            </div>
            
            {/* Cancel button */}
            <button
              type="button"
              onClick={cancelReply}
              className="flex-shrink-0 rounded-full transition-all duration-200 flex items-center justify-center group"
              title="Annuler la réponse"
              style={{ 
                color: 'rgba(255, 255, 255, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#d4845a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
              }}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* File Preview */}
      {selectedFile && (
        <div className="px-2 pb-2 md:px-4 md:pb-2">
          <div className="bg-muted rounded-lg p-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            {/* Preview */}
            {filePreview ? (
              <div className="flex-shrink-0 w-16 h-16 rounded overflow-hidden">
                <img 
                  src={filePreview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : selectedFile.type.startsWith('video/') ? (
              <div className="flex-shrink-0 w-16 h-16 rounded bg-white/10 flex items-center justify-center">
                <Video className="w-8 h-8 text-white/70" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-16 h-16 rounded bg-white/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-white/70" />
              </div>
            )}
            
            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-light text-white truncate">
                {selectedFile.name}
              </div>
              <div className="text-xs font-extralight text-white/60">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleCancelFileUpload}
                className="px-4 py-1.5 rounded-full text-sm font-light text-white/70 bg-[rgba(0,0,0,0.5)] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
                title="Annuler"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmFileUpload}
                disabled={uploadingFile}
                className="px-4 py-1.5 rounded-full text-sm font-light text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                title="Envoyer"
              >
                {uploadingFile ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="pt-1 px-2 pb-2 md:px-4 md:pb-2 flex-shrink-0">
          <VoiceRecorder
            onSend={handleVoiceMessageSend}
            onCancel={handleVoiceRecorderCancel}
            conversationId={conversation?.id}
          />
        </div>
      )}

      {/* Message Input */}
      {!showVoiceRecorder && (
        <div className="pt-1 px-2 pb-2 md:px-4 md:pb-4 flex-shrink-0">
          <div className="bg-muted rounded-full flex items-center p-1.5 md:px-2 md:py-[5px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/mov,video/avi,video/quicktime,video/webm"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={sending || uploadingFile}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingFile}
              title="Attach file"
              className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 text-muted-foreground hover:text-foreground rounded-[100px]"
            >
              <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceRecorder(true)}
              disabled={sending || uploadingFile || showVoiceRecorder}
              title="Enregistrer un message vocal"
              className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 text-muted-foreground hover:text-foreground rounded-[100px]"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 384 512" 
                className="h-4 w-4 md:h-5 md:w-5" 
                style={{ fill: 'var(--kaiylo-primary-hex)', color: 'var(--kaiylo-primary-hex)' }}
              >
                <path d="M192 0C139 0 96 43 96 96l0 128c0 53 43 96 96 96s96-43 96-96l0-128c0-53-43-96-96-96zM48 184c0-13.3-10.7-24-24-24S0 170.7 0 184l0 40c0 97.9 73.3 178.7 168 190.5l0 49.5-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-49.5c94.7-11.8 168-92.6 168-190.5l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 79.5-64.5 144-144 144S48 303.5 48 224l0-40z"/>
              </svg>
            </Button>
            <form onSubmit={sendMessage} className="flex-1 flex items-center">
              <Input
                ref={messageInputRef}
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Tapez un message ici..."
                className="flex-1 text-xs md:text-sm border-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground rounded-none ml-2 mr-2 md:ml-3 md:mr-3 pl-3 pr-3 md:pl-0 md:pr-0 font-normal text-white"
                style={{ 
                  borderStyle: 'none',
                  borderWidth: '0px',
                  borderColor: 'rgba(0, 0, 0, 0)',
                  borderImage: 'none',
                  backgroundColor: 'unset',
                  background: 'unset',
                  fontWeight: currentUser?.role === 'student' ? 400 : undefined
                }}
                disabled={sending || uploadingFile}
              />
              <Button
                type="submit"
                disabled={!newMessage.trim() || sending || uploadingFile}
                size="icon"
                className="flex-shrink-0 bg-transparent rounded-full w-8 h-8 md:w-10 md:h-10 disabled:opacity-100 disabled:text-white/50"
                style={{
                  backgroundColor: 'unset',
                  background: 'unset'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-4 w-4 md:h-5 md:w-5" style={{ fill: 'var(--kaiylo-primary-hex)', color: 'var(--kaiylo-primary-hex)' }}>
                  <path d="M536.4-26.3c9.8-3.5 20.6-1 28 6.3s9.8 18.2 6.3 28l-178 496.9c-5 13.9-18.1 23.1-32.8 23.1-14.2 0-27-8.6-32.3-21.7l-64.2-158c-4.5-11-2.5-23.6 5.2-32.6l94.5-112.4c5.1-6.1 4.7-15-.9-20.6s-14.6-6-20.6-.9L229.2 276.1c-9.1 7.6-21.6 9.6-32.6 5.2L38.1 216.8c-13.1-5.3-21.7-18.1-21.7-32.3 0-14.7 9.2-27.8 23.1-32.8l496.9-178z"/>
                </svg>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      <DeleteMessageModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMessageToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      {/* Video Detail Modal */}
      {currentUser?.role === 'coach' ? (
        <VideoDetailModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          video={selectedVideo}
          videoType="student"
          isCoachView={true}
          onFeedbackUpdate={() => {
             // Optional: refresh messages or update local state if feedback changes
             // For now, simple close is enough as feedback is usually final in chat history context
             // but if editable, we might want to update the message content locally
          }}
        />
      ) : (
        <StudentVideoDetailModal
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          video={selectedVideo}
        />
      )}
    </div>
  );
};

export default ChatWindow;
