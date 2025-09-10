import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';

const ChatWindow = ({ conversation, currentUser, onNewMessage, onMessageSent }) => {
  const { getAuthToken } = useAuth();
  const { socket, isConnected, joinConversation, leaveConversation, sendMessage: sendSocketMessage, startTyping, stopTyping, markMessagesAsRead } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      const response = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
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
    setNewMessage('');
    setSending(true);

    try {
      // Stop typing indicator
      stopTyping(conversation.id);
      setIsTyping(false);

      // Send via WebSocket if connected, otherwise fallback to HTTP
      if (isConnected && socket) {
        console.log('🔌 Sending message via WebSocket');
        sendSocketMessage(conversation.id, messageContent);
        
        // Create optimistic message for immediate UI update
        const optimisticMessage = {
          id: `temp_${Date.now()}`,
          content: messageContent,
          sender_id: currentUser.id,
          message_type: 'text',
          created_at: new Date().toISOString(),
          conversationId: conversation.id,
          sender: {
            id: currentUser.id,
            email: currentUser.email
          }
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Notify parent component
        if (onMessageSent) {
          onMessageSent(conversation.id, optimisticMessage);
        }
      } else {
        console.log('🔌 WebSocket not connected, using HTTP fallback');
        
        // Fallback to HTTP API
        const token = await getAuthToken();
        const response = await fetch('/api/chat/messages', {
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

  // Handle WebSocket events
  useEffect(() => {
    if (!socket || !conversation?.id) return;

    // Join conversation room
    joinConversation(conversation.id);

    // Listen for new messages
    const handleNewMessage = (messageData) => {
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
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {getUserDisplayName(conversation.other_participant_id).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {getUserDisplayName(conversation.other_participant_id)}
            </div>
            <div className="text-sm text-gray-500">Online</div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
              className={`flex ${message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_id === currentUser?.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <div className="text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.sender_id === currentUser?.id
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {formatMessageTime(message.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 max-w-xs">
              <div className="text-sm text-gray-600">
                {typingUsers.length === 1 
                  ? `${typingUsers[0].userEmail} is typing...`
                  : `${typingUsers.length} people are typing...`
                }
              </div>
              <div className="flex space-x-1 mt-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
