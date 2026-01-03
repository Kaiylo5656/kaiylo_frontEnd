import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import FileMessage from './FileMessage';
import ReplyMessage from './ReplyMessage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { buildApiUrl } from '../config/api';
import { Paperclip, Send, ChevronLeft, Check, CheckCheck, Image as ImageIcon, Video } from 'lucide-react';
import DeleteMessageModal from './DeleteMessageModal';

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
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});
  const messagesContainerRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set()); // Persist processed message IDs across renders
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);


  const fetchMessages = useCallback(async (cursor = null) => {
    if (!conversation?.id) return;

    try {
      if (cursor) {
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
      const { messages: newMessages, nextCursor: newNextCursor } = data.data || { messages: [], nextCursor: null };
      
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
        
        // CRITICAL: Scroll to bottom after initial load to show newest messages
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            if (container && newMessages.length > 0) {
              container.scrollTop = container.scrollHeight;
              console.log('✅ Scrolled to bottom after initial load');
            }
          });
        });
      }
      
      setNextCursor(newNextCursor);
      setHasMoreMessages(!!newNextCursor);
      
      // Clear old message refs when fetching new messages
      messageRefs.current = {};
    } catch (error) {
      console.error('Error fetching messages:', error);
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

  // Handle scroll events for infinite loading
  const handleScroll = useCallback((e) => {
    const container = e.target;
    let { scrollTop, scrollHeight, clientHeight } = container;
    
    // In a normal flex column layout:
    // - scrollTop = 0 shows oldest messages (top)
    // - scrollTop = max shows newest messages (bottom)
    // We load more when the user scrolls near scrollTop = 0 (top, oldest messages)
    const isAtTop = scrollTop < 100; // Near scrollTop = 0 means at top (oldest messages)

    if (isAtTop && hasMoreMessages && !loadingMore) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, loadingMore, loadMoreMessages]);

  const handleFileUpload = useCallback(async (file) => {
    if (!conversation?.id || uploadingFile) return;

    setUploadingFile(true);

    try {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('✅ File uploaded successfully:', responseData);
      
      // Add the file message to the messages list if returned
      if (responseData.data) {
        setMessages(prev => [...prev, responseData.data]);
      }
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert('Failed to upload file. Please try again.');
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
      
      console.log('✅ Message deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      alert('Erreur lors de la suppression du message. Veuillez réessayer.');
    } finally {
      setDeleting(false);
    }
  }, [messageToDelete, conversation?.id, getAuthToken]);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    // Debug logging (reduced)
    console.log('🔍 sendMessage called for conversation:', conversation?.id);

    // Check if conversation has valid ID
    if (!conversation || !conversation.id) {
      console.error('❌ No valid conversation or conversation ID found:', conversation);
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
        console.log('📡 Using WebSocket to send message');
        sendSocketMessage(conversation.id, messageContent, 'text', replyToMessageId);
        
        const optimisticMessage = {
          id: `temp_${Date.now()}`,
          content: messageContent,
          sender_id: currentUser.id,
          message_type: 'text',
          reply_to_message_id: replyToMessageId,
          created_at: new Date().toISOString(),
          conversationId: conversation.id,
          sender: { id: currentUser.id, email: currentUser.email },
          replyTo: replyingTo ? { ...replyingTo } : null
        };
        
        // Messages are in normal flex column - newest at bottom
        // So we add optimistic message to END of array so it appears at bottom (newest position)
        setMessages(prev => [...prev, optimisticMessage]);
        
        if (onMessageSent) {
          onMessageSent(conversation.id, optimisticMessage);
        }
      } else {
        // Fallback to HTTP
        console.log('🌐 Using HTTP fallback to send message');
        const token = await getAuthToken();
        
        const requestBody = {
          conversationId: conversation.id,
          content: messageContent,
          replyToMessageId: replyToMessageId
        };
        
        console.log('📤 Sending HTTP request with body:', requestBody);
        
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
          console.error('❌ HTTP response error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('✅ HTTP message sent successfully:', responseData);
        
        if (onMessageSent) {
          onMessageSent(conversation.id, responseData.data);
        }
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
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
      setIsInitialLoad(true); // Reset initial load flag for the new conversation
      
      // Clear processed message IDs when switching conversations
      processedMessageIdsRef.current.clear();
      
      fetchMessages(); // Initial load (no cursor)
      markMessagesAsRead(conversation.id);
      joinConversation(conversation.id);
      
      console.log('✅ Joined conversation room:', conversation.id);
    }

    return () => {
      if (conversation?.id && socket && isConnected) {
        leaveConversation(conversation.id);
        console.log('✅ Left conversation room:', conversation.id);
      }
    }; // Only re-run this effect if the conversation, socket, or connection status changes
  }, [conversation?.id, socket, isConnected]);

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
          const users = data.data || [];
          
          // Find the user matching the participant ID
          const participant = users.find(user => user.id === conversation.other_participant_id);
          
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
        console.error('Error fetching participant info:', error);
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
    if (socket) {
      const handleNewMessage = (messageData) => {
        const receiveTime = Date.now();
        console.log('🔌 [WS IN] new_message received:', messageData);
        console.log('🔌 Message details:', {
          id: messageData.id,
          content: messageData.content,
          conversationId: messageData.conversationId || messageData.conversation_id,
          senderId: messageData.sender_id,
          currentConversationId: conversation?.id
        });
        
        // CRITICAL FIX: Only process messages for the current conversation
        // This ensures real-time messages only appear in the correct chat window
        const receivedConversationId = messageData.conversationId || messageData.conversation_id;
        if (!conversation?.id || receivedConversationId !== conversation.id) {
          console.log('🔌 Ignoring message - not for current conversation:', {
            receivedConversationId,
            currentConversationId: conversation?.id,
            messageId: messageData.id
          });
          return; // Exit early - message is for a different conversation
        }
        
        // CRITICAL FIX: Prevent race conditions from multiple WebSocket events
        // Use ref to persist across renders
        if (processedMessageIdsRef.current.has(messageData.id)) {
          console.log('🔌 Message already being processed, skipping duplicate event:', messageData.id);
          return;
        }
        processedMessageIdsRef.current.add(messageData.id);
        
        // Clean up processed IDs after 5 seconds to prevent memory leaks
        setTimeout(() => {
          processedMessageIdsRef.current.delete(messageData.id);
        }, 5000);
        
        console.log('✅ Message is for current conversation, processing...');
        
        // CRITICAL: Use functional update to get the latest state
        // This ensures we always work with the most recent messages array
        setMessages(prev => {
          // Create a new array reference to ensure React detects the change
          const currentMessages = [...prev];
          const prevLength = currentMessages.length;
          console.log('🔌 Current messages array length:', prevLength);
          console.log('🔌 Checking for existing message with ID:', messageData.id);
          
          // Check for exact ID match first
          const exactMatch = currentMessages.findIndex(msg => msg.id === messageData.id);
          if (exactMatch !== -1) {
            console.log('🔌 Message with exact ID already exists at index:', exactMatch, 'skipping duplicate');
            // Remove from processed set since we didn't actually process it
            processedMessageIdsRef.current.delete(messageData.id);
            // Return the same array reference for duplicates to prevent unnecessary re-renders
            return prev; // Return prev to prevent unnecessary re-render
          }
          
          // Check for temporary message that should be replaced
          // Temp messages are at the END of array (newest position)
          const tempMessageIndex = currentMessages.findIndex(msg => 
            msg.id?.startsWith('temp_') && 
            msg.content === messageData.content && 
            msg.sender_id === messageData.sender_id &&
            (msg.conversationId === conversation.id || msg.conversation_id === conversation.id)
          );
          
          if (tempMessageIndex !== -1) {
            console.log('🔌 Found temp message to replace at index:', tempMessageIndex);
            
            // Create a new array with the replacement
            const newMessages = [...currentMessages];
            newMessages[tempMessageIndex] = {
              ...messageData,
              conversationId: messageData.conversationId || messageData.conversation_id || conversation.id
            };
            
            console.log('✅ Message replaced successfully, new message ID:', messageData.id);
            
            return newMessages;
          }
          
          // Add new message to the END of the array (so it appears at bottom)
          console.log('🔌 No temp message found, adding new message to end of array');
          
          // Create a properly structured message object
          const newMessageObj = {
            ...messageData,
            conversationId: messageData.conversationId || messageData.conversation_id || conversation.id,
            id: messageData.id,
            content: messageData.content,
            sender_id: messageData.sender_id,
            message_type: messageData.message_type || 'text',
            created_at: messageData.created_at || new Date().toISOString(),
            sender: messageData.sender || { id: messageData.sender_id }
          };
          
          const newMessages = [...currentMessages, newMessageObj];
          console.log('✅ New message added, total messages:', newMessages.length);
          
          return newMessages;
        });
        
        // CRITICAL: Scroll to newest message after state update
        // Use multiple requestAnimationFrame calls to ensure DOM is updated after React re-render
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // First try to scroll to the message element directly
            const messageElement = messageRefs.current[messageData.id];
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'auto', block: 'end' });
              console.log('✅ Scrolled to message element using scrollIntoView');
            } else {
              // Fallback: scroll container to bottom (scrollTop = max shows newest messages)
              const container = messagesContainerRef.current;
              if (container) {
                container.scrollTop = container.scrollHeight;
                console.log('✅ Scrolled container to bottom (scrollTop=max)');
              }
            }
          });
        });
        
        // Notify parent component
        if (onNewMessage) {
          onNewMessage(conversation.id, messageData);
        }
        
        // Mark messages as read if this is the current conversation
        markMessagesAsRead(conversation.id);
        
        // Log processing time
        const processingTime = Date.now() - receiveTime;
        console.log(`⚡ Message processed in ${processingTime}ms`);
      };

      const handleUserTyping = (data) => {
        if (data.userId !== currentUser?.id) {
          setTypingUsers(prev => {
            if (data.isTyping) {
              return [...prev.filter(u => u.userId !== data.userId), data];
            } else {
              return prev.filter(u => u.userId !== data.userId);
            }
          });
        }
      };

      // Listen for user join/leave events
      const handleUserJoined = (data) => {
        console.log('🔌 User joined conversation:', data);
      };

      const handleUserLeft = (data) => {
        console.log('🔌 User left conversation:', data);
      };

      // Listen for messages read events
      const handleMessagesRead = (data) => {
        console.log('🔌 Messages marked as read by:', data);
      };

      // Register event listeners - ensure we only register once
      // Remove any existing listeners first to prevent duplicates
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('messages_read', handleMessagesRead);
      
      // Now register the listeners
      socket.on('new_message', handleNewMessage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_joined', handleUserJoined);
      socket.on('user_left', handleUserLeft);
      socket.on('messages_read', handleMessagesRead);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_joined', handleUserJoined);
        socket.off('user_left', handleUserLeft);
        socket.off('messages_read', handleMessagesRead);
      };
    }
  }, [socket, conversation?.id, currentUser?.id, onNewMessage, markMessagesAsRead]);

  // Scroll to bottom when new messages arrive (not when loading more or on initial load)
  // NOTE: This only handles length changes. Real-time messages handle their own scrolling in handleNewMessage
  useEffect(() => {
    if (!isInitialLoad && !loadingMore && !loading && messages.length > 0) {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          // Only scroll if user is near bottom (within 100px) to avoid interrupting scroll up
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
          if (isNearBottom) {
            container.scrollTop = container.scrollHeight;
          }
        }
      });
    }
  }, [messages.length, isInitialLoad, loadingMore, loading]);


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
  const handleReplyClick = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      // Scroll to the message
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Highlight the message temporarily
      setHighlightedMessageId(messageId);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    } else {
      console.warn(`Message with ID ${messageId} not found in current view`);
      // If message is not in current view, we might need to load more messages
      // For now, just show a notification
      console.log('Message not found in current view. Try scrolling up to load more messages.');
      
      // You could implement a toast notification here instead of console.log
      // For now, we'll just log it to avoid interrupting the user experience
    }
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
        className="pt-3 pb-1 flex-shrink-0"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          background: 'unset'
        }}
      >
        <div 
          className="flex items-center space-x-2"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            paddingLeft: '4px',
            paddingRight: '24px',
            paddingTop: '7px',
            paddingBottom: '7px',
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
            {(participantInfo.name || getUserDisplayName(conversation.other_participant_id)).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="font-normal text-white">
                {participantInfo.name || getUserDisplayName(conversation.other_participant_id)}
              </div>
              {participantInfo.email && (
                <div className="text-sm text-gray-400" style={{ fontWeight: 200 }}>
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

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="chat-scrollbar flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-2"
        onScroll={handleScroll}
        style={{ 
          scrollBehavior: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: 'unset',
          backgroundColor: 'unset'
        }}
      >
        {/* Load more messages indicator/button at the TOP (where older messages load) */}
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
        
        {!loadingMore && hasMoreMessages && messages.length > 0 && (
          <div className="text-center py-2">
            <button
              onClick={loadMoreMessages}
              className="text-sm text-primary hover:text-primary/80 underline"
            >
              Load older messages
            </button>
          </div>
        )}

        {/* The ref is at the top for loading more messages when scrolling up */}
        <div ref={messageEndRef} />

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
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
        
        {loading ? (
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
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
              <MessageSquareIcon className="w-8 h-8" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
            </div>
            <div className="text-sm font-extralight" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Aucun message pour le moment</div>
            <div className="text-xs mt-1 font-extralight" style={{ color: 'var(--kaiylo-primary-hex)' }}>Démarrez la conversation !</div>
          </div>
        ) : (
          messages.map((message, index) => {
            // Debug logging for message rendering
            if (message.id?.startsWith('temp_')) {
              console.log('🔍 Rendering temp message:', message.id, 'at index:', index);
            }
            
            // Log all message IDs being rendered for debugging
            if (index === messages.length - 1 || index === messages.length - 2) {
              console.log('🔍 Rendering message at index:', index, 'ID:', message.id, 'Content:', message.content?.substring(0, 20), 'Sender:', message.sender_id, 'IsOwn:', message.sender_id === currentUser?.id);
            }
            
            // CRITICAL DEBUG: Check if message is valid before rendering
            if (!message || !message.id || !message.content) {
              console.error('❌ Invalid message at index:', index, message);
              return null;
            }
            
            // Determine if this is the current user's message - all user messages are aligned to the right
            const isOwnMessage = message.sender_id === currentUser?.id;
            
            // Determine message status (sent/read) for own messages
            const isSent = isOwnMessage && !message.id?.startsWith('temp_');
            // Check if message is read - consider it read if it's not the last message in the conversation
            // (meaning there are newer messages, so it's likely been seen)
            const isRead = isSent && index < messages.length - 1;
            
            return (
            <div
              key={message.id}
              data-message-id={message.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current[message.id] = el;
                  // Debug: Log when message element is actually in DOM
                  if (index === messages.length - 1) {
                    console.log('🔍 Last message element mounted in DOM:', {
                      messageId: message.id,
                      content: message.content?.substring(0, 20),
                      isVisible: el.offsetParent !== null,
                      offsetHeight: el.offsetHeight,
                      offsetTop: el.offsetTop
                    });
                  }
                }
              }}
              className={`message-container flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                highlightedMessageId === message.id ? 'message-highlighted' : ''
              }`}
            >
              <div className={`relative group flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                {/* Reply indicator - au-dessus du message */}
                {message.replyTo && (
                  <div className="mb-1.5" style={{ 
                    maxWidth: '75vw',
                    width: 'fit-content'
                  }}>
                    <ReplyMessage 
                      replyTo={message.replyTo} 
                      isOwnMessage={isOwnMessage}
                      onReplyClick={handleReplyClick}
                    />
                  </div>
                )}
                
                {/* Message container avec bouton reply */}
                <div className={`flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                  {/* Timestamp - visible au hover, à gauche pour nos messages, à droite pour les autres */}
                  <div 
                    className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 flex items-center gap-1 pointer-events-none ${
                      isOwnMessage ? 'order-2' : 'order-3'
                    }`}
                    style={{ 
                      fontSize: "11px",
                      color: 'rgba(255, 255, 255, 0.5)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{formatMessageTime(message.created_at)}</span>
                  </div>
                  
                  <div className="relative">
                    {message.message_type === 'file' ? (
                      <FileMessage 
                        message={message} 
                        isOwnMessage={isOwnMessage}
                      />
                    ) : (
                      <Card
                        className={`max-w-[75vw] sm:max-w-lg lg:max-w-2xl ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground border-primary rounded-full pl-1 pr-1'
                            : 'bg-white/15 text-card-foreground border-0 rounded-full pl-1 pr-1'
                        }`}
                      >
                        <CardContent className="p-3" style={{ padding: "10px" }}>
                          <div className="flex items-end gap-1.5">
                            <div className="text-xs font-light break-words whitespace-pre-wrap flex-1">{message.content}</div>
                            {isOwnMessage && isSent && (
                              <span className="flex-shrink-0 flex items-center" style={{ marginBottom: '2px' }}>
                                {isRead ? (
                                  <CheckCheck className="w-3 h-3" style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
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
                  
                  {/* Delete button - only show for own messages, appears on hover */}
                  {isOwnMessage && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full flex items-center justify-center flex-shrink-0 border-none outline-none focus:outline-none"
                      onClick={() => handleDeleteMessage(message.id)}
                      title="Supprimer le message"
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--kaiylo-primary-hex)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5">
                        <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                      </svg>
                    </button>
                  )}
                  
                  {/* Reply button - only show for other users' messages, appears on hover on the right side */}
                  {!isOwnMessage && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-full flex items-center justify-center flex-shrink-0 border-none outline-none focus:outline-none"
                      onClick={() => handleReplyToMessage(message)}
                      title="Reply to this message"
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--kaiylo-primary-hex)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                      }}
                    >
                      <ReplyIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })
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

      {/* Message Input */}
      <div className="pt-0 px-2 pb-2 md:px-4 md:pb-4">
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
          <form onSubmit={sendMessage} className="flex-1 flex items-center">
            <Input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Tapez un message ici..."
              className="flex-1 text-xs md:text-sm border-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none placeholder:text-muted-foreground rounded-none ml-2 mr-2 md:ml-3 md:mr-3 pl-3 pr-3 md:pl-0 md:pr-0 font-light text-white"
              style={{ 
                borderStyle: 'none',
                borderWidth: '0px',
                borderColor: 'rgba(0, 0, 0, 0)',
                borderImage: 'none',
                backgroundColor: 'unset',
                background: 'unset'
              }}
              disabled={sending || uploadingFile}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending || uploadingFile}
              size="icon"
              className="flex-shrink-0 bg-transparent rounded-full w-8 h-8 md:w-10 md:h-10 disabled:opacity-100 text-[var(--kaiylo-primary-hex)] disabled:text-white/50"
              style={{
                backgroundColor: 'unset',
                background: 'unset'
              }}
            >
              <Send className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </form>
        </div>
      </div>

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
    </div>
  );
};

export default ChatWindow;
