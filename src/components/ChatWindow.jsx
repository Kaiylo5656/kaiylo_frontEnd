import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ChatWindow = ({ conversation, currentUser, onNewMessage, onMessageSent }) => {
  const { getAuthToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

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

    try {
      setSending(true);
      const token = await getAuthToken();
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: newMessage.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const sentMessage = data.data;
      
      // Add message to local state
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      // Notify parent component
      onMessageSent(conversation.id, sentMessage);
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!conversation?.id) return;

    // For now, we'll use polling for real-time updates
    // In a production app, you'd use WebSockets
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [conversation?.id]);

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [conversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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
