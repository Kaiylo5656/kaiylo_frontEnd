# 🚀 Test Rapide de l'Authentification

## Test Instantané dans la Console

Copiez-collez ce code directement dans la console du navigateur :

```javascript
// ========================================
// 🧪 TEST RAPIDE DU REFRESH AUTOMATIQUE
// ========================================

(async () => {
  console.log('\n=== 🧪 Axios Interceptor Test (Real Endpoint) ===\n');
  
  // Vérifier qu'axios est disponible
  if (!window.axios) {
    console.log('❌ Axios not found. Reloading page to expose axios...');
    window.location.reload();
    return;
  }
  
  console.log('✅ Axios found!');
  
  // Sauvegarder le token original
  const originalToken = localStorage.getItem('authToken');
  
  if (!originalToken) {
    console.log('❌ No auth token found. Please login first.');
    return;
  }
  
  console.log('✅ Original token found');
  console.log('Token preview:', originalToken.substring(0, 50) + '...\n');
  
  // Mettre un token invalide
  console.log('🔒 Setting invalid token...');
  localStorage.setItem('authToken', 'invalid_test_token');
  window.axios.defaults.headers.common['Authorization'] = 'Bearer invalid_test_token';
  
  console.log('📡 Making request to /api/exercises (should auto-refresh)...');
  console.log('⏳ Expected flow:');
  console.log('   1️⃣  Request fails with 401');
  console.log('   2️⃣  Interceptor catches error');
  console.log('   3️⃣  Token is refreshed');
  console.log('   4️⃣  Request is retried automatically\n');
  
  try {
    // Note: We use /api/exercises instead of /auth/me because
    // the interceptor skips /auth/me to avoid infinite loops
    const response = await window.axios.get('http://localhost:3001/api/exercises');
    
    console.log('\n✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
    console.log('Request completed after auto-refresh!\n');
    console.log('Exercises count:', response.data.exercises?.length || 0);
    
    // Vérifier si le token a été rafraîchi
    const newToken = localStorage.getItem('authToken');
    if (newToken !== 'invalid_test_token') {
      console.log('\n🎉 Token was AUTOMATICALLY REFRESHED by interceptor!');
      console.log('New token preview:', newToken.substring(0, 50) + '...\n');
    }
    
  } catch (error) {
    console.log('\n❌ Request FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.message);
    
    // Restaurer le token original
    console.log('\n⚠️ Restoring original token...');
    localStorage.setItem('authToken', originalToken);
    window.axios.defaults.headers.common['Authorization'] = `Bearer ${originalToken}`;
    console.log('✅ Original token restored');
  }
  
  console.log('\n==================\n');
})();
```

---

## 📊 Résultat Attendu

Si le refresh automatique fonctionne, vous devriez voir :

```
✅ ✅ ✅ SUCCESS! ✅ ✅ ✅
Request completed successfully after auto-refresh!

User data: { id: '...', email: '...', role: '...' }

🎉 Token was AUTOMATICALLY REFRESHED by interceptor!
New token preview: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOi...
```

---

## 🔍 Test Plus Simple : Vérifier l'État

Pour simplement vérifier l'état actuel de votre auth :

```javascript
// État de l'authentification
console.log('=== 🔍 AUTH STATE ===\n');
console.log('Axios available:', !!window.axios);
console.log('Auth Token:', localStorage.getItem('authToken') ? '✅ Present' : '❌ Missing');
console.log('Refresh Token:', localStorage.getItem('supabaseRefreshToken') ? '✅ Present' : '❌ Missing');

// Décoder le token
const token = localStorage.getItem('authToken');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = new Date(payload.exp * 1000);
    const timeLeft = Math.round((expiresAt - new Date()) / 1000 / 60);
    
    console.log('\n📋 Token Info:');
    console.log('Email:', payload.email);
    console.log('Role:', payload.user_metadata?.role);
    console.log('Expires:', expiresAt.toLocaleString('fr-FR'));
    console.log('Time left:', timeLeft, 'minutes');
  } catch (e) {
    console.error('Error decoding token:', e.message);
  }
}
console.log('\n==================\n');
```

---

## ✅ Test de Persistance (F5)

Le test le plus simple pour vérifier la persistance :

1. **Vérifiez que vous êtes connecté** (sur `/coach/dashboard` par exemple)
2. **Appuyez sur F5** pour recharger la page
3. **Vous devriez rester sur la même page**, toujours connecté

Si vous êtes redirigé vers `/login`, il y a un problème de persistance.

---

## 🚨 En Cas de Problème

Si le test échoue, exécutez ceci pour restaurer votre session :

```javascript
// Forcer un reload pour restaurer la session
console.log('🔄 Reloading to restore session...');
window.location.reload();
```

---

## 📝 Logs à Surveiller

Pendant le test, surveillez ces logs dans la console :

- `🚨 Interceptor: Caught 401 Unauthorized` → L'intercepteur a détecté l'erreur
- `🔄 Refreshing auth token...` → Le refresh a commencé
- `✅ Token refreshed successfully` → Le refresh a réussi
- `🔄 Retrying original request after token refresh` → La requête est réessayée

---

## 🎯 Que Teste-t-on Exactement ?

Ce test vérifie que :
1. ✅ L'intercepteur Axios détecte les erreurs 401
2. ✅ Le token est automatiquement rafraîchi avec le refresh token
3. ✅ La requête originale est réessayée automatiquement
4. ✅ L'utilisateur ne perd jamais sa connexion

C'est le mécanisme qui garantit que vos utilisateurs restent connectés même si le token expire pendant qu'ils utilisent l'application.

