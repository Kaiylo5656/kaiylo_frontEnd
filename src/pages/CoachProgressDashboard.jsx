import React from 'react';
import ProgressAnalytics from '../components/ProgressAnalytics';

const CoachProgressDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Progress Analytics</h1>
          <p className="mt-2 text-gray-600">
            Monitor your students' progress and performance analytics.
          </p>
        </div>
        
        <ProgressAnalytics userRole="coach" />
      </div>
    </div>
  );
};

export default CoachProgressDashboard;
