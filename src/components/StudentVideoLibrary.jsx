import React, { useState, useEffect } from 'react';
import { PlayCircle, ChevronRight, Video, Upload, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import VideoDetailModal from './VideoDetailModal';
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
  
  // Modal states
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isVideoDetailModalOpen, setIsVideoDetailModalOpen] = useState(false);
  const [selectedCoachResource, setSelectedCoachResource] = useState(null);
  const [isCoachResourceModalOpen, setIsCoachResourceModalOpen] = useState(false);

  const { getAuthToken } = useAuth();

  useEffect(() => {
    if (activeTab === 'mes-videos') {
      fetchMyVideos();
    } else {
      fetchCoachResources();
    }
  }, [activeTab]);

  const fetchMyVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await axios.get(
        buildApiUrl('/workout-sessions/student-videos'),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setMyVideos(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch videos');
      }
    } catch (err) {
      console.error('Error fetching student videos:', err);
      setError('Erreur lors du chargement de vos vidéos');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoachResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
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
      console.error('Error fetching coach resources:', err);
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

  const handleFeedbackUpdate = (videoId, feedback, rating, deleted = false, status = 'completed') => {
    if (deleted) {
      setMyVideos(prev => prev.filter(v => v.id !== videoId));
      setIsVideoDetailModalOpen(false);
      setSelectedVideo(null);
    } else {
      setMyVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, coach_feedback: feedback, coach_rating: rating, status: status }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

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
        <div className="mt-3 text-sm text-gray-400">
          {getFilteredVideos().length} vidéo{getFilteredVideos().length > 1 ? 's' : ''} trouvée{getFilteredVideos().length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Tab Navigation - Centered Pill Buttons */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-[#1a1a1a] border border-[#262626] rounded-full p-1">
          <button
            onClick={() => setActiveTab('mes-videos')}
            className={`px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
              activeTab === 'mes-videos' 
                ? 'bg-[#e87c3e] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mes vidéos
          </button>
          <button
            onClick={() => setActiveTab('ressource')}
            className={`px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
              activeTab === 'ressource' 
                ? 'bg-[#e87c3e] text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Ressource
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4">
        {activeTab === 'mes-videos' && (
          <div className="space-y-4">
            {getFilteredVideos().length > 0 ? (
              getFilteredVideos().map((video) => (
                <div 
                  key={video.id} 
                  className="bg-[#1a1a1a] rounded-lg border border-[#262626] p-4 hover:bg-[#262626] transition-colors cursor-pointer"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="flex items-center gap-4">
                    {/* Video Thumbnail */}
                    <div className="relative w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                      <video 
                        src={video.video_url}
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
                      <div className="duration-display absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded">
                        Loading...
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-30">
                        <PlayCircle size={24} className="text-white" />
                      </div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="flex-1 min-w-0">
                      {/* Exercise Tag */}
                      <div className="mb-2">
                        <span className="inline-block bg-gray-700 text-gray-300 px-3 py-1 rounded-lg text-sm font-medium">
                          {video.exercise_name}
                        </span>
                      </div>
                      
                      {/* Series and Date */}
                      <div className="text-gray-400 text-sm">
                        Série {video.set_number || 1}/3
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
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-gray-400 h-80">
                <Upload size={48} className="mb-4" />
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

        {activeTab === 'ressource' && (
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
                        <video 
                          src={resource.fileUrl}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
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
      <VideoDetailModal 
        isOpen={isVideoDetailModalOpen}
        onClose={() => {
          setIsVideoDetailModalOpen(false);
          setSelectedVideo(null);
        }}
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
