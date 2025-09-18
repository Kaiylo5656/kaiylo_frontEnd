import React, { useState, useEffect } from 'react';
import { getApiBaseUrlWithApi } from '../config/api';
import { Play, Download, Eye, Clock, User, Dumbbell, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

const VideoLibrary = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('student-videos');
  const [filters, setFilters] = useState({
    student: '',
    exercise: '',
    date: '',
    status: ''
  });
  const [filteredVideos, setFilteredVideos] = useState([]);

  // Fetch videos from chat messages
  const fetchVideos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiBaseUrlWithApi()}/chat/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
        setFilteredVideos(data.videos || []);
      } else {
        console.error('Failed to fetch videos');
        setVideos([]);
        setFilteredVideos([]);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
      setFilteredVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Filter videos based on selected filters
  useEffect(() => {
    let filtered = videos;

    if (filters.student) {
      filtered = filtered.filter(video => 
        video.studentName.toLowerCase().includes(filters.student.toLowerCase())
      );
    }

    if (filters.exercise) {
      filtered = filtered.filter(video => 
        video.exerciseName.toLowerCase().includes(filters.exercise.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(video => video.status === filters.status);
    }

    setFilteredVideos(filtered);
  }, [videos, filters]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'pending':
        return 'A feedback';
      default:
        return 'En attente';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-gray-600 text-white';
      case 'pending':
        return 'bg-orange-600 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Vidéothèque</h1>
        
        {/* Tabs */}
        <div className="flex space-x-6 border-b border-border">
          <button
            onClick={() => setActiveTab('student-videos')}
            className={`pb-2 px-1 font-medium ${
              activeTab === 'student-videos'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Vidéos élèves
          </button>
          <button
            onClick={() => setActiveTab('coach-resources')}
            className={`pb-2 px-1 font-medium ${
              activeTab === 'coach-resources'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ressources coach
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={filters.student}
          onChange={(e) => setFilters(prev => ({ ...prev, student: e.target.value }))}
          className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
        >
          <option value="">Elève</option>
          {Array.from(new Set(videos.map(v => v.studentName))).map(student => (
            <option key={student} value={student}>{student}</option>
          ))}
        </select>

        <select
          value={filters.exercise}
          onChange={(e) => setFilters(prev => ({ ...prev, exercise: e.target.value }))}
          className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
        >
          <option value="">Exercice</option>
          {Array.from(new Set(videos.map(v => v.exerciseName))).map(exercise => (
            <option key={exercise} value={exercise}>{exercise}</option>
          ))}
        </select>

        <select
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          className="px-3 py-2 bg-input border border-border rounded-md text-foreground"
        >
          <option value="">Date</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
        </select>

        <button className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors">
          + Filter
        </button>
      </div>

      {/* Video Count */}
      <div className="text-sm text-muted-foreground">
        {filteredVideos.filter(v => v.status === 'pending').length} vidéos à feedback
      </div>

      {/* Video List */}
      <div className="space-y-4">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune vidéo trouvée</p>
          </div>
        ) : (
          filteredVideos.map((video, index) => (
            <div key={video.id} className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-colors">
              <div className="flex items-center space-x-4">
                {/* Video Thumbnail */}
                <div className="relative w-32 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  {video.thumbnail ? (
                    <img 
                      src={video.thumbnail} 
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    {/* Student */}
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {video.studentName}
                      </span>
                    </div>

                    {/* Exercise */}
                    <div className="flex items-center space-x-2">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" />
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                        {video.exerciseName}
                      </span>
                    </div>

                    {/* Series */}
                    <div className="text-sm text-muted-foreground">
                      {video.series || '1/3'}
                    </div>

                    {/* Date */}
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatDate(video.createdAt)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(video.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                        {getStatusText(video.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VideoLibrary;
