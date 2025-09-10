import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import useSocket from '../hooks/useSocket';
import LoadingSpinner from '../components/LoadingSpinner';

const ChatPage = () => {
  const { getAuthToken, user } = useAuth();
  const { isConnected, connectionError } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user's conversations
  const fetchConversations = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }

      const data = await response.json();
      const conversations = data.data || [];
      
      // Sort conversations by last_message_at (most recent first)
      const sortedConversations = conversations.sort((a, b) => {
        // Handle null values - put conversations with no messages at the end
        if (!a.last_message_at && !b.last_message_at) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
      
      console.log('🔍 Sorted conversations:', sortedConversations.map(c => ({
        id: c.id,
        last_message_at: c.last_message_at,
        last_message: c.last_message,
        other_participant_name: c.other_participant_name,
        created_at: c.created_at
      })));
      
      setConversations(sortedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  // Create or get conversation with a user
  const createConversation = async (participantId) => {
    try {
      console.log('🔍 ===== FRONTEND: CREATE CONVERSATION START =====');
      console.log('🔍 Creating conversation with participant:', participantId);
      const token = await getAuthToken();
      console.log('🔍 Frontend token exists:', !!token);
      
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId })
      });

      console.log('🔍 Frontend response status:', response.status);
      console.log('🔍 Frontend response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Frontend response error:', errorText);
        throw new Error('Failed to create conversation');
      }

      const data = await response.json();
      const newConversation = data.data;
      
      console.log('🔍 ===== FRONTEND: RECEIVED CONVERSATION DATA =====');
      console.log('🔍 Frontend received new conversation:', {
        id: newConversation.id,
        other_participant_id: newConversation.other_participant_id,
        fullData: newConversation
      });
      
      // Add to conversations list if not already present
      setConversations(prev => {
        const exists = prev.find(conv => conv.id === newConversation.id);
        if (exists) {
          return prev;
        }
        return [newConversation, ...prev];
      });
      
      setSelectedConversation(newConversation);
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation');
      return null;
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  // Handle new message (for real-time updates)
  const handleNewMessage = (conversationId, message) => {
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      
      // Re-sort conversations after updating
      return updated.sort((a, b) => {
        // Handle null values - put conversations with no messages at the end
        if (!a.last_message_at && !b.last_message_at) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
    });
  };

  // Update conversation when messages are sent
  const handleMessageSent = (conversationId, message) => {
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      );
      
      // Re-sort conversations after updating
      return updated.sort((a, b) => {
        // Handle null values - put conversations with no messages at the end
        if (!a.last_message_at && !b.last_message_at) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
    });
  };

  // Handle conversation deletion
  const handleDeleteConversation = (conversationId) => {
    console.log('🔍 ChatPage: Handling conversation deletion for ID:', conversationId);
    
    // Remove the conversation from the list
    setConversations(prev => {
      const updated = prev.filter(conv => conv.id !== conversationId);
      console.log('🔍 ChatPage: Updated conversations after deletion:', updated.length);
      return updated;
    });
    
    // If the deleted conversation was selected, clear the selection
    if (selectedConversation?.id === conversationId) {
      console.log('🔍 ChatPage: Clearing selected conversation');
      setSelectedConversation(null);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={fetchConversations}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
              <p className="mt-2 text-gray-600">
                Chat with your {user?.role === 'coach' ? 'students' : 'coach'}
              </p>
            </div>
            
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {/* Connection Error Message */}
          {connectionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-red-600 text-sm">
                  <strong>Connection Error:</strong> {connectionError}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex h-[600px]">
            {/* Chat List Sidebar */}
            <div className="w-1/3 border-r border-gray-200">
              <ChatList 
                conversations={conversations}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                onCreateConversation={createConversation}
                currentUser={user}
                onDeleteConversation={handleDeleteConversation}
              />
            </div>

            {/* Chat Window */}
            <div className="flex-1">
              {selectedConversation ? (
                <ChatWindow 
                  conversation={selectedConversation}
                  currentUser={user}
                  onNewMessage={handleNewMessage}
                  onMessageSent={handleMessageSent}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-2xl mb-2">💬</div>
                    <div className="text-lg font-medium mb-1">Select a conversation</div>
                    <div className="text-sm">Choose a conversation from the list to start chatting</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

