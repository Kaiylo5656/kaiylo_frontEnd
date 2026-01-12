import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { PlayCircle, MoreHorizontal, Trash2, Filter, ChevronDown, ChevronRight, Clock, CheckCircle, Play, Video } from 'lucide-react';
import UploadVideoModal from '../components/UploadVideoModal';
import VideoDetailModal from '../components/VideoDetailModal';
import CoachResourceModal from '../components/CoachResourceModal';
import StudentVideoLibrary from '../components/StudentVideoLibrary';
import { Button } from '../components/ui/button';
import BaseModal from '../components/ui/modal/BaseModal';
import { useModalManager } from '../components/ui/modal/ModalManager';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '../components/ui/dropdown-menu';
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
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [isDeleteFolderModalOpen, setIsDeleteFolderModalOpen] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);

  // Filter states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(null); // For coach resources filtering
  const [openSessions, setOpenSessions] = useState({}); // Track which sessions are open
  const [hoveredSessionId, setHoveredSessionId] = useState(null); // Track which session is hovered
  const [folderMinWidths, setFolderMinWidths] = useState({}); // Store min widths for each folder to prevent size change

  // Status filter dropdown states and refs
  const statusFilterButtonRef = useRef(null);
  const statusFilterTextRef = useRef(null);
  const [statusFilterMinWidth, setStatusFilterMinWidth] = useState(170); // Default width in px
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Exercise filter dropdown states and refs
  const exerciseFilterButtonRef = useRef(null);
  const exerciseFilterTextRef = useRef(null);
  const [exerciseFilterMinWidth, setExerciseFilterMinWidth] = useState(120); // Default width in px
  const [isExerciseFilterOpen, setIsExerciseFilterOpen] = useState(false);

  // Date filter states and refs
  const dateInputRef = useRef(null);
  const dateFilterButtonRef = useRef(null);
  const dateFilterTextRef = useRef(null);
  const [dateFilterMinWidth, setDateFilterMinWidth] = useState(100); // Default width in px

  // Student filter dropdown states and refs
  const studentFilterButtonRef = useRef(null);
  const studentFilterTextRef = useRef(null);
  const [studentFilterMinWidth, setStudentFilterMinWidth] = useState(100); // Default width in px
  const [isStudentFilterOpen, setIsStudentFilterOpen] = useState(false);

  const { getAuthToken, hasRole, refreshAuthToken } = useAuth();
  const { isTopMost } = useModalManager();
  
  // Count processing resources for auto-refresh dependency
  const processingResourcesCount = useMemo(() => {
    return coachResources.filter(r => 
      r.status === 'PROCESSING' || r.status === 'processing'
    ).length;
  }, [coachResources]);
  
  // Status and sort filters with URL persistence
  const { status: statusFilter, setStatus, isInitialized } = useVideoFilters();

  // Map status filter values to display labels
  const getStatusFilterLabel = (value) => {
    switch (value) {
      case 'pending':
        return 'À feedback';
      case 'completed':
        return 'Complété';
      case 'all':
      default:
        return 'Tous les statuts';
    }
  };

  // Calculate button width for status filter based on text in bold (font-weight 400)
  useLayoutEffect(() => {
    const calculateButtonWidth = () => {
      // Possible text values: 'Tous les statuts', 'À feedback', 'Complété'
      const possibleTexts = ['Tous les statuts', 'À feedback', 'Complété'];
      
      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      document.body.appendChild(tempSpan);
      
      // Find the widest text
      let maxWidth = 0;
      possibleTexts.forEach(text => {
        tempSpan.textContent = text;
        maxWidth = Math.max(maxWidth, tempSpan.offsetWidth);
      });
      
      document.body.removeChild(tempSpan);
      
      // Add padding (px-[15px] = 15px left + 15px right = 30px) and gap (gap-2 = 8px) and icon width (16px)
      const buttonPadding = 30; // 15px * 2
      const gap = 8; // gap-2
      const iconWidth = 16; // h-4 w-4 = 16px
      setStatusFilterMinWidth(maxWidth + buttonPadding + gap + iconWidth);
    };

    // Calculate on mount
    calculateButtonWidth();
  }, []);

  // Calculate button width for exercise filter based on text in bold (font-weight 400)
  useLayoutEffect(() => {
    const calculateExerciseButtonWidth = () => {
      // Use "Exercice" as base width to keep button size consistent
      const text = 'Exercice';
      
      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempSpan.textContent = text;
      
      document.body.appendChild(tempSpan);
      const width = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      // Add padding (px-[15px] = 15px left + 15px right = 30px) and gap (gap-2 = 8px) and icon width (16px)
      const buttonPadding = 30; // 15px * 2
      const gap = 8; // gap-2
      const iconWidth = 16; // h-4 w-4 = 16px
      setExerciseFilterMinWidth(width + buttonPadding + gap + iconWidth);
    };

    calculateExerciseButtonWidth();
  }, []);

  // Calculate button width for date filter based on text in bold (font-weight 400)
  useLayoutEffect(() => {
    const calculateDateButtonWidth = () => {
      // Text is always "Date"
      const text = 'Date';
      
      // Create a temporary span to measure text width
      const tempSpan = document.createElement('span');
      tempSpan.style.position = 'absolute';
      tempSpan.style.visibility = 'hidden';
      tempSpan.style.whiteSpace = 'nowrap';
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempSpan.textContent = text;
      
      document.body.appendChild(tempSpan);
      const width = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);
      
      // Add padding (px-[15px] = 15px left + 15px right = 30px) and gap (gap-2 = 8px) and icon width (16px)
      const buttonPadding = 30; // 15px * 2
      const gap = 8; // gap-2
      const iconWidth = 16; // h-4 w-4 = 16px
      setDateFilterMinWidth(width + buttonPadding + gap + iconWidth);
    };

    calculateDateButtonWidth();
  }, []);

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
      created_at: resource.createdAt,
      status: resource.status // Include status for modal
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

  // Calculate fixed widths for folder buttons to prevent size change when font-weight changes
  useLayoutEffect(() => {
    if (activeTab !== 'coach' || folders.length === 0) return;

    const calculateFolderWidths = () => {
      const widths = {};
      
      // Create a temporary div to measure the exact button width with font-weight 400
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.whiteSpace = 'nowrap';
      tempDiv.style.display = 'inline-flex';
      tempDiv.style.alignItems = 'center';
      tempDiv.style.gap = '6px'; // gap-1.5
      tempDiv.style.paddingLeft = '12px'; // pl-[12px]
      tempDiv.style.paddingRight = '12px'; // pr-3
      tempDiv.style.fontSize = '14px'; // text-sm
      tempDiv.style.fontWeight = '400'; // font-normal
      tempDiv.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      // Create SVG icon for folder (h-4 w-4 = 16px)
      const tempSvg = document.createElement('div');
      tempSvg.style.width = '16px';
      tempSvg.style.height = '16px';
      tempSvg.style.flexShrink = '0';
      
      // Create span for text
      const tempSpan = document.createElement('span');
      tempSpan.style.fontSize = '14px';
      tempSpan.style.fontWeight = '400';
      tempSpan.style.fontFamily = getComputedStyle(document.body).fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      // Create button element for delete button (14px width)
      const tempButton = document.createElement('button');
      tempButton.style.width = '14px';
      tempButton.style.height = '14px';
      tempButton.style.flexShrink = '0';
      
      tempDiv.appendChild(tempSvg);
      tempDiv.appendChild(tempSpan);
      tempDiv.appendChild(tempButton);
      document.body.appendChild(tempDiv);
      
      folders.forEach(folder => {
        tempSpan.textContent = folder.name;
        const buttonWidth = tempDiv.offsetWidth;
        widths[folder.id] = buttonWidth;
      });
      
      document.body.removeChild(tempDiv);
      setFolderMinWidths(widths);
    };

    calculateFolderWidths();
  }, [activeTab, folders]);

  // Auto-select first folder when folders are loaded
  useEffect(() => {
    if (activeTab === 'coach' && folders.length > 0 && selectedFolder === null) {
      setSelectedFolder(folders[0].id);
    }
  }, [activeTab, folders, selectedFolder]);

  // Auto-refresh coach resources if there are videos in processing
  useEffect(() => {
    if (activeTab !== 'coach') return;
    
    if (processingResourcesCount === 0) return;

    console.log(`🔄 Auto-refreshing coach resources (${processingResourcesCount} in processing)...`);
    
    // Refresh every 3 seconds if there are processing videos
    const interval = setInterval(() => {
      fetchCoachResources();
    }, 3000); // Reduced to 3 seconds for faster updates

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, processingResourcesCount]); // Depend on processing count only

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

  const handleDeleteFolder = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    setFolderToDelete(folder);
    setIsDeleteFolderModalOpen(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    setIsDeletingFolder(true);
    try {
      let token = await getAuthToken();
      if (!token) {
        try { token = await refreshAuthToken(); } catch {}
      }
      if (!token) {
        setIsDeletingFolder(false);
        return;
      }
      await axios.delete(buildApiUrl(`/resources/folders/${folderToDelete.id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove folder from state
      const updatedFolders = folders.filter(f => f.id !== folderToDelete.id);
      setFolders(updatedFolders);
      
      // If this was the selected folder, select the first remaining folder
      if (selectedFolder === folderToDelete.id) {
        if (updatedFolders.length > 0) {
          setSelectedFolder(updatedFolders[0].id);
        } else {
          setSelectedFolder(null);
        }
      }
      
      // Refresh resources to update folder assignments
      fetchCoachResources();
      
      // Close modal
      setIsDeleteFolderModalOpen(false);
      setFolderToDelete(null);
    } catch (err) {
      setError(err.message || 'Failed to delete folder.');
    } finally {
      setIsDeletingFolder(false);
    }
  };

  const cancelDeleteFolder = () => {
    setIsDeleteFolderModalOpen(false);
    setFolderToDelete(null);
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
      <div className="flex flex-col gap-[7px]" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
        {groupedVideosBySession.map((session) => {
          const isOpen = openSessions[session.sessionId];
          const isHovered = hoveredSessionId === session.sessionId;
          const sessionName = session.sessionName;
          const sessionDate = format(new Date(session.sessionDate), 'd MMMM yyyy', { locale: fr });
          const backgroundColor = isHovered 
            ? 'rgba(255, 255, 255, 0.16)' 
            : 'rgba(255, 255, 255, 0.04)';
          
          return (
            <div 
              key={session.sessionId}
              className="px-5 py-4 transition-colors cursor-pointer rounded-2xl"
              style={{ 
                backgroundColor: backgroundColor,
                borderWidth: '0px',
                borderColor: 'rgba(0, 0, 0, 0)',
                borderStyle: 'none',
                borderImage: 'none'
              }}
              onMouseEnter={() => setHoveredSessionId(session.sessionId)}
              onMouseLeave={() => setHoveredSessionId(null)}
              onClick={() => toggleSession(session.sessionId)}
            >
              {/* Session Header */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 384 512" 
                    className={`text-white/50 transition-transform flex-shrink-0 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                    style={{ width: '20px', height: '20px' }}
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                  </svg>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-light text-base flex items-center gap-2">
                      {sessionName} <span style={{ opacity: 0.5 }}>- {sessionDate} - {session.studentName}</span> 
                      <span className="text-sm flex items-center gap-1" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="h-4 w-4" fill="currentColor" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                          <path d="M96 64c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64L96 64zM464 336l73.5 58.8c4.2 3.4 9.4 5.2 14.8 5.2 13.1 0 23.7-10.6 23.7-23.7l0-240.6c0-13.1-10.6-23.7-23.7-23.7-5.4 0-10.6 1.8-14.8 5.2L464 176 464 336z"/>
                        </svg>
                        <span style={{ fontWeight: '400' }}>x{session.videos.length}</span>
                      </span>
                    </h3>
                  </div>
                </div>
                
                {/* Status indicator */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {session.videos.some(v => v.status === 'pending') && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                      A feedback
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
                <div className="mt-2 pt-2 pl-6">
                  <div className="flex flex-col gap-[7px]">
                    {session.videos.map((video) => (
                      <div 
                        key={video.id} 
                        className="px-2 py-2 transition-colors cursor-pointer rounded-2xl hover:bg-white/8"
                        style={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderWidth: '0px',
                          borderColor: 'rgba(0, 0, 0, 0)',
                          borderStyle: 'none',
                          borderImage: 'none'
                        }}
                        onClick={() => handleVideoClick(video)}
                      >
                        <div className="flex items-center gap-4">
                          {/* Video Thumbnail */}
                          <div className="relative w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden">
                            {video?.video_url && video.video_url.trim() !== '' ? (
                              <>
                                <video 
                                  src={video.video_url}
                                  className="w-full h-full object-cover"
                                  preload="metadata"
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
                          <div className="flex-1 min-w-0">
                            {/* Exercise Tag and Date */}
                            <div className="flex items-center gap-1 mb-2">
                              <span className="text-white font-light text-base">
                                {video.exercise_name}
                              </span>
                              <span className="text-white/50">-</span>
                              <span className="text-white/50 text-base font-extralight">
                                {format(new Date(video.created_at), 'd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                            
                            {/* Series */}
                            <div className="text-white/75 text-sm font-extralight">
                              {(() => {
                                const { weight, reps } = getVideoWeightAndReps(video);
                                const seriesText = `Série ${video.set_number || 1}/3`;
                                const repsText = reps > 0 ? `${reps} reps` : null;
                                const weightText = weight > 0 ? `${weight}kg` : null;
                                
                                if (repsText && weightText) {
                                  return (
                                    <>
                                      {seriesText} • {repsText}{' '}
                                      <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{weightText}</span>
                                    </>
                                  );
                                } else if (repsText) {
                                  return `${seriesText} • ${repsText}`;
                                } else if (weightText) {
                                  return (
                                    <>
                                      {seriesText} •{' '}
                                      <span style={{ color: 'var(--kaiylo-primary-hex)', fontWeight: 400 }}>@{weightText}</span>
                                    </>
                                  );
                                }
                                return seriesText;
                              })()}
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="flex-shrink-0">
                            {video.status === 'pending' && (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(212, 132, 90, 0.15)', color: 'rgb(212, 132, 90)', fontWeight: '400' }}>
                                A feedback
                              </span>
                            )}
                            {(video.status === 'completed' || video.status === 'reviewed') && (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-light" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'rgb(74, 222, 128)', fontWeight: '400' }}>
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
      </div>
    );
  };

  const renderStudentVideosCards = () => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredVideos.map((video) => (
            <div 
              key={video.id} 
              className="bg-card border border-border/20 rounded-xl overflow-hidden group cursor-pointer hover:shadow-lg transition-all duration-200"
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="40" height="40" className="drop-shadow-lg" style={{ color: 'white' }} fill="currentColor" aria-hidden="true">
                  <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"/>
                </svg>
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
    // Exclude FAILED resources from display (they can't be played)
    const filteredResources = (selectedFolder 
      ? coachResources.filter(video => video.folderId === selectedFolder)
      : coachResources
    ).filter(video => video.status !== 'FAILED' && video.status !== 'failed');

    return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredResources.map(video => {
          const isProcessing = video.status === 'PROCESSING' || video.status === 'processing';
          
          return (
          <div key={video.id} className={`bg-card border border-border/20 rounded-xl overflow-hidden group transition-all duration-200 ${isProcessing ? 'opacity-80' : 'cursor-pointer hover:shadow-lg'}`}>
            <div 
              onClick={() => !isProcessing && handleCoachResourceClick(video)}
              className="block aspect-video bg-muted relative overflow-hidden"
            >
              {isProcessing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                  <span className="text-white text-xs font-medium">Traitement en cours...</span>
                </div>
              ) : (
                <>
                  <video src={video.fileUrl || undefined} className="w-full h-full object-cover" preload="metadata"></video>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="40" height="40" className="drop-shadow-lg" style={{ color: 'white' }} fill="currentColor" aria-hidden="true">
                      <path d="M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM212.5 147.5c-7.4-4.5-16.7-4.7-24.3-.5S176 159.3 176 168l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88zM298 256l-74 45.2 0-90.4 74 45.2z"/>
                    </svg>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 
                className={`font-normal text-base truncate transition-colors ${!isProcessing ? 'hover:text-primary cursor-pointer' : ''}`}
                style={{ color: 'var(--kaiylo-primary-hex)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isProcessing) handleCoachResourceClick(video);
                }}
              >
                {video.title || video.fileName}
              </h3>
              <p className="text-sm text-muted-foreground" style={{ color: 'rgba(255, 255, 255, 0.25)', fontWeight: 200 }}>
                {folders.find(f => f.id === video.folderId)?.name || 'Non classé'}
              </p>
              <div className="flex justify-end items-center gap-2">
                <p className="text-xs text-muted-foreground/60">{video.createdAt ? format(new Date(video.createdAt), 'd MMM yyyy', { locale: fr }) : 'N/A'}</p>
                {isProcessing && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Traitement</span>}
              </div>
            </div>
          </div>
        )})}
    </div>
  );
  };

  // Show student view if user is a student
  if (hasRole('student')) {
    return <StudentVideoLibrary />;
  }

  return (
    <div 
      className="min-h-screen text-foreground"
      style={{ background: 'unset', backgroundColor: 'unset' }}
    >
      {/* Main Content */}
      <div className="px-[50px] pt-3 pb-20 w-full">
        {/* Header */}
        <div className="mb-8">
          
          {/* Tabs */}
          <div 
            className="flex gap-6 mt-1" 
            style={{ 
              paddingLeft: '0px',
              borderTopWidth: '0px',
              borderTopColor: 'rgba(0, 0, 0, 0)',
              borderTopStyle: 'none',
              borderRightWidth: '0px',
              borderRightColor: 'rgba(0, 0, 0, 0)',
              borderRightStyle: 'none',
              borderBottomWidth: '1px',
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              borderBottomStyle: 'solid',
              borderLeftWidth: '0px',
              borderLeftColor: 'rgba(0, 0, 0, 0)',
              borderLeftStyle: 'none'
            }}
          >
            <button 
              className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'clients' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
              data-text="Vidéos clients"
              style={activeTab !== 'clients' ? { fontWeight: 200 } : {}}
              onClick={() => setActiveTab('clients')}
            >
              Vidéos clients
            </button>
            <button 
              className={`tab-button-fixed-width pt-3 pb-2 text-sm border-b-2 ${activeTab === 'coach' ? 'font-normal text-[#d4845a] border-[#d4845a]' : 'text-white/50 hover:text-[#d4845a] hover:!font-normal border-transparent'}`}
              data-text="Ressources coach"
              style={activeTab !== 'coach' ? { fontWeight: 200 } : {}}
              onClick={() => setActiveTab('coach')}
            >
              Ressources coach
            </button>
          </div>
        </div>

        {activeTab === 'clients' && (
          <>
            {/* Filters Row */}
            <div className="flex items-center gap-4 mb-6">
              {/* Status Filter */}
              <DropdownMenu open={isStatusFilterOpen} onOpenChange={setIsStatusFilterOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    ref={statusFilterButtonRef}
                    className="bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground text-sm"
                    style={{
                      backgroundColor: isStatusFilterOpen || statusFilter !== 'all' ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isStatusFilterOpen || statusFilter !== 'all' ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                      fontWeight: isStatusFilterOpen || statusFilter !== 'all' ? '400' : '200',
                      width: `${statusFilterMinWidth}px`,
                      minWidth: `${statusFilterMinWidth}px`
                    }}
                  >
                    <span ref={statusFilterTextRef} style={{ fontSize: '14px', fontWeight: isStatusFilterOpen || statusFilter !== 'all' ? '400' : 'inherit', flex: '1', whiteSpace: 'nowrap' }}>{getStatusFilterLabel(statusFilter)}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 384 512"
                      className="h-4 w-4 transition-transform"
                      style={{ transform: isStatusFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  disablePortal={true}
                  className="w-56 rounded-xl p-1 [&_span.absolute.left-2]:hidden"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <DropdownMenuRadioGroup 
                    value={statusFilter} 
                    onValueChange={(value) => {
                      setStatus(value);
                      setIsStatusFilterOpen(false);
                    }}
                  >
                    <DropdownMenuRadioItem
                      value="all"
                      className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                        statusFilter === 'all' 
                          ? 'bg-primary/20 text-primary font-normal' 
                          : 'text-foreground font-light'
                      }`}
                      style={
                        statusFilter === 'all'
                          ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (statusFilter !== 'all') {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '#D48459';
                            span.style.fontWeight = '400';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (statusFilter !== 'all') {
                          e.currentTarget.style.backgroundColor = '';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '';
                            span.style.fontWeight = '';
                          }
                        }
                      }}
                    >
                      <span>Tous les statuts</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 448 512" 
                        className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                          statusFilter === 'all' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                      </svg>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="pending"
                      className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                        statusFilter === 'pending' 
                          ? 'bg-primary/20 text-primary font-normal' 
                          : 'text-foreground font-light'
                      }`}
                      style={
                        statusFilter === 'pending'
                          ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (statusFilter !== 'pending') {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '#D48459';
                            span.style.fontWeight = '400';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (statusFilter !== 'pending') {
                          e.currentTarget.style.backgroundColor = '';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '';
                            span.style.fontWeight = '';
                          }
                        }
                      }}
                    >
                      <span>À feedback</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 448 512" 
                        className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                          statusFilter === 'pending' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                      </svg>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="completed"
                      className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                        statusFilter === 'completed' 
                          ? 'bg-primary/20 text-primary font-normal' 
                          : 'text-foreground font-light'
                      }`}
                      style={
                        statusFilter === 'completed'
                          ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (statusFilter !== 'completed') {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '#D48459';
                            span.style.fontWeight = '400';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (statusFilter !== 'completed') {
                          e.currentTarget.style.backgroundColor = '';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '';
                            span.style.fontWeight = '';
                          }
                        }
                      }}
                    >
                      <span>Complété</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 448 512" 
                        className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                          statusFilter === 'completed' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                      </svg>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Student Filter */}
              <DropdownMenu open={isStudentFilterOpen} onOpenChange={setIsStudentFilterOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    ref={studentFilterButtonRef}
                    className="bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground text-sm"
                    style={{
                      backgroundColor: isStudentFilterOpen || selectedStudent !== '' ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isStudentFilterOpen || selectedStudent !== '' ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                      fontWeight: isStudentFilterOpen || selectedStudent !== '' ? '400' : '200',
                      width: `${studentFilterMinWidth}px`,
                      minWidth: `${studentFilterMinWidth}px`
                    }}
                  >
                    <span ref={studentFilterTextRef} style={{ fontSize: '14px', fontWeight: isStudentFilterOpen || selectedStudent !== '' ? '400' : 'inherit', flex: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedStudent ? (studentMap.get(selectedStudent) || selectedStudent) : 'Client'}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 384 512"
                      className="h-4 w-4 transition-transform"
                      style={{ transform: isStudentFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  disablePortal={true}
                  className="w-56 rounded-xl p-1 [&_span.absolute.left-2]:hidden"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <DropdownMenuRadioGroup 
                    value={selectedStudent} 
                    onValueChange={(value) => {
                      setSelectedStudent(value);
                      setIsStudentFilterOpen(false);
                    }}
                  >
                    <DropdownMenuRadioItem
                      value=""
                      className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                        selectedStudent === '' 
                          ? 'bg-primary/20 text-primary font-normal' 
                          : 'text-foreground font-light'
                      }`}
                      style={
                        selectedStudent === ''
                          ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (selectedStudent !== '') {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '#D48459';
                            span.style.fontWeight = '400';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedStudent !== '') {
                          e.currentTarget.style.backgroundColor = '';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '';
                            span.style.fontWeight = '';
                          }
                        }
                      }}
                    >
                      <span>Client</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 448 512"
                        className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                          selectedStudent === '' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                      </svg>
                    </DropdownMenuRadioItem>
                    {uniqueStudents.map(studentEmail => (
                      <DropdownMenuRadioItem
                        key={studentEmail}
                        value={studentEmail}
                        className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                          selectedStudent === studentEmail 
                            ? 'bg-primary/20 text-primary font-normal' 
                            : 'text-foreground font-light'
                        }`}
                        style={
                          selectedStudent === studentEmail
                            ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                            : {}
                        }
                        onMouseEnter={(e) => {
                          if (selectedStudent !== studentEmail) {
                            e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                            const span = e.currentTarget.querySelector('span');
                            if (span) {
                              span.style.color = '#D48459';
                              span.style.fontWeight = '400';
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedStudent !== studentEmail) {
                            e.currentTarget.style.backgroundColor = '';
                            const span = e.currentTarget.querySelector('span');
                            if (span) {
                              span.style.color = '';
                              span.style.fontWeight = '';
                            }
                          }
                        }}
                      >
                        <span>{studentMap.get(studentEmail) || studentEmail}</span>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 448 512" 
                          className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                            selectedStudent === studentEmail ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                          }`}
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                        </svg>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Exercise Filter */}
              <DropdownMenu open={isExerciseFilterOpen} onOpenChange={setIsExerciseFilterOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    ref={exerciseFilterButtonRef}
                    className="bg-primary hover:bg-primary/90 font-extralight py-2 px-[15px] rounded-[50px] transition-colors flex items-center gap-2 text-primary-foreground text-sm"
                    style={{
                      backgroundColor: isExerciseFilterOpen || selectedExercise !== '' ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      color: isExerciseFilterOpen || selectedExercise !== '' ? '#D48459' : 'rgba(250, 250, 250, 0.75)',
                      fontWeight: isExerciseFilterOpen || selectedExercise !== '' ? '400' : '200',
                      width: `${exerciseFilterMinWidth}px`,
                      minWidth: `${exerciseFilterMinWidth}px`
                    }}
                  >
                    <span ref={exerciseFilterTextRef} style={{ fontSize: '14px', fontWeight: isExerciseFilterOpen || selectedExercise !== '' ? '400' : 'inherit', flex: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedExercise || 'Exercice'}</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 384 512"
                      className="h-4 w-4 transition-transform"
                      style={{ transform: isExerciseFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M169.4 374.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 306.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"/>
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  disablePortal={true}
                  className="w-56 rounded-xl p-1 [&_span.absolute.left-2]:hidden"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <DropdownMenuRadioGroup 
                    value={selectedExercise} 
                    onValueChange={(value) => {
                      setSelectedExercise(value);
                      setIsExerciseFilterOpen(false);
                    }}
                  >
                    <DropdownMenuRadioItem
                      value=""
                      className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                        selectedExercise === '' 
                          ? 'bg-primary/20 text-primary font-normal' 
                          : 'text-foreground font-light'
                      }`}
                      style={
                        selectedExercise === ''
                          ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                          : {}
                      }
                      onMouseEnter={(e) => {
                        if (selectedExercise !== '') {
                          e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '#D48459';
                            span.style.fontWeight = '400';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedExercise !== '') {
                          e.currentTarget.style.backgroundColor = '';
                          const span = e.currentTarget.querySelector('span');
                          if (span) {
                            span.style.color = '';
                            span.style.fontWeight = '';
                          }
                        }
                      }}
                    >
                      <span>Exercice</span>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 448 512" 
                        className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                          selectedExercise === '' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                        }`}
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                      </svg>
                    </DropdownMenuRadioItem>
                    {uniqueExercises.map(exercise => (
                      <DropdownMenuRadioItem
                        key={exercise}
                        value={exercise}
                        className={`w-full px-5 py-2 pl-5 text-left text-sm transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer ${
                          selectedExercise === exercise 
                            ? 'bg-primary/20 text-primary font-normal' 
                            : 'text-foreground font-light'
                        }`}
                        style={
                          selectedExercise === exercise
                            ? { backgroundColor: 'rgba(212, 132, 89, 0.2)', color: '#D48459' }
                            : {}
                        }
                        onMouseEnter={(e) => {
                          if (selectedExercise !== exercise) {
                            e.currentTarget.style.backgroundColor = 'rgba(212, 132, 89, 0.2)';
                            const span = e.currentTarget.querySelector('span');
                            if (span) {
                              span.style.color = '#D48459';
                              span.style.fontWeight = '400';
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedExercise !== exercise) {
                            e.currentTarget.style.backgroundColor = '';
                            const span = e.currentTarget.querySelector('span');
                            if (span) {
                              span.style.color = '';
                              span.style.fontWeight = '';
                            }
                          }
                        }}
                      >
                        <span>{exercise}</span>
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 448 512" 
                          className={`h-4 w-4 font-normal transition-all duration-200 ease-in-out ${
                            selectedExercise === exercise ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                          }`}
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"/>
                        </svg>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Date Filter */}
              <div className="relative">
                <div 
                  ref={dateFilterButtonRef}
                  onClick={() => dateInputRef.current?.showPicker()}
                  className="relative rounded-[50px] flex items-center cursor-pointer px-[15px] py-2 transition-colors gap-2"
                  style={{
                    backgroundColor: selectedDate ? 'rgba(212, 132, 89, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedDate ? 'rgb(212, 132, 89)' : 'rgba(250, 250, 250, 0.75)',
                    fontWeight: selectedDate ? '400' : '200',
                    width: `${dateFilterMinWidth}px`,
                    minWidth: `${dateFilterMinWidth}px`
                  }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 448 512" 
                    className="h-4 w-4 pointer-events-none flex-shrink-0"
                    style={{ color: selectedDate ? 'rgb(212, 132, 89)' : 'rgba(255, 255, 255, 0.5)' }}
                    fill="currentColor"
                  >
                    <path d="M128 0C110.3 0 96 14.3 96 32l0 32-32 0C28.7 64 0 92.7 0 128l0 48 448 0 0-48c0-35.3-28.7-64-64-64l-32 0 0-32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 32-128 0 0-32c0-17.7-14.3-32-32-32zM0 224L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-192-448 0z"/>
                  </svg>
                  {/* Custom Display */}
                  <span ref={dateFilterTextRef} className="text-sm whitespace-nowrap" style={{ 
                    fontSize: '14px',
                    fontWeight: selectedDate ? '400' : 'inherit',
                    flex: '1'
                  }}>
                    Date
                  </span>
                  
                  {/* Native Input */}
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Video Count */}
              <div className="ml-auto text-sm font-normal" style={{ color: '#d4845a' }}>
                {filteredVideos.length} vidéo{filteredVideos.length > 1 ? 's' : ''} {statusFilter === 'pending' ? 'à feedback' : 'trouvée' + (filteredVideos.length > 1 ? 's' : '')}
              </div>
            </div>

            {loading && (
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
                <div className="flex items-center justify-center min-h-[320px] py-8">
                  <div className="px-6 py-8 text-center font-light flex flex-col items-center gap-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                    <span>
                      {statusFilter === 'pending' ? (
                        <>
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucune vidéo à traiter</span>
                          <br />
                          <span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Toutes les vidéos ont reçu un feedback</span>
                        </>
                      ) : statusFilter === 'completed' ? (
                        <>
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucune vidéo complétée</span>
                          <br />
                          <span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Les vidéos avec feedback apparaîtront ici</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucune vidéo trouvée</span>
                          <br />
                          <span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Aucune vidéo ne correspond aux filtres sélectionnés.</span>
                        </>
                      )}
                    </span>
                    <button 
                      onClick={() => {
                        setStatus('all');
                        setSelectedStudent('');
                        setSelectedExercise('');
                        setSelectedDate('');
                      }}
                      className="px-6 py-2.5 rounded-[8px] hover:bg-white/90 transition-colors font-light mt-2 text-base"
                      style={{
                        backgroundColor: 'var(--kaiylo-primary-hex)',
                        color: 'var(--tw-ring-offset-color)'
                      }}
                    >
                      Effacer les filtres
                    </button>
                  </div>
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
                  <div
                    key={folder.id}
                    className={`relative group inline-flex items-center gap-1.5 rounded-full pl-[12px] pr-3 py-[7px] hover:bg-muted cursor-pointer ${
                      selectedFolder === folder.id 
                        ? 'bg-primary/15 text-primary font-normal' 
                        : 'bg-white/5 text-white/75 font-extralight'
                    }`}
                    style={folderMinWidths[folder.id] ? { width: `${folderMinWidths[folder.id]}px` } : {}}
                    onClick={() => handleFolderSelect(folder.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-4 w-4 flex-shrink-0" fill="currentColor">
                      <path d="M64 448l384 0c35.3 0 64-28.7 64-64l0-240c0-35.3-28.7-64-64-64L298.7 80c-6.9 0-13.7-2.2-19.2-6.4L241.1 44.8C230 36.5 216.5 32 202.7 32L64 32C28.7 32 0 60.7 0 96L0 384c0 35.3 28.7 64 64 64z"/>
                    </svg>
                    <span className="text-sm whitespace-nowrap">{folder.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="text-muted-foreground hover:text-[#d4845a] transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      title="Supprimer le dossier"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="14" height="14" fill="currentColor">
                        <path d="M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  className="rounded-full bg-white/5 text-white/50 font-extralight hover:text-foreground gap-1" 
                  onClick={() => setIsFolderModalOpen(true)}
                  style={{ background: 'unset', backgroundColor: 'unset' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-4 w-4 mr-2" fill="currentColor">
                    <path d="M512 384c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l138.7 0c13.8 0 27.3 4.5 38.4 12.8l38.4 28.8c5.5 4.2 12.3 6.4 19.2 6.4L448 80c35.3 0 64 28.7 64 64l0 240zM256 160c-13.3 0-24 10.7-24 24l0 48-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0 0 48c0 13.3 10.7 24 24 24s24-10.7 24-24l0-48 48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-48c0-13.3-10.7-24-24-24z"/>
                  </svg>
                  nouveau dossier
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setIsUploadModalOpen(true)} 
                  className="group bg-primary hover:bg-primary/90 text-primary-foreground pt-[7px] pb-[7px] pl-5 pr-5 rounded-[8px]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="w-4 h-4 fill-current transition-transform duration-200 group-hover:rotate-45 mr-2">
                    <path d="M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"/>
                  </svg>
                  Ajouter une vidéo
                </Button>
              </div>
            </div>

            {loading && (
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
            )}
            {error && <p className="text-destructive">Erreur: {error}</p>}
            {!loading && !error && (
              (selectedFolder 
                ? coachResources.filter(video => video.folderId === selectedFolder).length > 0
                : coachResources.length > 0
              ) ? renderCoachResources() : (
                <div className="flex items-center justify-center min-h-[320px] py-8">
                  <div className="px-6 py-8 text-center font-light flex flex-col items-center gap-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                    <span>
                      <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px', fontWeight: '400' }}>Aucune vidéo trouvée</span>
                      <br />
                      <span style={{ color: 'rgba(255, 255, 255, 0.25)', marginTop: '8px', display: 'block' }}>Vos ressources téléchargées apparaîtront ici.</span>
                    </span>
                  </div>
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

      {isFolderModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center p-4"
          style={{ zIndex: 100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFolderModalOpen(false);
              setNewFolderName('');
            }
          }}
        >
          <div 
            className="relative mx-auto w-full max-w-md max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            style={{
              background: 'linear-gradient(90deg, rgba(19, 20, 22, 1) 0%, rgba(43, 44, 48, 1) 61%, rgba(65, 68, 72, 0.75) 100%)',
              opacity: 0.95
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-5 w-5" style={{ color: 'var(--kaiylo-primary-hex)' }} fill="currentColor">
                  <path d="M512 384c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l138.7 0c13.8 0 27.3 4.5 38.4 12.8l38.4 28.8c5.5 4.2 12.3 6.4 19.2 6.4L448 80c35.3 0 64 28.7 64 64l0 240zM256 160c-13.3 0-24 10.7-24 24l0 48-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l48 0 0 48c0 13.3 10.7 24 24 24s24-10.7 24-24l0-48 48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-48c0-13.3-10.7-24-24-24z"/>
                </svg>
                <h2 className="text-xl font-normal text-white flex items-center gap-2" style={{ color: 'var(--kaiylo-primary-hex)' }}>
                  Créer un nouveau dossier
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsFolderModalOpen(false);
                  setNewFolderName('');
                }}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5" fill="currentColor">
                  <path d="M183.1 137.4C170.6 124.9 150.3 124.9 137.8 137.4C125.3 149.9 125.3 170.2 137.8 182.7L275.2 320L137.9 457.4C125.4 469.9 125.4 490.2 137.9 502.7C150.4 515.2 170.7 515.2 183.2 502.7L320.5 365.3L457.9 502.6C470.4 515.1 490.7 515.1 503.2 502.6C515.7 490.1 515.7 469.8 503.2 457.3L365.8 320L503.1 182.6C515.6 170.1 515.6 149.8 503.1 137.3C490.6 124.8 470.3 124.8 457.8 137.3L320.5 274.7L183.1 137.4z"/>
                </svg>
              </button>
            </div>
            <div className="border-b border-white/10 mx-6"></div>

            {/* Form */}
            <form onSubmit={handleCreateFolder} className="flex-1 min-h-0 overflow-y-auto overscroll-contain modal-scrollable-body px-6 py-6 space-y-5">
              <div>
                <label htmlFor="folderName" className="block text-sm font-extralight text-white/50 mb-2">
                  Nom du dossier
                </label>
                <input
                  type="text"
                  id="folderName"
                  placeholder="Entrez un nom pour votre nouveau dossier"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  className="w-full px-[14px] py-3 rounded-[10px] border-[0.5px] bg-[rgba(0,0,0,0.5)] border-[rgba(255,255,255,0.05)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] placeholder:font-extralight focus:outline-none focus:border-[0.5px] focus:border-[rgba(255,255,255,0.05)]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsFolderModalOpen(false);
                    setNewFolderName('');
                  }}
                  className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors"
                  style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
                >
                  Créer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Delete Folder Modal */}
      <BaseModal
        isOpen={isDeleteFolderModalOpen}
        onClose={cancelDeleteFolder}
        modalId="delete-folder-modal"
        zIndex={90}
        closeOnEsc={isTopMost}
        closeOnBackdrop={isTopMost}
        size="md"
        title="Supprimer le dossier"
        titleClassName="text-xl font-normal text-white"
      >
        <div className="space-y-6">
          {/* Warning Message */}
          <div className="flex flex-col items-start space-y-4">
            <div className="text-left space-y-2">
              {folderToDelete && (() => {
                const folderResources = coachResources.filter(resource => resource.folderId === folderToDelete.id);
                return folderResources.length > 0 ? (
                  <>
                    <p className="text-sm font-extralight text-white/70">
                      Le dossier <span className="font-normal text-white">"{folderToDelete.name}"</span> contient <span className="font-normal text-white">{folderResources.length}</span> ressource{folderResources.length > 1 ? 's' : ''}. Voulez-vous vraiment le supprimer ?
                    </p>
                    <p className="text-xs font-extralight text-white/50">
                      Les ressources seront déplacées vers "Non classé".
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-extralight text-white/70">
                    Êtes-vous sûr de vouloir supprimer le dossier <span className="font-normal text-white">"{folderToDelete.name}"</span> ?
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-0">
            <button
              type="button"
              onClick={cancelDeleteFolder}
              disabled={isDeletingFolder}
              className="px-5 py-2.5 text-sm font-extralight text-white/70 bg-[rgba(0,0,0,0.5)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors border-[0.5px] border-[rgba(255,255,255,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmDeleteFolder}
              disabled={isDeletingFolder}
              className="px-5 py-2.5 text-sm font-normal bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgba(212, 132, 89, 1)' }}
            >
              {isDeletingFolder ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default VideoLibrary;