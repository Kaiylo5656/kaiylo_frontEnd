import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useSocket from '../hooks/useSocket';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { buildApiUrl } from '../config/api';
import { Search, MoreHorizontal, Check, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const ChatList = ({ 
  conversations, 
  selectedConversation, 
  onSelectConversation, 
  onCreateConversation, 
  currentUser,
  onDeleteConversation // New prop for handling deletion
}) => {
  const { getAuthToken } = useAuth();
  const { socket, isConnected } = useSocket();
  const [localConversations, setLocalConversations] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userNamesMap, setUserNamesMap] = useState({});
  const dropdownContainerRef = useRef(null);

  // Sync prop to local state
  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data) => {
      const conversationId = data.conversationId || data.conversation_id;
      const senderId = data.sender_id;
      
      setLocalConversations(prev => {
        // Check if conversation exists
        const exists = prev.some(c => c.id === conversationId);
        if (!exists) return prev; // If conversation doesn't exist in list, don't try to update it (it might be added by parent via props)

        return prev.map(conv => {
          if (conv.id === conversationId) {
            const isMyMessage = senderId === currentUser?.id;
            
            // If message is from other user, increment unread_count
            let newUnreadCount = conv.unread_count || 0;
            if (!isMyMessage) {
              // If this is the selected conversation, we might assume it's read immediately?
              // But safer to let the explicit markMessagesAsRead handle the reset
              newUnreadCount += 1;
            }
            
            return {
              ...conv,
              last_message: data,
              last_message_at: data.created_at,
              unread_count: newUnreadCount
            };
          }
          return conv;
        });
      });
    };

    const handleMessagesRead = (data) => {
      const { conversationId, userId, readAt } = data;
      const convId = conversationId || data.conversation_id;
      
      setLocalConversations(prev => prev.map(conv => {
        if (conv.id === convId) {
          // If I read the messages, reset unread count
          if (userId === currentUser?.id) {
            return {
              ...conv,
              unread_count: 0,
              last_read_at: readAt
            };
          }
          // If other user read messages, update other_participant_last_read_at
          else {
            return {
              ...conv,
              other_participant_last_read_at: readAt
            };
          }
        }
        return conv;
      }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, isConnected, currentUser]);

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
      const allUsers = data.data || [];
      
      setAvailableUsers(allUsers);
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
        
        // Update local state
        setLocalConversations(prev => prev.filter(c => c.id !== conversationToDelete.id));

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
    if (!message) return 'Aucun message';
    return message.content;
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

  // Fetch user names for conversations
  useEffect(() => {
    const fetchUserNames = async () => {
      if (!localConversations.length || !currentUser) return;
      
      try {
        const token = await getAuthToken();
        const endpoint = currentUser?.role === 'coach' 
          ? '/api/coach/students' 
          : '/api/coach';
        
        const response = await fetch(buildApiUrl(endpoint), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const users = data.data || [];
          
          // Create a map of user IDs to names
          const namesMap = {};
          users.forEach(user => {
            if (user.id && user.name) {
              namesMap[user.id] = user.name;
            }
          });
          
          setUserNamesMap(namesMap);
        }
      } catch (error) {
        console.error('Error fetching user names:', error);
      }
    };

    fetchUserNames();
  }, [localConversations, currentUser]);

  // Get user name for display
  const getUserDisplayName = (conversation) => {
    const userId = conversation?.other_participant_id;
    
    // First, try to get the name from the userNamesMap
    if (userId && userNamesMap[userId]) {
      return userNamesMap[userId];
    }
    
    // Fallback to other_participant_name if available
    if (conversation?.other_participant_name) {
      return conversation.other_participant_name;
    }
    
    // Final fallback to user ID
    if (!userId || typeof userId !== 'string') {
      return 'Unknown User';
    }
    return `User ${userId.substring(0, 8)}`;
  };

  // Get unread message count for a conversation
  const getUnreadCount = (conversation) => {
    if (!conversation || !currentUser) {
      return 0;
    }

    // If API provides unread_count, use it
    if (conversation.unread_count !== undefined && conversation.unread_count !== null) {
      return conversation.unread_count;
    }

    // Fallback: Calculate based on last_message and last_read_at (legacy logic)
    if (!conversation.last_message) {
      return 0;
    }

    const lastMessage = conversation.last_message;
    // Only count unread if the last message was sent by the other participant
    const isSentByOtherUser = lastMessage.sender_id !== currentUser.id;
    
    if (!isSentByOtherUser) {
      return 0; // Last message was sent by current user, no unread count
    }

    // Check if the last message is unread
    if (conversation.last_read_at && lastMessage.created_at) {
      const readAt = new Date(conversation.last_read_at);
      const messageAt = new Date(lastMessage.created_at);
      
      if (readAt < messageAt) {
        return 1; // At least one unread message
      } else {
        return 0;
      }
    } else if (lastMessage.created_at) {
      // If no read_at timestamp but there's a message from other user, consider it unread
      return 1;
    }

    return 0;
  };

  // Get message status indicator
  const getMessageStatus = (conversation) => {
    // Only show status if the last message was sent by the current user
    if (!conversation?.last_message || !currentUser) {
      return null;
    }

    const lastMessage = conversation.last_message;
    const isSentByCurrentUser = lastMessage.sender_id === currentUser.id;

    if (!isSentByCurrentUser) {
      return null; // Message received, no status indicator
    }

    // Check against other_participant_last_read_at
    if (conversation.other_participant_last_read_at && lastMessage.created_at) {
        const otherReadAt = new Date(conversation.other_participant_last_read_at);
        const messageAt = new Date(lastMessage.created_at);
        
        if (otherReadAt >= messageAt) {
            return 'read'; // Double check (blue)
        }
    }

    // Check if message has been read (fallback to legacy check using own last_read_at? No, that's for me reading)
    // Legacy logic used conversation.last_read_at which is usually MY last read time.
    // If we want to know if *other* read it, we must rely on other_participant_last_read_at.
    
    return 'sent'; // Single check (gray)
  };

  useEffect(() => {
    if (showUserList) {
      fetchAvailableUsers();
    }
  }, [showUserList]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target)) {
        setShowUserList(false);
      }
    };

    if (showUserList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Filter and sort conversations - unread messages first, then by last_message_at
  const filteredConversations = localConversations
    .filter(conv => {
      // Exclude conversations without any messages
      if (!conv.last_message) {
        return false;
      }
      const displayName = getUserDisplayName(conv);
      return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const aUnreadCount = getUnreadCount(a);
      const bUnreadCount = getUnreadCount(b);
      
      // Conversations with unread messages come first
      if (aUnreadCount > 0 && bUnreadCount === 0) return -1;
      if (aUnreadCount === 0 && bUnreadCount > 0) return 1;
      
      // If both have unread or both don't, sort by last_message_at (most recent first)
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      
      // If both have unread, prioritize by unread count (more unread = higher priority)
      if (aUnreadCount > 0 && bUnreadCount > 0) {
        if (aUnreadCount !== bUnreadCount) {
          return bUnreadCount - aUnreadCount; // More unread messages first
        }
      }
      
      return bTime - aTime; // Most recent first
    });

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 pt-3 px-6 pb-0">
        {/* Search and Filter Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex items-center space-x-4">
              {/* Search Input */}
              <div className="relative font-light flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/75 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un client"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-[50px] text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                />
              </div>

              {/* New Chat Button Dropdown */}
              <div ref={dropdownContainerRef} className="relative flex-shrink-0">
                <button
                  onClick={() => setShowUserList(!showUserList)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-extralight p-2 rounded-[10px] transition-colors flex-shrink-0 flex items-center justify-center relative"
                  title={showUserList ? 'Annuler' : 'Nouveau chat'}
                >
                  <div className="relative w-5 h-5">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 384 512"
                      className={`h-5 w-5 absolute inset-0 transition-all duration-300 fill-current ${
                        showUserList ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'
                      }`}
                    >
                      <path d="M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"/>
                    </svg>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 448 512"
                      className={`h-5 w-5 absolute inset-0 transition-all duration-300 fill-current ${
                        showUserList ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                      }`}
                    >
                      <path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"/>
                    </svg>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserList && (
                  <div
                    className="absolute z-50 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg pb-2 right-0"
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(10px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {/* Header */}
                    <div className="pt-3 px-3 pb-2 border-border">
                      <h3 className="text-xs font-light text-foreground" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Démarrer une conversation avec:
                      </h3>
                    </div>

                    {/* User List */}
                    <div className="max-h-60 overflow-y-auto">
                      {loading ? (
                        <div className="px-3 py-8 text-center">
                          <div className="text-sm font-light text-muted-foreground" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            Chargement...
                          </div>
                        </div>
                      ) : availableUsers.length > 0 ? (
                        availableUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => handleStartConversation(user.id)}
                            className="w-full px-5 py-2 text-left text-sm font-light transition-colors flex flex-col hover:bg-muted"
                            style={{
                              color: 'rgba(255, 255, 255, 0.9)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div className="font-light" style={{ color: 'rgba(255, 255, 255, 1)' }}>
                              {user.name || user.email || `User ${user.id.substring(0, 8)}`}
                            </div>
                            <div className="text-xs font-light" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                              {user.email}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-8 text-center text-sm font-light text-muted-foreground" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          Aucun utilisateur disponible
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations List Container - Scrollable */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="rounded-lg flex flex-col overflow-hidden h-full" style={{ backgroundColor: 'unset', border: 'none' }}>
          {/* Header */}
          <div className="px-6 pt-0 pb-2 shrink-0" style={{ borderBottom: 'none' }}>
            <div className="flex items-center">
              <div className="flex items-center space-x-6 flex-1">
                <h3 className="text-xs font-light text-foreground" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Conversations ({filteredConversations.length})
                </h3>
              </div>
            </div>
          </div>

          {/* Conversations List - Scrollable */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {filteredConversations.length === 0 && !showUserList ? (
              <div className="px-6 py-8 text-center font-light" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                <div className="text-xl md:text-2xl mb-2">💬</div>
                <div className="text-xs md:text-sm">
                  {searchTerm ? 'Aucune conversation correspondante' : 'Aucune conversation pour le moment'}
                </div>
                <div className="text-xs mt-1">
                  {searchTerm ? 'Essayez un autre terme de recherche.' : 'Démarrez une nouvelle conversation pour commencer.'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-[7px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedConversation?.id === conversation.id;
                  const backgroundColor = isSelected 
                    ? 'rgba(255, 255, 255, 0.16)' 
                    : 'rgba(255, 255, 255, 0.04)';
                  
                  return (
                    <div 
                      key={conversation.id} 
                      className="px-3 py-3 transition-colors cursor-pointer rounded-2xl"
                      style={{ 
                        backgroundColor: backgroundColor,
                        borderWidth: '0px',
                        borderColor: 'rgba(0, 0, 0, 0)',
                        borderStyle: 'none',
                        borderImage: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        }
                      }}
                      onClick={(e) => {
                        // Don't open if clicking on action buttons
                        if (e.target.closest('button')) return;
                        onSelectConversation(conversation);
                      }}
                    >
                      <div className="flex items-center">
                        {/* Left section: Avatar + Content */}
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium text-base">
                              {getUserDisplayName(conversation).charAt(0).toUpperCase()}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-foreground font-light truncate">
                              {getUserDisplayName(conversation)}
                            </h4>
                            
                            <div className="mt-1 flex items-center gap-1.5">
                              {(() => {
                                const status = getMessageStatus(conversation);
                                if (status === 'read') {
                                  return (
                                    <CheckCheck 
                                      className="h-3 w-3 flex-shrink-0" 
                                      style={{ color: 'var(--kaiylo-primary-hex)' }}
                                    />
                                  );
                                } else if (status === 'sent') {
                                  return (
                                    <CheckCheck 
                                      className="h-3 w-3 flex-shrink-0" 
                                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                    />
                                  );
                                } else if (status === 'pending') {
                                  return (
                                    <Check 
                                      className="h-3 w-3 flex-shrink-0" 
                                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                    />
                                  );
                                }
                                return null;
                              })()}
                              <p className="text-xs font-light truncate flex-1 min-w-0 max-w-[100px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                {formatLastMessage(conversation.last_message)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Middle section: Unread count badge */}
                        {(() => {
                          const unreadCount = getUnreadCount(conversation);
                          if (unreadCount > 0) {
                            const displayCount = unreadCount > 99 ? '99+' : unreadCount;
                            return (
                              <div className="w-6 h-6 bg-[#d4845a] rounded-full flex items-center justify-center flex-shrink-0 ml-2 mr-4">
                                <span className="text-xs font-semibold text-white leading-none">{displayCount}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Right section: Dropdown + Timestamp */}
                        <div className="flex flex-col items-end justify-center gap-1 flex-shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 transition-colors flex-shrink-0"
                                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = 'var(--kaiylo-primary-hex)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                                }}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteClick(conversation.id, e)}
                                className="text-[#d4845a]"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="mr-2 h-4 w-4" style={{ color: '#d4845a' }}>
                                  <path fill="currentColor" d="M232.7 69.9L224 96L128 96C110.3 96 96 110.3 96 128C96 145.7 110.3 160 128 160L512 160C529.7 160 544 145.7 544 128C544 110.3 529.7 96 512 96L416 96L407.3 69.9C402.9 56.8 390.7 48 376.9 48L263.1 48C249.3 48 237.1 56.8 232.7 69.9zM512 208L128 208L149.1 531.1C150.7 556.4 171.7 576 197 576L443 576C468.3 576 489.3 556.4 490.9 531.1L512 208z"/>
                                </svg>
                                <span>Supprimer</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <time className="text-xs font-light" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {formatTimestamp(conversation.last_message_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4"
          onClick={handleDeleteCancel}
        >
          <div 
            className="relative mx-auto w-full max-w-lg max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(89, 93, 101, 0.5) 100%)',
              opacity: 0.95
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
              <h2 className="text-xl font-normal flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                Supprimer la conversation
              </h2>
              <button
                onClick={handleDeleteCancel}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                  <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                </svg>
              </button>
            </div>
            <div className="border-b border-white/10 mx-6"></div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6 space-y-5">
              <div className="space-y-6">
                {/* Warning Message */}
                <div className="flex flex-col items-start space-y-4">
                  <div className="text-left space-y-2">
                    <p className="text-sm font-extralight text-white/70">
                      Êtes-vous sûr de vouloir supprimer la conversation avec{' '}
                      <span className="font-normal text-white">
                        {conversationToDelete ? getUserDisplayName(conversationToDelete) : 'cet utilisateur'}
                      </span> ?
                    </p>
                    <p className="text-xs font-extralight text-white/50">
                      Cette action est irréversible. Tous les messages de cette conversation seront définitivement supprimés.
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-0">
                  <button
                    type="button"
                    onClick={handleDeleteCancel}
                    disabled={deleting}
                    className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="px-5 py-2.5 text-sm font-extralight bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                  >
                    {deleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
