import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  PlayCircle, 
  Calendar, 
  Clock, 
  MessageSquare, 
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Video,
  Folder
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VideoDetailModal from '../components/VideoDetailModal';
import CoachResourceModal from '../components/CoachResourceModal';

const StudentVideoLibrary = () => {
  const { user, getAuthToken } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [exerciseFilter, setExerciseFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('mes-videos'); // 'mes-videos' or 'ressource'
  
  // Coach resources state
  const [coachResources, setCoachResources] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  
  // Coach resource modal state
  const [selectedCoachResource, setSelectedCoachResource] = useState(null);
  const [isCoachResourceModalOpen, setIsCoachResourceModalOpen] = useState(false);

  useEffect(() => {
    fetchStudentVideos();
  }, []);

  useEffect(() => {
    if (activeTab === 'ressource') {
      fetchCoachResources();
    }
  }, [activeTab]);

  const fetchStudentVideos = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await axios.get(
        `${getApiBaseUrlWithApi()}/workout-sessions/student-videos`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setVideos(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching student videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachResources = async () => {
    setResourcesLoading(true);
    try {
      const token = await getAuthToken();
      
      console.log('🔍 Fetching coach resources for student...');
      
      // Fetch both resources and folders
      const [resourcesResponse, foldersResponse] = await Promise.all([
        axios.get(`${getApiBaseUrlWithApi()}/resources/student`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${getApiBaseUrlWithApi()}/resources/folders/student`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      console.log('📁 Resources response:', resourcesResponse.data);
      console.log('📂 Folders response:', foldersResponse.data);

      if (resourcesResponse.data.success) {
        setCoachResources(resourcesResponse.data.data);
        console.log('✅ Set coach resources:', resourcesResponse.data.data);
      }
      
      if (foldersResponse.data.success) {
        setFolders(foldersResponse.data.data);
        console.log('✅ Set folders:', foldersResponse.data.data);
      }
    } catch (error) {
      console.error('❌ Error fetching coach resources:', error);
      console.error('❌ Error details:', error.response?.data);
    } finally {
      setResourcesLoading(false);
    }
  };

  // Filter videos based on current filters
  const getFilteredVideos = () => {
    return videos.filter(video => {
      // Search term filter
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase().trim();
        const exerciseMatch = video.exercise_name?.toLowerCase().includes(searchLower);
        const dateMatch = video.created_at ? format(new Date(video.created_at), 'dd/MM/yyyy', { locale: fr }).includes(searchLower) : false;
        
        if (!exerciseMatch && !dateMatch) return false;
      }
      
      // Status filter
      if (statusFilter === 'pending' && video.status !== 'pending') return false;
      if (statusFilter === 'completed' && video.status !== 'completed' && video.status !== 'reviewed') return false;
      
      // Exercise filter
      if (exerciseFilter && !video.exercise_name.toLowerCase().includes(exerciseFilter.toLowerCase())) return false;
      
      // Date filter
      if (dateFilter) {
        const videoDate = format(new Date(video.created_at), 'yyyy-MM-dd');
        if (videoDate !== dateFilter) return false;
      }
      
      return true;
    });
  };

  // Get unique exercises for filter dropdown
  const getUniqueExercises = () => {
    const exercises = [...new Set(videos.map(video => video.exercise_name))];
    return exercises;
  };

  // Handle video click
  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setIsVideoDetailModalOpen(true);
  };

  // Handle feedback update
  const handleFeedbackUpdate = (videoId, feedback, rating, deleted = false, status = 'completed') => {
    if (deleted) {
      // Remove video from list if deleted
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setIsVideoDetailModalOpen(false);
      setSelectedVideo(null);
    } else {
      // Update video feedback in the list
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, coach_feedback: feedback, coach_rating: rating, status: status }
          : v
      ));
    }
  };

  // Handle coach resource click
  const handleCoachResourceClick = (resource) => {
    // Map coach resource data to the format expected by CoachResourceModal
    const mappedResource = {
      id: resource.id,
      title: resource.title || resource.fileName,
      video_url: resource.fileUrl,
      video_filename: resource.fileName,
      description: resource.description || '',
      folder_name: resource.folderName || (folders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'),
      created_at: resource.createdAt,
      fileUrl: resource.fileUrl
    };
    
    setSelectedCoachResource(mappedResource);
    setIsCoachResourceModalOpen(true);
  };

  // Get status badge for videos
  const getStatusBadge = (status, coachFeedback) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-500 text-white">
            <AlertCircle className="w-4 h-4 mr-1" />
            En attente
          </span>
        );
      case 'reviewed':
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-600 text-white">
            <CheckCircle className="w-4 h-4 mr-1" />
            Feedback reçu
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

  const filteredVideos = getFilteredVideos();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement des vidéos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1a]">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-medium">Ma Vidéothèque</h1>
      </div>

      {/* Search and Filters - Only show for "Mes vidéos" tab */}
      {activeTab === 'mes-videos' && (
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une vidéo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#262626] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="completed">Feedback reçu</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Exercise Filter */}
            <div className="relative">
              <select
                value={exerciseFilter}
                onChange={(e) => setExerciseFilter(e.target.value)}
                className="appearance-none bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-orange-500"
              >
                <option value="">Tous les exercices</option>
                {getUniqueExercises().map(exercise => (
                  <option key={exercise} value={exercise}>{exercise}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Video Count */}
          <div className="text-sm text-gray-400">
            {filteredVideos.length} vidéo{filteredVideos.length > 1 ? 's' : ''} trouvée{filteredVideos.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-4 mb-6">
        <div className="flex bg-[#1a1a1a] border border-[#262626] rounded-full p-1">
          <button
            onClick={() => setActiveTab('mes-videos')}
            className={`flex-1 px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
              activeTab === 'mes-videos' 
                ? 'bg-[#e87c3e] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mes vidéos
          </button>
          <button
            onClick={() => setActiveTab('ressource')}
            className={`flex-1 px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
              activeTab === 'ressource' 
                ? 'bg-[#e87c3e] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ressource
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      <div className="px-4 pb-20">
        {activeTab === 'mes-videos' ? (
          // Mes vidéos tab content
          filteredVideos.length > 0 ? (
            <div className="space-y-4">
              {filteredVideos.map((video) => (
                <div 
                  key={video.id} 
                  className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 hover:bg-[#262626] transition-colors cursor-pointer"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="flex items-start gap-4">
                    {/* Video Thumbnail */}
                    <div className="relative w-24 h-16 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                      <video 
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        onLoadedMetadata={(e) => {
                          // Update the video duration when metadata loads
                          const duration = e.target.duration;
                          if (duration && !isNaN(duration)) {
                            const minutes = Math.floor(duration / 60);
                            const seconds = Math.floor(duration % 60);
                            const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                            e.target.parentElement.querySelector('.duration-display').textContent = timeDisplay;
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                        <PlayCircle size={20} className="text-white" />
                      </div>
                      <div className="duration-display absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                        Loading...
                      </div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="text-white font-medium truncate">
                            {video.exercise_name}
                          </h3>
                          <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                            <span>№ {video.set_number || 1}/3</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}</span>
                            </div>
                          </div>
                          
                          {/* Status Badge - moved under exercise name */}
                          {!video.coach_feedback && (
                            <div className="mt-2">
                              {getStatusBadge(video.status, video.coach_feedback)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Coach Feedback */}
                      {video.coach_feedback && (
                        <div className="mt-3 p-3 bg-[#262626] rounded-lg border-l-4 border-orange-500">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-500">Feedback du coach</span>
                          </div>
                          <p className="text-gray-300 text-sm">{video.coach_feedback}</p>
                          {video.coach_rating && (
                            <div className="mt-2 flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-3 h-3 rounded-full ${
                                    i < video.coach_rating 
                                      ? 'bg-orange-500' 
                                      : 'bg-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {/* Status badge moved here under feedback */}
                          <div className="mt-3">
                            {getStatusBadge(video.status, video.coach_feedback)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12">
              <Video className="w-16 h-16 mb-4 text-gray-600" />
              <h3 className="text-lg font-medium mb-2">Aucune vidéo trouvée</h3>
              <p className="text-sm">
                {searchTerm || statusFilter || exerciseFilter || dateFilter
                  ? 'Aucune vidéo ne correspond à vos critères de recherche.'
                  : 'Vous n\'avez pas encore envoyé de vidéos à votre coach.'}
              </p>
            </div>
          )
        ) : (
          // Ressource tab content
          resourcesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                // Group resources by their folders
                const folderMap = new Map();
                
                // Initialize folders from the fetched folders
                folders.forEach(folder => {
                  folderMap.set(folder.id, {
                    ...folder,
                    resources: []
                  });
                });
                
                // Group resources by folder
                coachResources.forEach(resource => {
                  const folderId = resource.folderId || resource.folder_id;
                  
                  if (folderId && folderMap.has(folderId)) {
                    folderMap.get(folderId).resources.push(resource);
                  } else {
                    // Resources without folders go to "Uncategorized"
                    if (!folderMap.has('uncategorized')) {
                      folderMap.set('uncategorized', {
                        id: 'uncategorized',
                        name: 'Uncategorized',
                        resources: []
                      });
                    }
                    folderMap.get('uncategorized').resources.push(resource);
                  }
                });
                
                // Convert map to array for display, filtering out empty folders
                const displayFolders = Array.from(folderMap.values()).filter(folder => folder.resources.length > 0);
                
                return displayFolders.map(folder => (
                  <div key={folder.id}>
                    {/* Folder Header */}
                    <div 
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
                        <span className="text-gray-400 text-sm">{folder.resources.length}</span>
                      </div>
                    </div>
                    
                    {/* Folder Resources */}
                    {selectedFolder === folder.id && folder.resources.length > 0 && (
                      <div className="mt-2 ml-4 space-y-2">
                        {folder.resources.map(resource => (
                          <div 
                            key={resource.id}
                            className="bg-[#262626] rounded-lg border border-[#404040] p-3 hover:bg-[#2a2a2a] transition-colors cursor-pointer"
                            onClick={() => handleCoachResourceClick(resource)}
                          >
                            <div className="flex items-center gap-3">
                              {/* Video Thumbnail */}
                              <div className="relative w-16 h-12 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                                <video 
                                  src={resource.fileUrl}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                                  <PlayCircle size={16} className="text-white" />
                                </div>
                              </div>
                              
                              {/* Resource Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-white font-medium truncate text-sm">
                                  {resource.title || resource.fileName}
                                </h4>
                                {resource.description && (
                                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                                    {resource.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ));
              })()}
              
              {coachResources.length === 0 && (
                // No resources at all
                <div className="flex flex-col items-center justify-center text-center text-gray-400 py-12">
                  <Folder className="w-16 h-16 mb-4 text-gray-600" />
                  <h3 className="text-lg font-medium mb-2">Aucune ressource disponible</h3>
                  <p className="text-sm">Votre coach n'a pas encore partagé de ressources.</p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <VideoDetailModal 
        isOpen={isVideoDetailModalOpen}
        onClose={() => setIsVideoDetailModalOpen(false)}
        video={selectedVideo}
        onFeedbackUpdate={handleFeedbackUpdate}
        videoType="student"
        isCoachView={false}
      />

      <CoachResourceModal 
        isOpen={isCoachResourceModalOpen}
        onClose={() => {
          setIsCoachResourceModalOpen(false);
          setSelectedCoachResource(null);
        }}
        video={selectedCoachResource}
        onFeedbackUpdate={() => {}} // No feedback updates for coach resources in student view
      />
    </div>
  );
};

export default StudentVideoLibrary;
