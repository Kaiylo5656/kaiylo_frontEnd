import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import FileUpload from './FileUpload';
import FileMessage from './FileMessage';
import ReplyMessage from './ReplyMessage';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { buildApiUrl } from '../config/api';

const ChatWindow = ({ conversation, currentUser, onNewMessage, onMessageSent }) => {
  const { getAuthToken } = useAuth();
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage: sendSocketMessage, startTyping, stopTyping, markMessagesAsRead } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState('good');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageRefs = useRef({});

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages for the conversation
  const fetchMessages = async () => {
    if (!conversation?.id) return;

    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await fetch(buildApiUrl(`/api/chat/conversations/${conversation.id}/messages`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.data || []);
      // Clear old message refs when fetching new messages
      messageRefs.current = {};
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    const replyToMessageId = replyingTo?.id || null;
    
    // Clear input and reply state immediately for better UX
    setNewMessage('');
    setReplyingTo(null);
    setSending(true);

    try {
      // Stop typing indicator
      stopTyping(conversation.id);
      setIsTyping(false);

      // Send via WebSocket if connected, otherwise fallback to HTTP
      if (isConnected && socket) {
        console.log('🔌 Sending message via WebSocket');
        sendSocketMessage(conversation.id, messageContent, 'text', replyToMessageId);
        
        // Create optimistic message for immediate UI update
        const optimisticMessage = {
          id: `temp_${Date.now()}`,
          content: messageContent,
          sender_id: currentUser.id,
          message_type: 'text',
          reply_to_message_id: replyToMessageId,
          created_at: new Date().toISOString(),
          conversationId: conversation.id,
          sender: {
            id: currentUser.id,
            email: currentUser.email
          }
        };

        // Add reply information if this is a reply
        if (replyToMessageId && replyingTo) {
          optimisticMessage.replyTo = {
            id: replyingTo.id,
            content: replyingTo.content,
            sender_id: replyingTo.sender_id,
            message_type: replyingTo.message_type,
            file_name: replyingTo.file_name
          };
        }
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Notify parent component
        if (onMessageSent) {
          onMessageSent(conversation.id, optimisticMessage);
        }
      } else {
        console.log('🔌 WebSocket not connected, using HTTP fallback');
        
        // Fallback to HTTP API
        const token = await getAuthToken();
        const response = await fetch(buildApiUrl('/api/chat/messages'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            content: messageContent
          })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const data = await response.json();
        const sentMessage = data.data;
        
        // Add message to local state
        setMessages(prev => [...prev, sentMessage]);
        
        // Notify parent component
        if (onMessageSent) {
          onMessageSent(conversation.id, sentMessage);
        }
      }
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      // Restore message content on error
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!conversation?.id || uploadingFile) return;

    setUploadingFile(true);
    setShowFileUpload(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversation.id);
      formData.append('content', ''); // Optional caption

      const token = await getAuthToken();
      const response = await fetch(buildApiUrl('/api/chat/messages'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ File uploaded successfully:', result);
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Handle WebSocket events
  useEffect(() => {
    if (!socket || !conversation?.id) return;

    // Join conversation room
    joinConversation(conversation.id);

    // Listen for new messages
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
        
        // Add new message if no duplicate found
        return [...prev, messageData];
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

    // Listen for typing indicators
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

    // Cleanup function
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_joined', handleUserJoined);
      socket.off('user_left', handleUserLeft);
      socket.off('messages_read', handleMessagesRead);
      
      // Leave conversation room
      leaveConversation(conversation.id);
    };
  }, [socket, conversation?.id, currentUser?.id, joinConversation, leaveConversation, onNewMessage, markMessagesAsRead]);

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [conversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="h-full flex flex-col">
      {/* Chat Header - Hidden on mobile (shown in page header) */}
      <div className="hidden md:block p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {getUserDisplayName(conversation.other_participant_id).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {getUserDisplayName(conversation.other_participant_id)}
            </div>
            <div className="text-sm text-gray-500">
              {isConnected ? (
                <span className="flex items-center space-x-1">
                  <span>🟢 Online</span>
                  <span className={`text-xs ${
                    connectionQuality === 'good' ? 'text-green-600' : 
                    connectionQuality === 'slow' ? 'text-yellow-600' : 'text-red-600'
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
      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4 bg-gray-50">
        {loading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500">
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
        
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload */}
      {showFileUpload && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
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
        <div className="p-2 md:p-4 border-t border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600">↩️ Replying to:</span>
              <div className="text-sm text-gray-700 max-w-xs truncate">
                {replyingTo.message_type === 'file' 
                  ? `📎 ${replyingTo.file_name || 'File'}`
                  : replyingTo.content
                }
              </div>
            </div>
            <button
              type="button"
              onClick={cancelReply}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-2 md:p-4 border-t border-gray-200 bg-white">
        <form onSubmit={sendMessage} className="flex space-x-1 md:space-x-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={sending || uploadingFile}
            title="Attach file"
            className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
          >
            📎
          </Button>
          <Input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 text-sm md:text-base"
            disabled={sending || uploadingFile}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending || uploadingFile}
            className="px-3 md:px-4 text-sm md:text-base flex-shrink-0"
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
