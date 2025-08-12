import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, logout, isAdmin, isCoach, isStudent } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Role-specific content
  const getRoleContent = () => {
    if (isAdmin()) {
      return {
        title: 'Admin Dashboard',
        description: 'Manage your fitness platform',
        features: [
          'View all users and their roles',
          'Manage platform settings',
          'Monitor system performance',
          'Access analytics and reports'
        ],
        color: 'bg-red-500'
      };
    } else if (isCoach()) {
      return {
        title: 'Coach Dashboard',
        description: 'Create and manage workout programs',
        features: [
          'Create new exercises',
          'Build workout sessions',
          'Assign programs to students',
          'Track student progress'
        ],
        color: 'bg-green-500'
      };
    } else if (isStudent()) {
      return {
        title: 'Student Dashboard',
        description: 'Follow your personalized workout programs',
        features: [
          'View assigned workouts',
          'Track your progress',
          'Complete exercises',
          'Communicate with your coach'
        ],
        color: 'bg-blue-500'
      };
    }
    return {
      title: 'Dashboard',
      description: 'Welcome to Kaiylo',
      features: ['Access your personalized content'],
      color: 'bg-gray-500'
    };
  };

  const roleContent = getRoleContent();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Kaiylo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user?.name}</span>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full text-white ${roleContent.color}`}>
                  {user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {roleContent.title}
            </h2>
            <p className="text-gray-600">
              {roleContent.description}
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roleContent.features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className={`w-12 h-12 ${roleContent.color} rounded-lg flex items-center justify-center mb-4`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {feature}
                </h3>
                <p className="text-gray-600 text-sm">
                  Coming soon...
                </p>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Across all roles</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Active Programs</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Currently running</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Completed Workouts</h3>
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">This month</p>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Dashboard Features Coming Soon
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    We're working hard to bring you the full Kaiylo experience. 
                    More features will be available soon!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
