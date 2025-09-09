import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ChatList = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  onCreateConversation, 
  currentUser 
}) => {
  const { getAuthToken } = useAuth();
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch available users to chat with
  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      // Fetch students if current user is coach, or coach if current user is student
      const endpoint = currentUser?.role === 'coach' 
        ? '/api/coach/students' 
        : '/api/coach'; // This would need to be implemented to get the student's coach
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setAvailableUsers(data.data || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle starting a new conversation
  const handleStartConversation = async (userId) => {
    const conversation = await onCreateConversation(userId);
    if (conversation) {
      setShowUserList(false);
    }
  };

  // Delete conversation function
  const handleDeleteConversation = async (conversationId, event) => {
    event.stopPropagation(); // Prevent triggering the conversation selection
    
    const confirmed = window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.');
    if (!confirmed) return;

    try {
      console.log('🔍 Starting delete conversation process...');
      console.log('🔍 Conversation ID:', conversationId);
      
      const token = getAuthToken();
      console.log('🔍 Token obtained:', token ? 'Token found' : 'No token');
      
      if (!token) {
        console.error('❌ No authentication token available');
        alert('Authentication error. Please log in again.');
        return;
      }

      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Delete response status:', response.status);
      console.log('🔍 Delete response ok:', response.ok);

      if (response.ok) {
        console.log('✅ Conversation deleted successfully');
        // Refresh the conversations list
        window.location.reload(); // Simple refresh for now
      } else {
        const errorData = await response.json();
        console.error('❌ Error deleting conversation:', errorData);
        alert(`Failed to delete conversation: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  // Format last message preview
  const formatLastMessage = (message) => {
    if (!message) return 'No messages yet';
    const content = message.content;
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    // Check if it's today
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Get user name for display
  const getUserDisplayName = (conversation) => {
    console.log('🔍 ChatList getUserDisplayName called with:', { conversation });
    
    // If conversation has other_participant_name, use it
    if (conversation?.other_participant_name) {
      console.log('🔍 Using other_participant_name:', conversation.other_participant_name);
      return conversation.other_participant_name;
    }
    
    // Fallback to user ID if no name available
    const userId = conversation?.other_participant_id;
    if (!userId || typeof userId !== 'string') {
      console.log('🔍 Returning Unknown User for:', userId);
      return 'Unknown User';
    }
    const displayName = `User ${userId.substring(0, 8)}`;
    console.log('🔍 Returning fallback display name:', displayName);
    return displayName;
  };

  useEffect(() => {
    if (showUserList) {
      fetchAvailableUsers();
    }
  }, [showUserList]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* User List (when creating new conversation) */}
      {showUserList && (
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Start a conversation with:
            </h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user.id)}
                    className="w-full text-left p-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <div className="font-medium text-gray-900">
                      {user.name || user.email || `User ${user.id.substring(0, 8)}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                  </button>
                ))}
                {availableUsers.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No users available to chat with
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm">No conversations yet</div>
            <div className="text-xs mt-1">Start a new chat to begin messaging</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`relative group hover:bg-gray-50 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
              >
                <button
                  onClick={() => onSelectConversation(conversation)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {getUserDisplayName(conversation).charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900 truncate">
                          {getUserDisplayName(conversation)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(conversation.last_message_at)}
                        </div>
                      </div>
                      
                      <div className="mt-1">
                        <div className="text-sm text-gray-600 truncate">
                          {formatLastMessage(conversation.last_message)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
                
                {/* Delete Button - Well Positioned */}
                <button
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all duration-200 z-10"
                  title="Delete conversation"
                  style={{ 
                    backgroundColor: '#ef4444',
                    border: '2px solid white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
