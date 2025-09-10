import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { buildApiUrl } from '../config/api';

const ChatList = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  onCreateConversation, 
  currentUser,
  onDeleteConversation // New prop for handling deletion
}) => {
  const { getAuthToken } = useAuth();
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch available users to chat with
  const fetchAvailableUsers = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      
      // Fetch students if current user is coach, or coach if current user is student
      const endpoint = currentUser?.role === 'coach' 
        ? '/api/coach/students' 
        : '/api/coach'; // This would need to be implemented to get the student's coach
      
      const response = await fetch(buildApiUrl(endpoint), {
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

  // Show delete confirmation modal
  const handleDeleteClick = (conversationId, event) => {
    event.stopPropagation(); // Prevent triggering the conversation selection
    const conversation = conversations.find(c => c.id === conversationId);
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!conversationToDelete) return;

    try {
      setDeleting(true);
      console.log('🔍 Starting delete conversation process...');
      console.log('🔍 Conversation ID:', conversationToDelete.id);
      
      const token = await getAuthToken();
      console.log('🔍 Token obtained:', token ? 'Token found' : 'No token');
      
      if (!token) {
        console.error('❌ No authentication token available');
        alert('Authentication error. Please log in again.');
        return;
      }

      const response = await fetch(buildApiUrl(`/api/chat/conversations/${conversationToDelete.id}`), {
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
        
        // Call the parent component's delete handler
        if (onDeleteConversation) {
          onDeleteConversation(conversationToDelete.id);
        }
        
        // Close modal and reset state
        setShowDeleteModal(false);
        setConversationToDelete(null);
      } else {
        const errorData = await response.json();
        console.error('❌ Error deleting conversation:', errorData);
        alert(`Failed to delete conversation: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setConversationToDelete(null);
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

  // Handle keyboard events for the modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (showDeleteModal) {
        if (event.key === 'Escape') {
          handleDeleteCancel();
        } else if (event.key === 'Enter' && !deleting) {
          handleDeleteConfirm();
        }
      }
    };

    if (showDeleteModal) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showDeleteModal, deleting]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          <Button
            onClick={() => setShowUserList(!showUserList)}
            size="sm"
          >
            New Chat
          </Button>
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
          <div className="space-y-2 p-2">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedConversation?.id === conversation.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onSelectConversation(conversation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                        {getUserDisplayName(conversation).charAt(0).toUpperCase()}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground truncate">
                          {getUserDisplayName(conversation)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(conversation.last_message_at)}
                        </div>
                      </div>
                      
                      <div className="mt-1">
                        <div className="text-sm text-muted-foreground truncate">
                          {formatLastMessage(conversation.last_message)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                {/* Delete Button - Well Positioned */}
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => handleDeleteClick(conversation.id, e)}
                  className="absolute top-2 right-2 w-8 h-8 z-10"
                  title="Delete conversation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleDeleteCancel}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Delete Conversation</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the conversation with{' '}
                <span className="font-medium">
                  {conversationToDelete ? getUserDisplayName(conversationToDelete) : 'this user'}
                </span>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                All messages in this conversation will be permanently deleted.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 flex items-center"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
