import logger from '../utils/logger';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

/**
 * Hook for fetching exercise history with pagination
 * @param {string} exerciseId - The exercise ID
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Number of items per page (default: 10)
 * @param {string} options.range - Date range filter ('30', '90', '365', 'all')
 * @param {string} options.athleteId - Filter by specific athlete
 * @param {boolean} options.enabled - Whether to fetch data (default: true)
 */
export const useExerciseHistory = (exerciseId, options = {}) => {
  const {
    limit = 10,
    range = '90',
    athleteId = null,
    enabled = true
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);

  const fetchHistory = useCallback(async (cursor = null, append = false) => {
    if (!exerciseId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        limit: limit.toString(),
        range: range.toString()
      });

      if (cursor) {
        params.append('cursor', cursor);
      }
      if (athleteId) {
        params.append('athleteId', athleteId);
      }

      const url = buildApiUrl(`/exercises/${exerciseId}/history?${params}`);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const { items, nextCursor: newNextCursor, hasMore: newHasMore } = response.data.data;
        
        // Filtrer pour ne garder que les séances terminées (exclure les séances assignées non réalisées)
        const completedItems = items.filter(item => !item.isScheduled);
        
        if (append) {
          setData(prev => [...prev, ...completedItems]);
        } else {
          setData(completedItems);
        }
        
        setNextCursor(newNextCursor);
        setHasMore(newHasMore);
      } else {
        throw new Error(response.data.message || 'Failed to fetch exercise history');
      }
    } catch (err) {
      logger.error('Error fetching exercise history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch exercise history');
    } finally {
      setLoading(false);
    }
  }, [exerciseId, limit, range, athleteId, enabled]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      fetchHistory(nextCursor, true);
    }
  }, [hasMore, nextCursor, loading, fetchHistory]);

  const refresh = useCallback(() => {
    setData([]);
    setNextCursor(null);
    setHasMore(false);
    fetchHistory();
  }, [fetchHistory]);

  // Initial fetch
  useEffect(() => {
    if (exerciseId && enabled) {
      refresh();
    }
  }, [exerciseId, enabled, refresh]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    isEmpty: data.length === 0 && !loading
  };
};

export default useExerciseHistory;

