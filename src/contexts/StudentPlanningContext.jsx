import logger from '../utils/logger';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { buildApiUrl } from '../config/api';

const StudentPlanningContext = createContext(null);

export const StudentPlanningProvider = ({ children }) => {
  const { user, getAuthToken, refreshAuthToken } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [planningBlocks, setPlanningBlocks] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [planningBlocksLoading, setPlanningBlocksLoading] = useState(false);
  const [lastFetchAt, setLastFetchAt] = useState(null);

  const fetchAssignments = useCallback(async () => {
    if (!user?.id) return;
    setAssignmentsLoading(true);
    try {
      let token = await getAuthToken();
      if (!token) return;
      let response = await fetch(buildApiUrl('/api/assignments/student'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.status === 401 && refreshAuthToken) {
        const newToken = await refreshAuthToken();
        if (newToken) {
          response = await fetch(buildApiUrl('/api/assignments/student'), {
            headers: { 'Authorization': `Bearer ${newToken}`, 'Content-Type': 'application/json' }
          });
        }
      }
      if (!response.ok) throw new Error('Failed to fetch assignments');
      const data = await response.json();
      setAssignments(data.data || []);
      setLastFetchAt(Date.now());
    } catch (err) {
      logger.error('Error fetching assignments:', err);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [user?.id, getAuthToken, refreshAuthToken]);

  const fetchPlanningBlocks = useCallback(async () => {
    if (!user?.id) return;
    setPlanningBlocksLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) return;
      const response = await fetch(
        buildApiUrl(`/periodization/blocks/student/${user.id}?t=${Date.now()}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setPlanningBlocks(data.success && Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      logger.error('Error fetching planning blocks:', err);
      setPlanningBlocks([]);
    } finally {
      setPlanningBlocksLoading(false);
    }
  }, [user?.id, getAuthToken]);

  // Prefetch dès qu'un étudiant est connecté (sur toute page étudiant)
  useEffect(() => {
    if (user?.role !== 'student' || !user?.id) return;
    fetchAssignments();
    fetchPlanningBlocks();
  }, [user?.role, user?.id, fetchAssignments, fetchPlanningBlocks]);

  const refresh = useCallback(() => {
    if (user?.role === 'student' && user?.id) {
      fetchAssignments();
      fetchPlanningBlocks();
    }
  }, [user?.role, user?.id, fetchAssignments, fetchPlanningBlocks]);

  const value = {
    assignments,
    planningBlocks,
    assignmentsLoading,
    planningBlocksLoading,
    lastFetchAt,
    refreshAssignments: fetchAssignments,
    refreshPlanningBlocks: fetchPlanningBlocks,
    refresh
  };

  return (
    <StudentPlanningContext.Provider value={value}>
      {children}
    </StudentPlanningContext.Provider>
  );
};

export const useStudentPlanning = () => {
  const ctx = useContext(StudentPlanningContext);
  return ctx;
};
