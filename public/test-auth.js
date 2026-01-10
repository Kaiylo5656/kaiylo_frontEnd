/**
 * Script de test pour l'authentification et la persistance des tokens
 * À exécuter dans la console du navigateur
 * 
 * Usage: Copiez-collez ce fichier dans la console ou chargez-le via:
 * const script = document.createElement('script');
 * script.src = '/test-auth.js';
 * document.head.appendChild(script);
 */

window.AuthTester = {
  // Afficher l'état actuel de l'auth
  checkStatus() {
    console.log('\n=== 🔍 AUTH STATUS ===\n');
    
    const authToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('supabaseRefreshToken');
    const sbSession = localStorage.getItem('sb-auth-token');
    
    console.log('Auth Token:', authToken ? '✅ Present' : '❌ Missing');
    console.log('Refresh Token:', refreshToken ? '✅ Present' : '❌ Missing');
    console.log('Supabase Session:', sbSession ? '✅ Present' : '❌ Missing');
    
    if (authToken) {
      try {
        const parts = authToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const expiresAt = new Date(payload.exp * 1000);
          const now = new Date();
          const timeLeftMinutes = Math.round((expiresAt - now) / 1000 / 60);
          
          console.log('\n📋 Token Info:');
          console.log('  User ID:', payload.sub);
          console.log('  Email:', payload.email);
          console.log('  Role:', payload.user_metadata?.role || 'N/A');
          console.log('  Issued:', new Date(payload.iat * 1000).toLocaleString('fr-FR'));
          console.log('  Expires:', expiresAt.toLocaleString('fr-FR'));
          console.log('  ⏱️ Time left:', timeLeftMinutes, 'minutes');
          
          if (timeLeftMinutes < 5) {
            console.log('  ⚠️ Token expires very soon!');
          }
        }
      } catch (e) {
        console.error('❌ Error decoding token:', e.message);
      }
    }
    
    console.log('\n==================\n');
  },

  // Test 1: Simuler un token expiré
  async testExpiredToken() {
    console.log('\n=== 🧪 TEST: Expired Token with Axios Interceptor ===\n');
    
    if (!window.axios) {
      console.log('❌ Axios not found in window. Make sure the app is loaded.');
      return;
    }
    
    const originalToken = localStorage.getItem('authToken');
    if (!originalToken) {
      console.log('❌ No auth token found. Please login first.');
      return;
    }
    
    console.log('✅ Original token found');
    console.log('🔒 Setting invalid token...');
    
    localStorage.setItem('authToken', 'invalid_test_token');
    window.axios.defaults.headers.common['Authorization'] = 'Bearer invalid_test_token';
    
    console.log('📡 Making request to /api/exercises (should auto-refresh)...');
    console.log('⏳ Expected flow:');
    console.log('   1️⃣  Request fails with 401');
    console.log('   2️⃣  Interceptor catches error');
    console.log('   3️⃣  Token is refreshed');
    console.log('   4️⃣  Request is retried automatically\n');
    console.log('ℹ️  Note: We use /api/exercises instead of /auth/me because');
    console.log('   the interceptor skips /auth/me to avoid infinite loops.\n');
    
    try {
      // Note: Using /api/exercises instead of /auth/me because
      // the interceptor intentionally ignores /auth/me to prevent infinite loops
      const response = await window.axios.get('http://localhost:3001/api/exercises');
      
      console.log('\n✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
      console.log('Request completed after auto-refresh!\n');
      console.log('Exercises count:', response.data.exercises?.length || 0);
      
      // Vérifier si le token a été rafraîchi
      const newToken = localStorage.getItem('authToken');
      if (newToken !== 'invalid_test_token') {
        console.log('\n🎉 Token was AUTOMATICALLY REFRESHED by interceptor!');
        console.log('New token preview:', newToken.substring(0, 50) + '...');
      }
      
    } catch (error) {
      console.log('\n❌ FAILED:', error.message);
      console.log('Status:', error.response?.status);
      
      console.log('\n⚠️ Restoring original token...');
      if (originalToken) {
        localStorage.setItem('authToken', originalToken);
        window.axios.defaults.headers.common['Authorization'] = `Bearer ${originalToken}`;
        console.log('✅ Original token restored');
      }
    }
    
    console.log('\n==================\n');
  },

  // Test 2: Persistance après reload
  testPersistence() {
    console.log('\n=== 🧪 TEST: Persistence After Reload ===\n');
    console.log('Current page:', window.location.pathname);
    console.log('Tokens present:', {
      authToken: !!localStorage.getItem('authToken'),
      refreshToken: !!localStorage.getItem('supabaseRefreshToken')
    });
    
    console.log('\n⚠️ Page will reload in 2 seconds...');
    console.log('After reload, you should stay on the same page.\n');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  },

  // Test 3: Reconnexion avec refresh token seulement
  testRefreshTokenOnly() {
    console.log('\n=== 🧪 TEST: Refresh Token Only ===\n');
    
    const refreshToken = localStorage.getItem('supabaseRefreshToken');
    
    if (!refreshToken) {
      console.log('❌ No refresh token found. Please login first.');
      return;
    }
    
    console.log('✅ Refresh token found');
    console.log('Removing access token...');
    
    localStorage.removeItem('authToken');
    if (window.axios) {
      delete window.axios.defaults.headers.common['Authorization'];
    }
    
    console.log('⚠️ Page will reload in 2 seconds...');
    console.log('After reload, you should stay logged in with a new token.\n');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  },

  // Test 4: Déconnexion complète
  testCompleteLogout() {
    console.log('\n=== 🧪 TEST: Complete Logout ===\n');
    console.log('Clearing all tokens...');
    
    localStorage.clear();
    sessionStorage.clear();
    
    if (window.axios) {
      delete window.axios.defaults.headers.common['Authorization'];
    }
    
    console.log('✅ All tokens cleared');
    console.log('⚠️ Page will reload in 2 seconds...');
    console.log('After reload, you should be redirected to /login.\n');
    
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  },

  // Afficher l'aide
  help() {
    console.log('\n=== 🧪 AUTH TESTER - Help ===\n');
    console.log('Available commands:');
    console.log('');
    console.log('  AuthTester.checkStatus()        - Check current auth state');
    console.log('  AuthTester.testExpiredToken()   - Test automatic token refresh');
    console.log('  AuthTester.testPersistence()    - Test persistence after page reload');
    console.log('  AuthTester.testRefreshTokenOnly() - Test login with refresh token only');
    console.log('  AuthTester.testCompleteLogout() - Test complete logout');
    console.log('  AuthTester.help()               - Show this help');
    console.log('');
    console.log('Example:');
    console.log('  AuthTester.checkStatus()');
    console.log('');
    console.log('💡 Tip: Start with checkStatus() to see your current auth state');
    console.log('\n==================\n');
  }
};

// Auto-afficher l'aide au chargement
console.log('\n✅ AuthTester loaded!');
console.log('Type AuthTester.help() to see available commands.\n');

