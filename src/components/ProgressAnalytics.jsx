import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProgressChart from './ProgressChart';
import LoadingSpinner from './LoadingSpinner';

const ProgressAnalytics = ({ userRole = 'student' }) => {
  const { getAuthToken } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endpoint = userRole === 'student' ? '/api/progress/student' : '/api/progress/coach';
      const response = await fetch(`${endpoint}?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, userRole]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading analytics
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
            <div className="mt-4">
              <button
                onClick={fetchAnalytics}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Progress Analytics
        </h2>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                timeframe === period
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period === '7d' ? '7 Days' : 
               period === '30d' ? '30 Days' :
               period === '90d' ? '90 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-sm font-medium">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Assignments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.overview.totalAssignments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-sm font-medium">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.overview.completedAssignments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-sm font-medium">⏳</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.overview.pendingAssignments}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm font-medium">📈</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.overview.completionRate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Information */}
      {analytics.streaks && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Streak Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {analytics.streaks.currentStreak}
              </div>
              <div className="text-sm text-gray-500">Current Streak</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analytics.streaks.longestStreak}
              </div>
              <div className="text-sm text-gray-500">Longest Streak</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Last Completed</div>
              <div className="text-sm font-medium text-gray-900">
                {analytics.streaks.lastCompleted 
                  ? formatDate(analytics.streaks.lastCompleted)
                  : 'Never'
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Trends */}
      {analytics.performanceTrends && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <div className="flex items-center space-x-4">
            <span className="text-2xl">{getTrendIcon(analytics.performanceTrends.trend)}</span>
            <div>
              <div className={`text-lg font-medium ${getTrendColor(analytics.performanceTrends.trend)}`}>
                {analytics.performanceTrends.trend.charAt(0).toUpperCase() + analytics.performanceTrends.trend.slice(1)}
              </div>
              <div className="text-sm text-gray-500">
                {analytics.performanceTrends.change > 0 ? '+' : ''}{analytics.performanceTrends.change}% change
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Progress Chart */}
        {analytics.dailyProgress && analytics.dailyProgress.length > 0 && (
          <ProgressChart
            data={analytics.dailyProgress}
            type="line"
            title="Daily Progress"
            height={300}
          />
        )}

        {/* Weekly Progress Chart */}
        {analytics.weeklyProgress && analytics.weeklyProgress.length > 0 && (
          <ProgressChart
            data={analytics.weeklyProgress}
            type="bar"
            title="Weekly Progress"
            height={300}
          />
        )}
      </div>

      {/* Workout Type Breakdown */}
      {analytics.workoutTypeBreakdown && analytics.workoutTypeBreakdown.length > 0 && (
        <ProgressChart
          data={analytics.workoutTypeBreakdown}
          type="pie"
          title="Workout Type Breakdown"
          height={400}
        />
      )}

      {/* Coach-specific analytics */}
      {userRole === 'coach' && analytics.studentAnalytics && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.studentAnalytics.map((student, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.studentName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {student.studentEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.totalAssignments}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.completedAssignments}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${student.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">
                          {student.completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.lastActivity ? formatDate(student.lastActivity) : 'Never'}
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
};

export default ProgressAnalytics;

