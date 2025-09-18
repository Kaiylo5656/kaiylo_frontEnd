import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, MoreVertical, ChevronLeft, ChevronRight, Users, Dumbbell, Video, MessageSquare, FileText } from 'lucide-react';

const ChatPage = () => {
  const { getAuthToken, user } = useAuth();
  const { isConnected, connectionError } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
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
      const conversations = data.data || [];
      
      // Sort conversations by last_message_at (most recent first)
      const sortedConversations = conversations.sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) {
          return new Date(b.created_at) - new Date(a.created_at);
        }
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        
        return new Date(b.last_message_at) - new Date(a.created_at);
      });
      
      setConversations(sortedConversations);
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

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
    } catch (err) {
      console.error('Error creating conversation:', err);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  // Handle new message
  const handleNewMessage = (conversationId, message) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      )
    );
  };

  // Handle message sent
  const handleMessageSent = (conversationId, message) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message: message, last_message_at: message.created_at }
          : conv
      )
    );
  };

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
      console.error('Error deleting conversation:', err);
    }
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv =>
    conv.other_participant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-destructive text-lg font-semibold mb-2">Error</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <button 
            onClick={fetchConversations}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List */}
        <div className="w-80 bg-card border-r border-border flex flex-col">
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
        <div className="flex-1 flex flex-col bg-background">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={user}
              onNewMessage={handleNewMessage}
              onMessageSent={handleMessageSent}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">Choose a conversation from the list to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;