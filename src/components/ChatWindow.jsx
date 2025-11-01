import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import FileUpload from './FileUpload';
import FileMessage from './FileMessage';
import ReplyMessage from './ReplyMessage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { buildApiUrl } from '../config/api';
import { Paperclip, Send, ChevronLeft } from 'lucide-react';

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
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const [nextCursor, setNextCursor] = useState(null); // New state for pagination cursor
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});
  const messagesContainerRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set()); // Persist processed message IDs across renders


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
    setShowFileUpload(false);

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
    // Focus on the input field
    const inputElement = document.querySelector('input[type="text"]');
    if (inputElement) {
      inputElement.focus();
    }
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
    <div className="flex flex-col bg-background h-full md:h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center space-x-3">
          {/* Back button for mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
            {getUserDisplayName(conversation.other_participant_id).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-foreground">
              {getUserDisplayName(conversation.other_participant_id)}
            </div>
            <div className="text-sm text-muted-foreground">
              {isConnected ? (
                <span className="flex items-center space-x-1">
                  <span>🟢 Online</span>
                  <span className={`text-xs ${
                    connectionQuality === 'good' ? 'text-green-500' : 
                    connectionQuality === 'slow' ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    ({connectionQuality})
                  </span>
                </span>
              ) : (
                '🔴 Offline'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="chat-scrollbar flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4 bg-background"
        onScroll={handleScroll}
        style={{ 
          scrollBehavior: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Load more messages indicator/button at the TOP (where older messages load) */}
        {loadingMore && (
          <div className="text-center text-muted-foreground py-2">
            <div className="text-sm">Loading more messages...</div>
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
          <div className="text-center text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm">No messages yet</div>
            <div className="text-xs mt-1">Start the conversation!</div>
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
              className={`message-container flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'} ${
                highlightedMessageId === message.id ? 'message-highlighted' : ''
              }`}
            >
              <div className="relative group">
                {/* Reply indicator */}
                {message.replyTo && (
                  <ReplyMessage 
                    replyTo={message.replyTo} 
                    isOwnMessage={message.sender_id === currentUser?.id}
                    onReplyClick={handleReplyClick}
                  />
                )}
                
                {message.message_type === 'file' ? (
                  <FileMessage 
                    message={message} 
                    isOwnMessage={message.sender_id === currentUser?.id}
                  />
                ) : (
                  <Card
                    className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${
                      message.sender_id === currentUser?.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-card-foreground'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="text-sm">{message.content}</div>
                      <div
                        className={`text-xs mt-1 ${
                          message.sender_id === currentUser?.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Reply button - only show for other users' messages */}
                {message.sender_id !== currentUser?.id && (
                  <button
                    className="reply-button"
                    onClick={() => handleReplyToMessage(message)}
                    title="Reply to this message"
                  >
                    ↩️ Reply
                  </button>
                )}
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* File Upload */}
      {showFileUpload && (
        <div className="p-4 border-t border-border bg-card">
          <FileUpload
            onFileSelect={(file) => console.log('File selected:', file)}
            onUpload={handleFileUpload}
            isUploading={uploadingFile}
            disabled={sending || uploadingFile}
          />
        </div>
      )}

      {/* Reply Indicator */}
      {replyingTo && (
        <div className="p-2 md:p-4 border-t border-border bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-primary">↩️ Replying to:</span>
              <div className="text-sm text-foreground max-w-xs truncate">
                {replyingTo.message_type === 'file' 
                  ? `📎 ${replyingTo.file_name || 'File'}`
                  : replyingTo.content
                }
              </div>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="text-primary hover:text-primary/80 text-sm"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-2 md:p-4 border-t border-border bg-card">
        <div className="bg-muted rounded-full flex items-center p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={sending || uploadingFile}
            title="Attach file"
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <form onSubmit={sendMessage} className="flex-1 flex items-center">
            <Input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder="Type a message here..."
              className="flex-1 text-sm md:text-base bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground"
              disabled={sending || uploadingFile}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sending || uploadingFile}
              size="icon"
              className="px-3 md:px-4 text-sm md:text-base flex-shrink-0 bg-primary rounded-full w-10 h-10 hover:bg-primary/90"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
