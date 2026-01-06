import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useSearchParams } from 'react-router-dom';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import useSocket from '../hooks/useSocket';
import { buildApiUrl } from '../config/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, MoreVertical, ChevronLeft, ChevronRight, Users, Dumbbell, Video, FileText } from 'lucide-react';

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

const ChatPage = () => {
  const { getAuthToken, user } = useAuth();
  const { socket, isConnected, connectionError, markMessagesAsRead } = useSocket();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get studentId from URL parameters
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
    
    // Refresh conversations when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchConversations();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Listen for messages_read events to update last_read_at
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMessagesRead = (data) => {
      console.log('🔌 Messages marked as read:', data);
      // Update last_read_at for the conversation
      // The server may send conversationId or conversation_id
      const conversationId = data?.conversationId || data?.conversation_id;
      const userId = data?.userId;
      
      if (conversationId) {
        // Use server's last_read_at if provided, otherwise use current time
        const readAt = data?.last_read_at || new Date().toISOString();
        
        setConversations(prev => 
          prev.map(conv => {
            if (conv.id === conversationId) {
              // If I read the messages, reset unread count
              if (userId === user?.id) {
                return { ...conv, last_read_at: readAt, unread_count: 0 };
              }
              // If other user read messages, update other_participant_last_read_at
              else {
                return { ...conv, other_participant_last_read_at: readAt };
              }
            }
            return conv;
          })
        );
        
        // Refresh conversations after a delay to ensure server has persisted the update
        // This ensures that when the page is refreshed, the badge won't reappear
        setTimeout(() => {
          fetchConversations();
        }, 1000);
      }
    };

    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, isConnected]);

  // Auto-open conversation with specific student if studentId is provided
  useEffect(() => {
    if (studentId && conversations.length > 0) {
      // Look for existing conversation with this student
      const existingConversation = conversations.find(conv => 
        conv.other_participant_id === studentId
      );
      
      if (existingConversation) {
        setSelectedConversation(existingConversation);
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
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    
    // Mark messages as read when conversation is selected
    // Check if there are unread messages (either via count or timestamp check)
    let shouldMarkAsRead = false;

    if (conversation.unread_count > 0) {
      shouldMarkAsRead = true;
    } else if (conversation?.last_message) {
      // Fallback check if unread_count is missing or 0 but timestamps mismatch
      // (e.g. real-time update didn't increment count properly)
      const lastMessage = conversation.last_message;
      const isSentByOtherUser = lastMessage.sender_id !== user?.id;
      
      if (isSentByOtherUser) {
        const hasUnread = !conversation.last_read_at || 
          (lastMessage.created_at && new Date(conversation.last_read_at) < new Date(lastMessage.created_at));
        if (hasUnread) shouldMarkAsRead = true;
      }
    }

    if (shouldMarkAsRead) {
      // Update locally for immediate UI feedback
      const now = new Date().toISOString();
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id
            ? { ...conv, last_read_at: now, unread_count: 0 }
            : conv
        )
      );
      
      // Mark as read on server via HTTP for reliability
      // The server will verify persistence and emit the socket event
      try {
        const token = await getAuthToken();
        const response = await fetch(buildApiUrl(`/api/chat/conversations/${conversation.id}/read`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to mark as read via HTTP');
        }
      } catch (error) {
        console.error('❌ Error marking messages as read via HTTP:', error);
        // Fallback to socket if HTTP fails
        if (isConnected && markMessagesAsRead) {
          console.log('🔄 Falling back to socket for read status...');
          markMessagesAsRead(conversation.id);
        }
      }
    }
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

  return (
    <div className="h-full text-foreground flex flex-col relative">
      {loading && (
        <div className="absolute inset-0 flex justify-center items-center z-10">
          <div 
            className="rounded-full border-2 border-transparent animate-spin"
            style={{
              borderTopColor: '#d4845a',
              borderRightColor: '#d4845a',
              width: '40px',
              height: '40px'
            }}
          />
        </div>
      )}
      
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
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
      )}
      
      {!loading && !error && (
        <>
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List - Desktop: Always visible, fixed width */}
        <div className="w-80 lg:w-96 flex flex-col flex-shrink-0">
          <ChatList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onCreateConversation={createConversation}
            currentUser={user}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>

        {/* Chat Window - Desktop: Takes remaining space */}
        <div className="flex-1 flex flex-col min-w-0 pr-6">
          {selectedConversation ? (
            <ChatWindow
              conversation={selectedConversation}
              currentUser={user}
              onNewMessage={handleNewMessage}
              onMessageSent={handleMessageSent}
              onBack={() => setSelectedConversation(null)} // Pass back handler
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-2 rounded-full flex items-center justify-center">
                  <MessageSquareIcon className="w-10 h-10" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
                </div>
                <h3 className="text-base font-extralight mb-3" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Sélectionner une conversation</h3>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default ChatPage;