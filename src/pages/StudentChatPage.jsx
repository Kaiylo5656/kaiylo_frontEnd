import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';
import BottomNavBar from '../components/BottomNavBar';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChevronLeft, MessageSquare, Search } from 'lucide-react';

/**
 * Mobile-optimized chat page for students
 * Full-screen layout with mobile-friendly navigation
 */
const StudentChatPage = () => {
  const { getAuthToken, user } = useAuth();
  const { isConnected, connectionError } = useSocket();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConversationList, setShowConversationList] = useState(true);
  
  // Get studentId from URL parameters (for coaches linking to chat)
  const studentId = searchParams.get('studentId');

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
      console.error('Error creating conversation:', err);
    }
  };

  // Handle conversation selection - on mobile, hide list and show chat
  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowConversationList(false); // Hide conversation list on mobile
  };

  // Handle back from chat window - show conversation list
  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowConversationList(true);
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

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv =>
    conv.other_participant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Format last message preview
  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    const content = message.content;
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center px-4">
          <div className="text-red-400 text-lg font-semibold mb-2">Error</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button 
            onClick={fetchConversations}
            className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 touch-target"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
        {/* Show Conversation List or Chat Window based on selection (mobile view) */}
        {showConversationList && !selectedConversation ? (
          <>
            {/* Header */}
            <div className="bg-[#1a1a1a] border-b border-[#262626] px-4 py-4 flex-shrink-0">
              <h1 className="text-white text-xl font-medium">Messages</h1>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-[#262626] flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#262626] border border-[#404040] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
            </div>

            {/* Conversations List - Add padding-bottom to account for bottom nav bar */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-16">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <div className="text-sm">
                    {searchTerm ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                  </div>
                  <div className="text-xs mt-2">
                    {searchTerm ? 'Essayez un autre terme de recherche' : 'Commencez une nouvelle conversation'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      className="px-4 py-4 bg-[#1a1a1a] border-b border-[#262626] active:bg-[#262626] touch-target cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                            {conversation.other_participant_name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-white truncate text-sm">
                              {conversation.other_participant_name || 'Coach'}
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
          /* Chat Window - Full Screen on Mobile with padding for bottom nav */
          <div className="flex-1 overflow-hidden" style={{ paddingBottom: '64px' }}>
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
      {/* Bottom Navigation Bar - Always visible for students, fixed at bottom */}
      <BottomNavBar />
    </>
  );
};

export default StudentChatPage;
