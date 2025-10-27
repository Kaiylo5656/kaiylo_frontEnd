import React, { useState, useEffect } from 'react';
import { 
  Hash, 
  User, 
  Tag, 
  Play, 
  Clock, 
  Activity, 
  Copy, 
  Check,
  AlertCircle
} from 'lucide-react';
import { 
  formatRelative, 
  formatAbsolute, 
  formatDuration, 
  formatFileSize, 
  copyToClipboard, 
  truncateText, 
  formatPlural 
} from '../utils/formatting';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

const HumanDetails = ({ exercise }) => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Fetch owner and tags data
  useEffect(() => {
    const fetchData = async () => {
      if (!exercise) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('authToken');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Skip owner data fetch to avoid API errors
        // The exercise details don't require owner information
        
        // Fetch tags data
        if (exercise.tags && exercise.tags.length > 0) {
          setTags(exercise.tags);
        }
        
      } catch (err) {
        console.error('Error fetching exercise details:', err);
        setError('Failed to load some details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [exercise]);

  const handleCopyId = async () => {
    if (exercise?.id) {
      const success = await copyToClipboard(exercise.id);
      if (success) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    }
  };



  const renderTags = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="h-4 bg-white/10 rounded animate-pulse w-20" />
        </div>
      );
    }

    if (!tags || tags.length === 0) {
      return (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-white/40" />
          <span className="text-white/40 text-sm">No tags assigned</span>
        </div>
      );
    }

    const displayTags = tags.slice(0, 6);
    const remainingCount = tags.length - 6;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {displayTags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white/10 border border-white/15 text-white/80"
          >
            {tag.toLowerCase()}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="text-xs text-white/60">
            +{remainingCount} more
          </span>
        )}
      </div>
    );
  };

  const renderVideo = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <div className="h-4 bg-white/10 rounded animate-pulse w-24" />
        </div>
      );
    }

    if (!exercise.demoVideoURL) {
      return (
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-white/40" />
          <span className="text-white/40 text-sm">Not added</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-green-400" />
        <span className="text-sm text-white">
          Available
        </span>
        {exercise.videoDuration && (
          <span className="text-xs text-white/60">
            • {formatDuration(exercise.videoDuration)}
          </span>
        )}
        {exercise.videoSize && (
          <span className="text-xs text-white/60">
            • {formatFileSize(exercise.videoSize)}
          </span>
        )}
      </div>
    );
  };

  if (!exercise) {
    return (
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="text-white/40 text-sm">No exercise data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="space-y-4">
        {/* ID */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-white/60" />
            <span className="text-sm text-white/60">ID</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">
              {truncateText(exercise.id, 12)}
            </span>
            <button
              onClick={handleCopyId}
              className="p-1 text-white/40 hover:text-white/80 transition-colors"
              title="Copy ID"
            >
              {copiedId ? (
                <Check className="h-3 w-3 text-green-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>


        {/* Tags */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-white/60" />
            <span className="text-sm text-white/60">Tags</span>
          </div>
          <div className="flex-1 ml-4">
            {renderTags()}
          </div>
        </div>

        {/* Demo Video */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-white/60" />
            <span className="text-sm text-white/60">Demo video</span>
          </div>
          <div className="flex-1 ml-4">
            {renderVideo()}
          </div>
        </div>

        {/* Created */}
        {exercise.created_at && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-white/60" />
              <span className="text-sm text-white/60">Created</span>
            </div>
            <div className="flex-1 ml-4">
              <span 
                className="text-sm text-white"
                title={formatAbsolute(exercise.created_at)}
              >
                {formatRelative(exercise.created_at)}
              </span>
            </div>
          </div>
        )}

        {/* Last Updated */}
        {exercise.updated_at && exercise.updated_at !== exercise.created_at && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white/60" />
              <span className="text-sm text-white/60">Last updated</span>
            </div>
            <div className="flex-1 ml-4">
              <span 
                className="text-sm text-white"
                title={formatAbsolute(exercise.updated_at)}
              >
                {formatRelative(exercise.updated_at)}
              </span>
            </div>
          </div>
        )}

        {/* Usage Count */}
        {exercise.usageCount !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white/60" />
              <span className="text-sm text-white/60">Usage</span>
            </div>
            <div className="flex-1 ml-4">
              <span className="text-sm text-white">
                {formatPlural(exercise.usageCount, 'time')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HumanDetails;
