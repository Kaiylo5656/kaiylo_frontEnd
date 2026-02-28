import logger from '../utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import { PlayCircle, ChevronRight, Video, Upload, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import StudentVideoDetailModal from './StudentVideoDetailModal';
import CoachResourceModal from './CoachResourceModal';

const StudentVideoLibrary = () => {
  const [activeTab, setActiveTab] = useState('mes-videos'); // 'mes-videos' or 'ressource'
  const [myVideos, setMyVideos] = useState([]);
  const [coachResources, setCoachResources] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [openSessions, setOpenSessions] = useState({}); // Track which sessions are open

  // Pagination states
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalVideos, setTotalVideos] = useState(0);
  const PAGE_SIZE = 30;
  const loadMoreRef = useRef(null);

  // Modal states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);
  const [selectedCoachResource, setSelectedCoachResource] = useState(null);
  const [isCoachResourceModalOpen, setIsCoachResourceModalOpen] = useState(false);

  const { getAuthToken, refreshAuthToken } = useAuth();

  useEffect(() => {
    if (activeTab === 'mes-videos') {
      fetchMyVideos();
    } else {
      fetchCoachResources();
    }
  }, [activeTab]);

  // Re-fetch when server-side filters change (reset pagination)
  useEffect(() => {
    if (activeTab !== 'mes-videos') return;
    fetchMyVideos(false);
  }, [statusFilter, exerciseFilter]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreVideos();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  const fetchMyVideos = async (append = false) => {
    if (!append) {
      setLoading(true);
    }
    setError(null);
    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) {
        logger.warn('No auth token for student videos fetch; skipping.');
        setMyVideos([]);
        return;
      }

      const currentOffset = append ? myVideos.length : 0;
      const params = new URLSearchParams();
      params.set('limit', PAGE_SIZE);
      params.set('offset', currentOffset);
      if (statusFilter === 'En attente') params.set('status', 'pending');
      if (statusFilter === 'Feedback reçu') params.set('status', 'completed');
      if (exerciseFilter) params.set('exerciseName', exerciseFilter);

      const response = await axios.get(
        buildApiUrl(`/workout-sessions/student-videos?${params.toString()}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        const newData = response.data.data;
        const total = response.data.total || 0;
        setTotalVideos(total);

        if (append) {
          setMyVideos(prev => [...prev, ...newData]);
        } else {
          setMyVideos(newData);
        }
        setHasMore(currentOffset + newData.length < total);
      } else {
        throw new Error(response.data.message || 'Failed to fetch videos');
      }
    } catch (err) {
      logger.error('Error fetching student videos:', err);
      setError('Erreur lors du chargement de vos vidéos');
    } finally {
      setLoading(false);
    }
  };

  // Load more videos (infinite scroll)
  const loadMoreVideos = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchMyVideos(true);
    setLoadingMore(false);
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
        logger.warn('No auth token for coach resources fetch; skipping.');
        setCoachResources([]);
        setFolders([]);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      
      const [resourcesResponse, foldersResponse] = await Promise.all([
        axios.get(buildApiUrl('/resources/student'), { headers }),
        axios.get(buildApiUrl('/resources/folders/student'), { headers })
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
      logger.error('Error fetching coach resources:', err);
      setError('Erreur lors du chargement des ressources');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setIsVideoDetailModalOpen(true);
  };

  const handleCoachResourceClick = (resource) => {
    // Map coach resource data to the format expected by CoachResourceModal
    const mappedResource = {
      id: resource.id,
      title: resource.title || resource.fileName,
      video_url: resource.fileUrl,
      video_filename: resource.fileName,
      description: resource.description || '',
      folder_name: resource.folderName || (folders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'),
      created_at: resource.createdAt
    };
    
    setSelectedCoachResource(mappedResource);
    setIsCoachResourceModalOpen(true);
  };

  const handleFeedbackUpdate = (videoId, feedback, rating, deleted = false, status = 'completed', audioUrl = null) => {
    if (deleted) {
      setMyVideos(prev => prev.filter(v => v.id !== videoId));
      setIsVideoDetailModalOpen(false);
      setSelectedVideo(null);
    } else {
      setMyVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, coach_feedback: feedback, coach_feedback_audio_url: audioUrl, coach_rating: rating, status: status }
          : v
      ));
    }
  };

  // Get resources filtered by selected folder
  const getFilteredResources = () => {
    if (selectedFolder) {
      return coachResources.filter(resource => resource.folderId === selectedFolder);
    }
    return coachResources;
  };

  // Get unique exercises for my videos
  const getUniqueExercises = () => {
    const exercises = [...new Set(myVideos.map(video => video.exercise_name))];
    return exercises;
  };

  // Filter videos based on search term and filters
  const getFilteredVideos = () => {
    return myVideos.filter(video => {
      // Search term filter
      if (searchTerm && !video.exercise_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Status filter
      if (statusFilter === 'En attente' && video.status !== 'pending') return false;
      if (statusFilter === 'Feedback reçu' && video.status !== 'completed' && video.status !== 'reviewed') return false;
      
      // Exercise filter
      if (exerciseFilter && video.exercise_name !== exerciseFilter) return false;
      
      // Date filter
      if (dateFilter) {
        const videoDate = format(new Date(video.created_at), 'yyyy-MM-dd');
        if (videoDate !== dateFilter) return false;
      }
      
      return true;
    });
  };

  // Filter coach resources based on search term
  const getFilteredCoachResources = () => {
    if (!searchTerm) return getFilteredResources();
    
    return getFilteredResources().filter(resource => 
      (resource.title && resource.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (resource.fileName && resource.fileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Group videos by workout session (using useMemo for performance)
  const groupedVideosBySession = React.useMemo(() => {
    const filteredVideos = getFilteredVideos();
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
          videos: []
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
  }, [myVideos, searchTerm, statusFilter, exerciseFilter, dateFilter]);

  // Toggle session open/closed
  const toggleSession = (sessionId) => {
    setOpenSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <div className="flex items-center justify-center py-8">
        <h1 className="text-2xl font-medium text-white">Vidéothèque</h1>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Rechercher une vidéo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e87c3e]"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="px-4 mb-6">
        <div className="flex gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e87c3e]"
          >
            <option value="">Tous les statuts</option>
            <option value="En attente">En attente</option>
            <option value="Feedback reçu">Feedback reçu</option>
          </select>

          {/* Exercise Filter */}
          <select
            value={exerciseFilter}
            onChange={(e) => setExerciseFilter(e.target.value)}
            className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e87c3e]"
          >
            <option value="">Tous les exercices</option>
            {getUniqueExercises().map(exercise => (
              <option key={exercise} value={exercise}>{exercise}</option>
            ))}
          </select>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#e87c3e]"
              placeholder="jj/mm/aaaa"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-xs text-[#D4845A]/90 font-normal">
          {getFilteredVideos().length} vidéo{getFilteredVideos().length > 1 ? 's' : ''}{totalVideos > getFilteredVideos().length ? ` sur ${totalVideos}` : ''} trouvée{getFilteredVideos().length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Tab Navigation - Centered Pill Buttons */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-white/10 border border-white/20 rounded-full p-1">
          <button
            onClick={() => setActiveTab('mes-videos')}
            className={`px-6 py-3 text-sm font-light rounded-full transition-all duration-200 ${
              activeTab === 'mes-videos' 
                ? 'bg-[#e87c3e] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
            style={activeTab === 'mes-videos' ? { backgroundColor: 'rgba(212, 132, 90, 1)' } : {}}
          >
            Mes vidéos
          </button>
          <button
            onClick={() => setActiveTab('ressource')}
            className={`px-6 py-3 text-sm font-light rounded-full transition-all duration-200 ${
              activeTab === 'ressource' 
                ? 'bg-[#e87c3e] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ressource
          </button>
        </div>
      </div>

      {/* Main Content - loading overlay only here */}
      <div className="px-4 relative min-h-[320px]">
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
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-400 mb-4">{error}</div>
          </div>
        ) : activeTab === 'mes-videos' && (
          <div className="space-y-4">
            {groupedVideosBySession.length > 0 ? (
              <>
              {groupedVideosBySession.map((session) => {
                const isOpen = openSessions[session.sessionId];
                const sessionTitle = `${session.sessionName} - ${format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr })}`;

                return (
                  <div
                    key={session.sessionId}
                    className="border border-white/10 rounded-[20px] overflow-hidden bg-white/5"
                  >
                    {/* Session Header (Clickable) */}
                    <div 
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors bg-transparent"
                      onClick={() => toggleSession(session.sessionId)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                        <ChevronRight 
                          size={20} 
                          className={`text-white/50 transition-transform flex-shrink-0 ${
                            isOpen ? 'rotate-90' : ''
                          }`} 
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-light text-base">{sessionTitle}</h3>
                          <p className="mt-1" style={{ fontSize: '13px', fontWeight: 300, color: 'var(--kaiylo-primary-hex)' }}>
                            {session.videos.length} vidéo{session.videos.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {session.videos.some(v => v.status === 'pending') && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {session.videos.filter(v => v.status === 'pending').length} en attente
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
                      <div className="border-t border-white/10">
                        <div className="p-4 space-y-3">
                          {session.videos.map((video) => (
                            <div 
                              key={video.id} 
                              className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 hover:bg-[#262626] transition-colors cursor-pointer"
                              onClick={() => handleVideoClick(video)}
                            >
                              <div className="flex items-center gap-4">
                                {/* Video Thumbnail */}
                                <div className="relative w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                                  {video.video_url ? (
                                    <>
                                      <video
                                        src={video.video_url + '#t=0.1'}
                                        className="w-full h-full object-cover"
                                        preload="none"
                                        playsInline
                                        muted
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                                        <PlayCircle size={24} className="text-white" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                      <Video size={24} className="text-gray-500" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Video Info */}
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  {/* Exercise Tag */}
                                  <div className="mb-2">
                                    <span className="inline-block bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm font-medium truncate max-w-full">
                                      {video.exercise_name}
                                    </span>
                                  </div>
                                  
                                  {/* Series and Date */}
                                  <div className="text-gray-400 text-sm">
                                    Série {video.set_number || 1}/{video.total_sets || '?'}
                                  </div>
                                  <div className="text-gray-400 text-sm">
                                    {format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}
                                  </div>
                                </div>
                                
                                {/* Status Tag */}
                                <div className="flex-shrink-0">
                                  {video.status === 'pending' ? (
                                    <span className="inline-block bg-orange-500 text-white px-3 py-1 rounded-lg text-sm font-medium">
                                      A feedback
                                    </span>
                                  ) : (
                                    <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                                      Complété
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Infinite scroll sentinel */}
              <div ref={loadMoreRef} className="h-4" />
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div
                    className="rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: '#d4845a', borderRightColor: '#d4845a', width: '28px', height: '28px' }}
                  />
                </div>
              )}
              {!hasMore && myVideos.length > 0 && (
                <div className="text-center py-3 text-xs text-gray-500">
                  Toutes les vidéos ont été chargées
                </div>
              )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-gray-400 h-80">
                <Video size={48} className="mb-4 opacity-30" />
                {searchTerm ? (
                  <>
                    <p className="font-medium">Aucune vidéo trouvée</p>
                    <p className="text-sm">Aucune vidéo ne correspond à votre recherche "{searchTerm}".</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Aucune vidéo envoyée</p>
                    <p className="text-sm">Vos vidéos d'exercices apparaîtront ici après envoi au coach.</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ressource' && !loading && !error && (
          <div className="space-y-4">
            {/* Folder List */}
            {folders.map(folder => {
              const folderResources = coachResources.filter(resource => resource.folderId === folder.id);
              return (
                <div 
                  key={folder.id}
                  className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 hover:bg-[#262626] transition-colors cursor-pointer"
                  onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight 
                        size={20} 
                        className={`text-gray-400 transition-transform ${
                          selectedFolder === folder.id ? 'rotate-90' : ''
                        }`} 
                      />
                      <span className="text-white font-medium">{folder.name}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{folderResources.length}</span>
                  </div>
                </div>
              );
            })}

            {/* Resources in Selected Folder */}
            {selectedFolder && (
              <div className="ml-4 space-y-3">
                {getFilteredCoachResources().map(resource => (
                  <div 
                    key={resource.id}
                    className="bg-[#262626] rounded-lg border border-[#404040] p-4 hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                    onClick={() => handleCoachResourceClick(resource)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Video Thumbnail */}
                      <div className="relative w-24 h-16 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                        {resource.fileUrl ? (
                          <video
                            src={resource.fileUrl + '#t=0.1'}
                            className="w-full h-full object-cover"
                            preload="none"
                            playsInline
                            muted
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                            <Video size={20} className="text-gray-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                          <PlayCircle size={20} className="text-white" />
                        </div>
                      </div>
                      
                      {/* Resource Info */}
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="text-white font-medium truncate hover:text-[#e87c3e] transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCoachResourceClick(resource);
                          }}
                        >
                          {resource.title || resource.fileName}
                        </h3>
                        {resource.description && (
                          <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {folders.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center text-gray-400 h-80">
                <Video size={48} className="mb-4" />
                {searchTerm ? (
                  <>
                    <p className="font-medium">Aucune ressource trouvée</p>
                    <p className="text-sm">Aucune ressource ne correspond à votre recherche "{searchTerm}".</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Aucune ressource disponible</p>
                    <p className="text-sm">Votre coach n'a pas encore partagé de ressources.</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentVideoDetailModal 
        isOpen={isVideoDetailModalOpen}
        onClose={() => {
          setIsVideoDetailModalOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
        onFeedbackUpdate={handleFeedbackUpdate}
      />

      <CoachResourceModal 
        isOpen={isCoachResourceModalOpen}
        onClose={() => {
          setIsCoachResourceModalOpen(false);
          setSelectedCoachResource(null);
        }}
        video={selectedCoachResource}
        onFeedbackUpdate={() => {}} // No feedback updates for coach resources in student view
        studentView
      />
    </div>
  );
};

export default StudentVideoLibrary;
