import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrlWithApi } from '../config/api';
import axios from 'axios';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  PlayCircle, 
  Clock, 
  MessageSquare, 
  Search,
  Filter,
  ChevronRight,
  Video,
  Folder
} from 'lucide-react';

// Custom ChevronDown Icon Component
const ChevronDownIcon = ({ className, style }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 384 512"
    className={className}
    style={style}
    fill="currentColor"
  >
    <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
  </svg>
);
import { useNavigate } from 'react-router-dom';
import StudentVideoDetailModal from '../components/StudentVideoDetailModal';
import CoachResourceModal from '../components/CoachResourceModal';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const [openSessions, setOpenSessions] = useState({}); // Track which sessions are open
  
  // Dropdown states
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);
  
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative.flex-1')) {
        setIsStatusDropdownOpen(false);
        setIsExerciseDropdownOpen(false);
      }
    };

    if (isStatusDropdownOpen || isExerciseDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isStatusDropdownOpen, isExerciseDropdownOpen]);

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
  }, [videos, searchTerm, statusFilter, exerciseFilter, dateFilter]);

  // Toggle session open/closed
  const toggleSession = (sessionId) => {
    setOpenSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
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

  // Get weight and reps from video data
  const getVideoWeightAndReps = (video) => {
    // Try direct properties first
    let weight = video.weight || video.target_weight || video.requested_weight;
    let reps = video.reps || video.target_reps || video.requested_reps;
    
    // If not found, try to get from assignment workout session
    if ((!weight || !reps) && video.assignment?.workout_session?.exercises) {
      const exerciseName = video.exercise_name;
      const setNumber = video.set_number || 1;
      
      for (const exercise of video.assignment.workout_session.exercises) {
        if (exercise.name === exerciseName && exercise.sets && exercise.sets[setNumber - 1]) {
          const set = exercise.sets[setNumber - 1];
          weight = weight || set.weight || set.target_weight;
          reps = reps || set.reps || set.target_reps;
          break;
        }
      }
    }
    
    return { weight: weight || 0, reps: reps || 0 };
  };

  // Get status badge for videos
  const getStatusBadge = (status, coachFeedback) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
            En attente
          </span>
        );
      case 'reviewed':
      case 'completed':
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
            Complété
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light bg-gray-600 text-gray-200">
            {status}
          </span>
        );
    }
  };

  const filteredVideos = getFilteredVideos();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-white relative overflow-hidden"
      style={{
        background: 'unset',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'none'
      }}
    >
      {/* Image de fond */}
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1,
          backgroundColor: '#0a0a0a'
        }}
      />
      
      {/* Layer blur sur l'écran */}
      <div 
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(100px)',
          backgroundColor: 'rgba(0, 0, 0, 0.01)',
          zIndex: 6,
          pointerEvents: 'none',
          opacity: 1
        }}
      />

      {/* Gradient conique Figma - partie droite */}
      <div 
        style={{
          position: 'absolute',
          top: '-175px',
          left: '0',
          transform: 'translateY(-50%)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          boxShadow: 'none',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite'
        }}
      />
      
      {/* Gradient conique Figma - partie gauche (symétrie axiale) */}
      <div 
        style={{
          position: 'absolute',
          top: '-175px',
          left: '50vw',
          transform: 'translateY(-50%) scaleX(-1)',
          width: '50vw',
          height: '600px',
          borderRadius: '0',
          background: 'conic-gradient(from 90deg at 0% 50%, #FFF 0deg, rgba(255, 255, 255, 0.95) 5deg, rgba(255, 255, 255, 0.9) 10deg,rgb(35, 38, 49) 23.50555777549744deg, rgba(0, 0, 0, 0.51) 105.24738073348999deg, rgba(18, 2, 10, 0.18) 281.80317878723145deg, rgba(9, 0, 4, 0.04) 330.0637102127075deg, rgba(35, 70, 193, 0.15) 340deg, rgba(35, 70, 193, 0.08) 350deg, rgba(35, 70, 193, 0.03) 355deg, rgba(35, 70, 193, 0.01) 360.08655548095703deg, rgba(0, 0, 0, 0.005) 360deg)',
          backdropFilter: 'blur(75px)',
          boxShadow: 'none',
          filter: 'brightness(1.25)',
          zIndex: 5,
          pointerEvents: 'none',
          opacity: 0.75,
          animation: 'organicGradient 15s ease-in-out infinite 1.5s'
        }}
      />

      {/* Header */}
      <div className="px-10 pt-6 pb-4 w-full max-w-6xl mx-auto relative z-10 flex flex-col items-center">
        <h1 className="text-[28px] font-light text-center text-white mb-6">
          Vidéothèque
        </h1>
        
        {/* Tab Navigation */}
        <div className="w-full max-w-md mb-4">
          <div className="flex bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-full p-1">
            <button
              onClick={() => setActiveTab('mes-videos')}
              className={`flex-1 px-6 py-3 text-sm rounded-full transition-all duration-200 ${
                activeTab === 'mes-videos' 
                  ? 'bg-[#e87c3e] text-white shadow-lg font-normal' 
                  : 'text-white/50 hover:text-white font-light'
              }`}
            >
              Mes vidéos
            </button>
            <button
              onClick={() => setActiveTab('ressource')}
              className={`flex-1 px-6 py-3 text-sm rounded-full transition-all duration-200 ${
                activeTab === 'ressource' 
                  ? 'bg-[#e87c3e] text-white shadow-lg font-normal' 
                  : 'text-white/50 hover:text-white font-light'
              }`}
            >
              Ressource
            </button>
          </div>
        </div>
      </div>

      {/* Ligne de démarcation */}
      <div className="w-full max-w-6xl mx-auto px-10 relative z-10">
        <div className="border-t border-white/10"></div>
      </div>

      {/* Content wrapper with z-index */}
      <div className="relative z-10">
      {/* Search and Filters - Only show for "Mes vidéos" tab */}
      {activeTab === 'mes-videos' && (
        <div className="px-[26px] py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher une vidéo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-[15px] text-white/50 placeholder-gray-400 focus:outline-none focus:border-white/20 text-[13px] font-extralight"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-nowrap">
            {/* Status Filter */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  setIsExerciseDropdownOpen(false);
                }}
                className={`appearance-none ${statusFilter ? 'bg-[rgba(232,124,62,0.15)]' : 'bg-[rgba(255,255,255,0.1)]'} rounded-[15px] px-3 py-2 pr-3 ${statusFilter ? 'text-[#D4845A]' : 'text-white/50'} text-[13px] font-normal focus:outline-none w-full text-left flex items-center justify-between`}
              >
                <span>{statusFilter === 'pending' ? 'Attente' : statusFilter === 'completed' ? 'Reçu' : 'Statuts'}</span>
                <ChevronDownIcon className={`h-3 w-3 ${statusFilter ? 'text-[#D4845A]' : 'text-gray-400'} pointer-events-none transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isStatusDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsStatusDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[rgba(26,26,26,0.95)] backdrop-blur-md border border-white/10 rounded-[15px] overflow-hidden shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('');
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-[13px] font-normal transition-colors hover:bg-white/5 ${statusFilter === '' ? 'text-[#D4845A] bg-white/5' : 'text-white/50'}`}
                    >
                      Statuts
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('pending');
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-[13px] font-normal transition-colors hover:bg-white/5 ${statusFilter === 'pending' ? 'text-[#D4845A] bg-white/5' : 'text-white/50'}`}
                    >
                      Attente
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('completed');
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-[13px] font-normal transition-colors hover:bg-white/5 ${statusFilter === 'completed' ? 'text-[#D4845A] bg-white/5' : 'text-white/50'}`}
                    >
                      Reçu
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Exercise Filter */}
            <div className="relative flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsExerciseDropdownOpen(!isExerciseDropdownOpen);
                  setIsStatusDropdownOpen(false);
                }}
                className={`appearance-none ${exerciseFilter ? 'bg-[rgba(232,124,62,0.15)]' : 'bg-[rgba(255,255,255,0.1)]'} rounded-[15px] px-3 py-2 pr-3 ${exerciseFilter ? 'text-[#D4845A]' : 'text-white/50'} text-[13px] font-normal focus:outline-none w-full text-left flex items-center justify-between`}
              >
                <span className="truncate">{exerciseFilter || 'Exercices'}</span>
                <ChevronDownIcon className={`h-3 w-3 flex-shrink-0 ml-2 ${exerciseFilter ? 'text-[#D4845A]' : 'text-gray-400'} pointer-events-none transition-transform ${isExerciseDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isExerciseDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsExerciseDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-[rgba(26,26,26,0.95)] backdrop-blur-md border border-white/10 rounded-[15px] overflow-hidden shadow-xl max-h-60 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setExerciseFilter('');
                        setIsExerciseDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-[13px] font-normal transition-colors hover:bg-white/5 ${exerciseFilter === '' ? 'text-[#D4845A] bg-white/5' : 'text-white/50'}`}
                    >
                      Exercices
                    </button>
                    {getUniqueExercises().map(exercise => (
                      <button
                        key={exercise}
                        type="button"
                        onClick={() => {
                          setExerciseFilter(exercise);
                          setIsExerciseDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-[13px] font-normal transition-colors hover:bg-white/5 ${exerciseFilter === exercise ? 'text-[#D4845A] bg-white/5' : 'text-white/50'}`}
                      >
                        {exercise}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative flex-1 min-w-0">
              <input
                type="date"
                id="date-filter"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
              />
              <button
                type="button"
                onClick={() => document.getElementById('date-filter')?.showPicker?.() || document.getElementById('date-filter')?.click()}
                className={`appearance-none ${dateFilter ? 'bg-[rgba(232,124,62,0.15)]' : 'bg-[rgba(255,255,255,0.1)]'} rounded-[15px] px-3 py-2 pr-3 ${dateFilter ? 'text-[#D4845A]' : 'text-white/50'} text-[13px] font-normal focus:outline-none w-full text-left flex items-center justify-between`}
              >
                <span>{dateFilter ? format(new Date(dateFilter), 'dd/MM/yyyy', { locale: fr }) : 'Date'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`h-4 w-4 ${dateFilter ? 'text-[#D4845A]' : 'text-white/50'} pointer-events-none`} fill="currentColor" aria-hidden="true">
                  <path d="M224 64C206.3 64 192 78.3 192 96L192 128L160 128C124.7 128 96 156.7 96 192L96 240L544 240L544 192C544 156.7 515.3 128 480 128L448 128L448 96C448 78.3 433.7 64 416 64C398.3 64 384 78.3 384 96L384 128L256 128L256 96C256 78.3 241.7 64 224 64zM96 288L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 288L96 288z"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Video Count */}
          <div className="text-xs text-[#D4845A] font-normal">
            {filteredVideos.length} vidéo{filteredVideos.length > 1 ? 's' : ''} trouvée{filteredVideos.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      <div className="px-4 pb-20">
        {activeTab === 'mes-videos' ? (
          // Mes vidéos tab content - Grouped by session
          groupedVideosBySession.length > 0 ? (
            <div className="space-y-4">
              {groupedVideosBySession.map((session) => {
                const isOpen = openSessions[session.sessionId];
                const sessionDate = format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr });
                
                return (
                  <div 
                    key={session.sessionId}
                    className="rounded-[20px] overflow-hidden bg-white/10"
                  >
                    {/* Session Header (Clickable) */}
                    <div 
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-white/12 transition-colors"
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
                          <h3 className="text-white font-light text-base flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span>{session.sessionName}</span>
                              <span className="text-sm flex items-center gap-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-4 w-4" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                                  <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z"/>
                                </svg>
                                <span style={{ fontWeight: '400' }}>x{session.videos.length}</span>
                              </span>
                            </span>
                            <span className="text-white/50" style={{ fontSize: '13px' }}>{sessionDate}</span>
                          </h3>
                        </div>
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {session.videos.some(v => v.status === 'pending') && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                            {session.videos.filter(v => v.status === 'pending').length} en attente
                          </span>
                        )}
                        {session.videos.every(v => v.status === 'completed' || v.status === 'reviewed') && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
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
                              className="bg-white/5 rounded-[15px] p-4 hover:bg-white/10 transition-colors cursor-pointer"
                              onClick={() => handleVideoClick(video)}
                            >
                              <div className="flex items-start gap-4 pl-[5px]">
                                {/* Video Thumbnail */}
                                <div className="relative w-24 h-16 bg-white/5 rounded-[10px] flex-shrink-0 overflow-hidden">
                                  {video.video_url ? (
                                    <video 
                                      src={video.video_url}
                                      className="w-full h-full object-cover"
                                      preload="metadata"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Video className="w-8 h-8 text-white/30" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                                    <PlayCircle size={20} className="text-white" />
                                  </div>
                                </div>
                                
                                {/* Video Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1 min-w-0 overflow-hidden">
                                      <h3 className="text-white font-light text-base flex items-center gap-2 flex-wrap">
                                        <span>{video.exercise_name}</span>
                                        <span className="text-white/50" style={{ fontSize: '13px' }}>{format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}</span>
                                      </h3>
                                      <div className="flex items-center gap-2 text-white/50 text-[13px] font-light mt-1">
                                        <span>№ {video.set_number || 1}/3</span>
                                        {(() => {
                                          const { weight, reps } = getVideoWeightAndReps(video);
                                          if (weight > 0 || reps > 0) {
                                            return (
                                              <>
                                                <span>•</span>
                                                <span>
                                                  {reps > 0 && <span>{reps} reps </span>}
                                                  {weight > 0 && (
                                                    <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: '400' }}>
                                                      @{weight}kg
                                                    </span>
                                                  )}
                                                </span>
                                              </>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </div>
                                      
                                      {/* Status Badge */}
                                      {!video.coach_feedback && (
                                        <div className="mt-2">
                                          {getStatusBadge(video.status, video.coach_feedback)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Coach Feedback - Full width below video */}
                              {video.coach_feedback && (
                                <div 
                                  className="mt-3 p-3 bg-white/10 rounded-[10px] relative overflow-hidden w-full"
                                  style={{
                                    borderLeft: '4px solid transparent',
                                    backgroundImage: 'linear-gradient(to right, rgba(212, 132, 90, 0.15) 0%, rgba(212, 132, 90, 0.05) 100%)',
                                    backgroundClip: 'padding-box'
                                  }}
                                >
                                  {/* Gradient border effect */}
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-1"
                                    style={{
                                      background: 'linear-gradient(to bottom, rgba(212, 132, 90, 0.8) 0%, rgba(232, 124, 62, 1) 50%, rgba(212, 132, 90, 0.8) 100%)',
                                      boxShadow: '0 0 8px rgba(212, 132, 90, 0.4), 0 0 4px rgba(212, 132, 90, 0.2)'
                                    }}
                                  />
                                  <div className="relative pl-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4 text-[#d4845a]" fill="currentColor">
                                        <path d="M64 416L64 192C64 139 107 96 160 96L480 96C533 96 576 139 576 192L576 416C576 469 533 512 480 512L360 512C354.8 512 349.8 513.7 345.6 516.8L230.4 603.2C226.2 606.3 221.2 608 216 608C202.7 608 192 597.3 192 584L192 512L160 512C107 512 64 469 64 416z"/>
                                      </svg>
                                      <span className="text-[13px] font-normal text-[#d4845a]">Feedback du coach</span>
                                    </div>
                                    <p className="text-white/70 text-[13px] font-light">{video.coach_feedback}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <h3 className="text-lg font-light mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>
                Aucune vidéo trouvée
              </h3>
              <p className="text-sm font-light" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
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
                  <div 
                    key={folder.id}
                    className="rounded-[20px] overflow-hidden bg-white/10"
                  >
                    {/* Folder Header */}
                    <div 
                      className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-white/12 transition-colors"
                      onClick={() => setSelectedFolder(selectedFolder === folder.id ? null : folder.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                        <ChevronRight 
                          size={20} 
                          className={`text-white/50 transition-transform flex-shrink-0 ${
                            selectedFolder === folder.id ? 'rotate-90' : ''
                          }`} 
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-light text-base flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-2 flex-wrap">
                              <span>{folder.name}</span>
                              <span className="text-sm flex items-center gap-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-4 w-4" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                                  <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z"/>
                                </svg>
                                <span style={{ fontWeight: '400' }}>x{folder.resources.length}</span>
                              </span>
                            </span>
                          </h3>
                        </div>
                      </div>
                    </div>
                    
                    {/* Folder Resources */}
                    {selectedFolder === folder.id && folder.resources.length > 0 && (
                      <div className="border-t border-white/10">
                        <div className="p-4 space-y-3">
                        {folder.resources.map(resource => (
                          <div 
                            key={resource.id}
                            className="bg-white/5 rounded-[15px] p-4 hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => handleCoachResourceClick(resource)}
                          >
                            <div className="flex items-start gap-4 pl-[5px]">
                              {/* Video Thumbnail */}
                              <div className="relative w-24 h-16 bg-white/5 rounded-[10px] flex-shrink-0 overflow-hidden">
                                {resource.fileUrl ? (
                                  <video 
                                    src={resource.fileUrl}
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Video className="w-8 h-8 text-white/30" />
                                  </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                                  <PlayCircle size={20} className="text-white" />
                                </div>
                              </div>
                              
                              {/* Resource Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-white font-light text-base flex items-center gap-2 flex-wrap">
                                  <span>{resource.title || resource.fileName}</span>
                                </h3>
                                {resource.description && (
                                  <p className="text-white/50 text-[13px] font-light mt-1">
                                    {resource.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      </div>
                    )}
                  </div>
                ));
              })()}
              
              {coachResources.length === 0 && (
                // No resources at all
                <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: '60vh' }}>
                  <Folder className="h-10 w-10 text-white/50" strokeWidth={1} />
                  <p className="text-white/50 text-sm font-light text-center">
                    Aucune ressource disponible
                  </p>
                </div>
              )}
            </div>
          )
        )}
      </div>

      <StudentVideoDetailModal 
        isOpen={isVideoDetailModalOpen}
        onClose={() => setIsVideoDetailModalOpen(false)}
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
      />
      </div>
    </div>
  );
};

export default StudentVideoLibrary;
