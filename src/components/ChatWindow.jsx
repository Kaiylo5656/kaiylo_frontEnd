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
  const messageStartRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});
  const messagesContainerRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
        // When loading more, append older messages to the end of the array
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        // Initial load
        setMessages(newMessages);
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
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // In a flex-col-reverse layout, the "top" is at the maximum scroll position.
    // We load more when the user scrolls near the visual top of the message list.
    const isAtTop = scrollHeight + scrollTop - clientHeight < 100;

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
      
      console.log('✅ File uploaded successfully:', await response.json());
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
      
      setTimeout(scrollToBottom, 100);
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
    stopTyping, onMessageSent, getAuthToken, scrollToBottom
  ]);

  useEffect(() => {
    if (conversation?.id) {
      // Reset state when conversation changes
      setMessages([]);
      setNextCursor(null);
      setHasMoreMessages(true);
      setIsInitialLoad(true); // Reset initial load flag for the new conversation
      
      fetchMessages(); // Initial load (no cursor)
      markMessagesAsRead(conversation.id);
      joinConversation(conversation.id);
    }

    return () => {
      if (conversation?.id) {
        leaveConversation(conversation.id);
      }
    };
  }, [conversation?.id, fetchMessages, markMessagesAsRead, joinConversation, leaveConversation]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (messageData) => {
        const receiveTime = Date.now();
        console.log('🔌 Received new message via WebSocket:', messageData);
        
        // Check if message already exists to prevent duplicates
        setMessages(prev => {
          // Check for exact ID match first
          const exactMatch = prev.find(msg => msg.id === messageData.id);
          if (exactMatch) {
            console.log('🔌 Message with exact ID already exists, skipping duplicate');
            return prev;
          }
          
          // Check for temporary message that should be replaced
          const tempMessageIndex = prev.findIndex(msg => 
            msg.id?.startsWith('temp_') && 
            msg.content === messageData.content && 
            msg.sender_id === messageData.sender_id
          );
          
          if (tempMessageIndex !== -1) {
            console.log('🔌 Replacing temporary message with real message');
            const newMessages = [...prev];
            newMessages[tempMessageIndex] = messageData;
            return newMessages;
          }
          
          // Add new message to the beginning of the array so it appears at the bottom
          return [messageData, ...prev];
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

      // Register event listeners
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

  // Scroll to bottom only when new messages arrive (not when loading more or on initial load)
  useEffect(() => {
    if (!isInitialLoad && !loadingMore && !loading) {
      // Only scroll to bottom if we're near the bottom (within 100px)
      const container = messagesContainerRef.current;
      if (container) {
        // In flex-col-reverse, scrollTop near 0 means we are at the bottom.
        if (container.scrollTop < 100) {
          scrollToBottom();
        }
      }
    }
  }, [messages.length, scrollToBottom, isInitialLoad, loadingMore, loading]);

  // Scroll to bottom after initial load completes
  useEffect(() => {
    if (!loading && !isInitialLoad) {
      // After the very first fetch, scroll to the bottom (which is scrollTop = 0).
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = 0;
        }
      }, 50);
    }
  }, [loading, isInitialLoad]);

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
    <div className="h-full flex flex-col bg-background md:h-full h-[calc(100vh-4rem)]">
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
        className="chat-scrollbar flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4 bg-background flex flex-col-reverse"
        onScroll={handleScroll}
      >
        {/* The ref is now at the top for loading more, but visually it's the end of the list */}
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
          messages.map((message) => (
            <div
              key={message.id}
              ref={(el) => {
                if (el) {
                  messageRefs.current[message.id] = el;
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
          ))
        )}
        
        {/* Load more messages button/indicator is now at the bottom of the container, which is visually the top */}
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
