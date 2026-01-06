import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { PlayCircle, Plus, MoreHorizontal, LayoutGrid, Trash2, FolderPlus, Filter, ChevronDown, ChevronRight, Clock, CheckCircle, X, Play, Video } from 'lucide-react';
import UploadVideoModal from '../components/UploadVideoModal';
import VideoDetailModal from '../components/VideoDetailModal';
import CoachResourceModal from '../components/CoachResourceModal';
import StudentVideoLibrary from '../components/StudentVideoLibrary';
import StatusFilterChips from '../components/StatusFilterChips';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useVideoFilters } from '../hooks/useVideoFilters';

const VideoLibrary = () => {
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'coach'
  const [studentVideos, setStudentVideos] = useState([]);
  const [coachResources, setCoachResources] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);
  const [selectedCoachResource, setSelectedCoachResource] = useState(null);
  const [isCoachResourceModalOpen, setIsCoachResourceModalOpen] = useState(false);

  // Filter states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null); // For coach resources filtering
  const [openSessions, setOpenSessions] = useState({}); // Track which sessions are open

  const { getAuthToken, hasRole, refreshAuthToken } = useAuth();
  
  // Status and sort filters with URL persistence
  const { status: statusFilter, setStatus, isInitialized } = useVideoFilters();

  // Handle video click (for both student videos and coach resources)
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setIsVideoDetailModalOpen(true);
  };

  // Handle coach resource click
  const handleCoachResourceClick = (resource) => {
    // Map coach resource data to the format expected by CoachResourceModal
    const mappedResource = {
      id: resource.id,
      title: resource.title || resource.fileName,
      video_url: resource.fileUrl, // Map fileUrl to video_url
      video_filename: resource.fileName, // Map fileName to video_filename
      description: resource.description || '',
      folder_name: resource.folderName || (folders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'),
      created_at: resource.createdAt
    };
    
    console.log('🎬 Coach resource clicked:', resource);
    console.log('🎬 Mapped resource:', mappedResource);
    
    setSelectedCoachResource(mappedResource);
    setIsCoachResourceModalOpen(true);
  };

  // Handle feedback update
  const handleFeedbackUpdate = (videoId, feedback, rating, deleted = false, status = 'completed', updateType = 'student') => {
    if (deleted) {
      // Remove video from list if deleted
      if (updateType === 'student') {
        setStudentVideos(prev => prev.filter(v => v.id !== videoId));
        setIsVideoDetailModalOpen(false);
        setSelectedVideo(null);
      } else {
        setCoachResources(prev => prev.filter(v => v.id !== videoId));
        setIsCoachResourceModalOpen(false);
        setSelectedCoachResource(null);
      }
    } else {
      if (updateType === 'student') {
        // Update video feedback in the student videos list
        setStudentVideos(prev => prev.map(v => 
          v.id === videoId 
            ? { ...v, coach_feedback: feedback, coach_rating: rating, status: status }
            : v
        ));
      } else if (updateType === 'coach') {
        // Update description in the coach resources list
        setCoachResources(prev => prev.map(v => 
          v.id === videoId 
            ? { ...v, description: feedback }
            : v
        ));
      }
    }
  };

  // Fetch student workout videos
  const fetchStudentVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setStudentVideos([]);
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(buildApiUrl('/workout-sessions/videos'), { headers });
      
      if (response.data.success) {
        setStudentVideos(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch student videos');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachResources = async () => {
    setLoading(true);
    setError(null);
    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setCoachResources([]);
        setFolders([]);
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resourcesResponse, foldersResponse] = await Promise.all([
        axios.get(buildApiUrl('/resources/coach'), { headers }),
        axios.get(buildApiUrl('/resources/folders'), { headers })
      ]);

      if (resourcesResponse.data.success) {
        setCoachResources(resourcesResponse.data.data);
      } else {
        throw new Error(resourcesResponse.data.message || 'Failed to fetch coach resources');
      }

      if (foldersResponse.data.success) {
        setFolders(foldersResponse.data.data);
      } else {
        throw new Error(foldersResponse.data.message || 'Failed to fetch folders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'clients') {
      fetchStudentVideos();
    } else {
      fetchCoachResources();
    }
  }, [activeTab]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) return;
      const response = await axios.post(buildApiUrl('/resources/folders'), 
        { name: newFolderName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setFolders([...folders, response.data.data]);
        setIsFolderModalOpen(false);
        setNewFolderName('');
      } else {
        throw new Error(response.data.message || 'Failed to create folder');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadSuccess = (newVideo) => {
    setCoachResources([newVideo, ...coachResources]);
    fetchCoachResources();
  };

  // Handle folder selection for filtering
  const handleFolderSelect = (folderId) => {
    setSelectedFolder(selectedFolder === folderId ? null : folderId);
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource? This cannot be undone.')) {
      return;
    }

    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) return;
      await axios.delete(buildApiUrl(`/resources/${resourceId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCoachResources();
    } catch (err) {
      setError(err.message || 'Failed to delete resource.');
    }
  };

  const handleMoveResource = async (resourceId, folderId) => {
    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) return;
      await axios.patch(buildApiUrl(`/resources/${resourceId}`), 
        { folderId: folderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCoachResources();
    } catch (err) {
      setError(err.message || 'Failed to move resource.');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Check if folder has resources
    const folderResources = coachResources.filter(resource => resource.folderId === folderId);
    
    if (folderResources.length > 0) {
      if (!window.confirm(`Le dossier "${folder.name}" contient ${folderResources.length} ressource(s). Voulez-vous vraiment le supprimer ? Les ressources seront déplacées vers "Non classé".`)) {
        return;
      }
    } else {
      if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le dossier "${folder.name}" ?`)) {
        return;
      }
    }

    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) return;
      await axios.delete(buildApiUrl(`/resources/folders/${folderId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove folder from state
      setFolders(prev => prev.filter(f => f.id !== folderId));
      
      // If this was the selected folder, clear the selection
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
      }
      
      // Refresh resources to update folder assignments
      fetchCoachResources();
    } catch (err) {
      setError(err.message || 'Failed to delete folder.');
    }
  };

  const handleUpdateVideoFeedback = async (videoId, feedback, rating) => {
    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) return;
      await axios.patch(buildApiUrl(`/workout-sessions/videos/${videoId}/feedback`), 
        { feedback, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchStudentVideos();
    } catch (err) {
      setError(err.message || 'Failed to update video feedback.');
    }
  };

  // Get unique students and exercises for filters
  // Create a map of student emails to their names
  const studentMap = useMemo(() => {
    const map = new Map();
    studentVideos.forEach(video => {
      const email = video.student?.email || 'Unknown';
      if (!map.has(email)) {
        const name = video.student?.raw_user_meta_data?.full_name || 
                     video.student?.raw_user_meta_data?.name || 
                     email;
        map.set(email, name);
      }
    });
    return map;
  }, [studentVideos]);
  
  const uniqueStudents = [...new Set(studentVideos.map(video => video.student?.email || 'Unknown'))];
  const uniqueExercises = [...new Set(studentVideos.map(video => video.exercise_name))];

  // Filter and sort videos with useMemo for performance
  const filteredVideos = useMemo(() => {
    if (!isInitialized) return [];
    
    // Apply all filters
    let filtered = studentVideos.filter(video => {
      // Exclude videos without a video_url (Pas de vidéo entries)
      if (!video.video_url || (typeof video.video_url === 'string' && video.video_url.trim() === '')) {
        return false;
      }
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'pending') {
        matchesStatus = video.status === 'pending';
      } else if (statusFilter === 'completed') {
        matchesStatus = video.status === 'completed' || video.status === 'reviewed';
      }
      // statusFilter === 'all' matches everything
      
      // Other filters
      const matchesStudent = !selectedStudent || (video.student?.email || 'Unknown') === selectedStudent;
      const matchesExercise = !selectedExercise || video.exercise_name === selectedExercise;
      const matchesDate = !selectedDate || format(new Date(video.created_at), 'yyyy-MM-dd') === selectedDate;
      
      return matchesStatus && matchesStudent && matchesExercise && matchesDate;
    });
    
    // Sort by upload time (uploaded_at or created_at) DESC - newest first (latest to oldest)
    filtered.sort((a, b) => {
      // Use uploaded_at if available (actual student upload time), otherwise fall back to created_at
      const dateA = (a.uploaded_at ? new Date(a.uploaded_at) : (a.created_at ? new Date(a.created_at) : new Date(0))).getTime();
      const dateB = (b.uploaded_at ? new Date(b.uploaded_at) : (b.created_at ? new Date(b.created_at) : new Date(0))).getTime();
      return dateB - dateA; // DESC: newest first (latest to oldest)
    });
    
    return filtered;
  }, [studentVideos, statusFilter, selectedStudent, selectedExercise, selectedDate, isInitialized]);

  // Count videos needing feedback
  const videosNeedingFeedback = studentVideos.filter(video => video.status === 'pending').length;

  // Group videos by workout session
  const groupedVideosBySession = useMemo(() => {
    const groups = {};
    
    filteredVideos.forEach(video => {
      const sessionId = video.workout_session_id || video.assignment_id || 'unknown';
      
      if (!groups[sessionId]) {
        // Extract session name from the nested assignment data
        const sessionName = video.assignment?.workout_session?.title || 
                           video.session_name || 
                           'Séance';
        
        groups[sessionId] = {
          sessionId,
          sessionDate: video.created_at || video.uploaded_at,
          sessionName: sessionName,
          videos: [],
          studentName: video.student?.raw_user_meta_data?.full_name || 
                       video.student?.raw_user_meta_data?.name || 
                       video.student?.email || 
                       'Client inconnu'
        };
      }
      
      groups[sessionId].videos.push(video);
    });
    
    // Convert to array and sort by date (newest first)
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.sessionDate).getTime();
      const dateB = new Date(b.sessionDate).getTime();
      return dateB - dateA;
    });
  }, [filteredVideos]);

  // Toggle session open/closed
  const toggleSession = (sessionId) => {
    setOpenSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-500 text-white">
            A feedback
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white">
            Complété
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white">
            Complété
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-600 text-gray-200">
            {status}
          </span>
        );
    }
  };

  const renderStudentVideosGrouped = () => {
    if (groupedVideosBySession.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-white/50 h-80">
          <Video size={48} className="mb-4 opacity-30" />
          <p className="font-light text-base">Aucune vidéo trouvée</p>
          <p className="text-sm text-white/30">Aucune vidéo ne correspond aux filtres sélectionnés.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {groupedVideosBySession.map((session) => {
          const isOpen = openSessions[session.sessionId];
          const sessionTitle = `${session.sessionName} - ${session.studentName} - ${format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr })}`;
          
          return (
            <div 
              key={session.sessionId}
              className="border border-border/20 rounded-xl overflow-hidden bg-card hover:border-border/40 transition-colors"
            >
              {/* Session Header (Clickable) */}
              <div 
                className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleSession(session.sessionId)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <ChevronRight 
                    size={20} 
                    className={`text-muted-foreground transition-transform flex-shrink-0 ${
                      isOpen ? 'rotate-90' : ''
                    }`} 
                  />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-foreground font-light text-base">{sessionTitle}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.videos.length} vidéo{session.videos.length > 1 ? 's' : ''}
                          </p>
                        </div>
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {session.videos.some(v => v.status === 'pending') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      {session.videos.filter(v => v.status === 'pending').length} à feedback
                    </span>
                  )}
                  {session.videos.every(v => v.status === 'completed' || v.status === 'reviewed') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      Complété
                    </span>
                  )}
                </div>
              </div>
              
              {/* Session Videos (Collapsible) */}
              {isOpen && (
                <div className="border-t border-border/20 bg-muted/20">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-light text-muted-foreground uppercase tracking-wider">
                            Vidéo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-light text-muted-foreground uppercase tracking-wider">
                            Exercice
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-light text-muted-foreground uppercase tracking-wider">
                            Série
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-light text-muted-foreground uppercase tracking-wider">
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {session.videos.map((video) => (
                          <tr 
                            key={video.id} 
                            className="border-t border-border/20 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => handleVideoClick(video)}
                          >
                            <td className="px-4 py-4">
                              <div className="relative w-28 h-20 bg-muted rounded-lg overflow-hidden group">
                                <video 
                                  src={video.video_url || undefined} 
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-primary/15 text-primary border border-primary/30">
                                {video.exercise_name}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-foreground">
                                Série {video.set_number}/3
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {video.status === 'pending' ? (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                  A feedback
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                  Complété
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderStudentVideosCards = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredVideos.map((video) => (
            <div 
              key={video.id} 
              className="bg-card border border-border/20 rounded-xl overflow-hidden group cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200"
              onClick={() => handleVideoClick(video)}
            >
            {/* Video Thumbnail */}
            <div className="relative aspect-video bg-muted overflow-hidden">
              <video 
                src={video.video_url || undefined} 
                className="w-full h-full object-cover"
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const duration = e.target.duration;
                  if (duration && !isNaN(duration)) {
                    const minutes = Math.floor(duration / 60);
                    const seconds = Math.floor(duration % 60);
                    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    e.target.parentElement.querySelector('.duration-display').textContent = timeDisplay;
                  }
                }}
              />
              {/* Duration Overlay */}
              <div className="duration-display absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                Loading...
              </div>
              {/* Play Icon Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <PlayCircle size={48} className="text-white drop-shadow-lg" />
              </div>
            </div>
            
            {/* Card Content */}
            <div className="p-4 space-y-3">
              {/* Student Name */}
              <div className="text-sm font-medium text-foreground truncate">
                {video.student?.raw_user_meta_data?.full_name || 
                 video.student?.raw_user_meta_data?.name || 
                 video.student?.email || 
                 'Unknown Student'}
              </div>
              
              {/* Exercise Tag */}
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-normal bg-primary/15 text-primary border border-primary/30">
                  {video.exercise_name}
                </span>
              </div>
              
              {/* Set Info & Date */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Série {video.set_number}/3</span>
                <span>{video.created_at ? format(new Date(video.created_at), 'd MMM yyyy', { locale: fr }) : 'N/A'}</span>
              </div>
              
              {/* Status Badge */}
              <div className="flex justify-end pt-1">
                {video.status === 'pending' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    A feedback
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    Complété
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
  };

  const renderCoachResources = () => {
    // Filter resources based on selected folder
    const filteredResources = selectedFolder 
      ? coachResources.filter(video => video.folderId === selectedFolder)
      : coachResources;

    return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredResources.map(video => (
        <div key={video.id} className="bg-card border border-border/20 rounded-xl overflow-hidden group cursor-pointer hover:border-primary/30 hover:shadow-lg transition-all duration-200">
          <div 
            onClick={() => handleCoachResourceClick(video)}
            className="block aspect-video bg-muted relative overflow-hidden"
          >
            <video src={video.fileUrl || undefined} className="w-full h-full object-cover" preload="metadata"></video>
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <PlayCircle size={48} className="text-white drop-shadow-lg" />
            </div>
          </div>
          <div className="p-4 space-y-2">
            <h3 
              className="font-medium text-base text-foreground truncate hover:text-primary transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleCoachResourceClick(video);
              }}
            >
              {video.title || video.fileName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {folders.find(f => f.id === video.folderId)?.name || 'Non classé'}
            </p>
            <p className="text-xs text-muted-foreground/60">{video.createdAt ? format(new Date(video.createdAt), 'd MMM yyyy', { locale: fr }) : 'N/A'}</p>
          </div>
        </div>
      ))}
    </div>
  );
  };

  // Show student view if user is a student
  if (hasRole('student')) {
    return <StudentVideoLibrary />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main Content */}
      <div className="px-10 pt-6 pb-20 w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[32px] font-extralight text-foreground mb-6">Vidéothèque</h1>
          
          {/* Tabs */}
          <div className="flex gap-8 border-b border-border/20 mb-6">
            <button
              onClick={() => setActiveTab('clients')}
              className={`pb-3 text-base font-light transition-colors relative ${
                activeTab === 'clients' 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Vidéos clients
              {activeTab === 'clients' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('coach')}
              className={`pb-3 text-base font-light transition-colors relative ${
                activeTab === 'coach' 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ressources coach
              {activeTab === 'coach' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          </div>
        </div>

        {activeTab === 'clients' && (
          <>
            {/* Filters Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Status Filter Chips */}
                <StatusFilterChips value={statusFilter} onChange={setStatus} />
                
                <div className="w-px h-6 bg-border/40"></div>
                
                {/* Client Filter */}
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="px-3 py-2 bg-card border border-border/20 rounded-lg text-foreground text-sm hover:bg-muted/50 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='hsl(var(--muted-foreground))' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '28px'
                  }}
                >
                  <option value="">Tous</option>
                  {uniqueStudents.map(studentEmail => (
                    <option key={studentEmail} value={studentEmail}>
                      {studentMap.get(studentEmail) || studentEmail}
                    </option>
                  ))}
                </select>

                {/* Exercice Filter */}
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="px-3 py-2 bg-card border border-border/20 rounded-lg text-foreground text-sm hover:bg-muted/50 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='hsl(var(--muted-foreground))' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '28px'
                  }}
                >
                  <option value="">Exercice</option>
                  {uniqueExercises.map(exercise => (
                    <option key={exercise} value={exercise}>{exercise}</option>
                  ))}
                </select>

                {/* Date Filter */}
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-card border border-border/20 rounded-lg text-foreground text-sm hover:bg-muted/50 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L4 4L7 1' stroke='hsl(var(--muted-foreground))' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    paddingRight: '28px'
                  }}
                >
                  <option value="">Date</option>
                  {/* Add date options here if needed */}
                </select>
              </div>

              {/* Count */}
              <div className="text-sm text-muted-foreground">
                {filteredVideos.length} vidéo{filteredVideos.length !== 1 ? 's' : ''}
              </div>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Chargement des vidéos...</div>
              </div>
            )}
            
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
                <div className="text-destructive">Erreur: {error}</div>
              </div>
            )}
            
            {!loading && !error && (
              filteredVideos.length > 0 ? (
                renderStudentVideosGrouped()
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-80">
                  <Video size={48} className="mb-4 opacity-30" />
                  {statusFilter === 'pending' ? (
                    <>
                      <p className="font-light text-base text-foreground">Aucune vidéo à traiter</p>
                      <p className="text-sm text-muted-foreground/70">Toutes les vidéos ont reçu un feedback</p>
                    </>
                  ) : statusFilter === 'completed' ? (
                    <>
                      <p className="font-light text-base text-foreground">Aucune vidéo complétée</p>
                      <p className="text-sm text-muted-foreground/70">Les vidéos avec feedback apparaîtront ici</p>
                    </>
                  ) : (
                    <>
                      <p className="font-light text-base text-foreground">Aucune vidéo trouvée</p>
                      <p className="text-sm text-muted-foreground/70">Les vidéos de vos clients apparaîtront ici</p>
                    </>
                  )}
                </div>
              )
            )}
          </>
        )}

        {activeTab === 'coach' && (
          <>
            {/* Filters and Actions */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {folders.map(folder => (
                  <div key={folder.id} className="relative group">
                    <Button 
                      variant="outline"
                      onClick={() => handleFolderSelect(folder.id)}
                      className={`bg-card border-border/20 text-foreground hover:bg-muted pr-8 ${
                        selectedFolder === folder.id 
                          ? 'border-primary bg-primary/10 text-primary' 
                          : ''
                      }`}
                    >
                      {folder.name}
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Supprimer le dossier"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="text-muted-foreground hover:text-foreground" 
                  onClick={() => setIsFolderModalOpen(true)}
                >
                  <FolderPlus size={16} className="mr-2"/>
                  nouveau dossier
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <LayoutGrid size={20} />
                </Button>
                <Button 
                  onClick={() => setIsUploadModalOpen(true)} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus size={16} className="mr-2"/>
                  Ajouter une vidéo
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {selectedFolder 
                ? coachResources.filter(video => video.folderId === selectedFolder).length 
                : coachResources.length
              } ressources{selectedFolder ? ` dans ${folders.find(f => f.id === selectedFolder)?.name}` : ''}
            </p>

            {loading && <p className="text-muted-foreground">Chargement...</p>}
            {error && <p className="text-destructive">Erreur: {error}</p>}
            {!loading && !error && (
              (selectedFolder 
                ? coachResources.filter(video => video.folderId === selectedFolder).length > 0
                : coachResources.length > 0
              ) ? renderCoachResources() : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-80">
                  <Video size={48} className="mb-4 opacity-30" />
                  <p className="font-light text-base text-foreground">Aucune vidéo trouvée</p>
                  <p className="text-sm text-muted-foreground/70">Vos ressources téléchargées apparaîtront ici.</p>
                </div>
              )
            )}
          </>
        )}
      </div>

      <UploadVideoModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        folders={folders}
      />

      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Créer un nouveau dossier</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Entrez un nom pour votre nouveau dossier pour organiser vos ressources.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder}>
            <div className="py-4">
              <Input
                placeholder="Nom du dossier"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="bg-background border-border text-foreground"
              />
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsFolderModalOpen(false)}
                className="border-border"
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Créer le dossier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Video Detail Modal */}
      <VideoDetailModal 
        isOpen={isVideoDetailModalOpen}
        onClose={() => {
          setIsVideoDetailModalOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
        onFeedbackUpdate={handleFeedbackUpdate}
        videoType="student"
        isCoachView={true}
      />

      {/* Coach Resource Modal */}
      <CoachResourceModal 
        isOpen={isCoachResourceModalOpen}
        onClose={() => {
          setIsCoachResourceModalOpen(false);
          setSelectedCoachResource(null);
        }}
        video={selectedCoachResource}
        onFeedbackUpdate={handleFeedbackUpdate}
      />
    </div>
  );
};

export default VideoLibrary;