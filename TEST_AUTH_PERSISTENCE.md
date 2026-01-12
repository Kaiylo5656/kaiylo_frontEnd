# Test de Persistance de l'Authentification

Ce document décrit comment tester la persistance de la connexion et le refresh automatique des tokens.

## 🎯 Tests à Effectuer

### Test 1: Persistance après Rafraîchissement de Page

**Objectif:** Vérifier que l'utilisateur reste connecté après un F5.

**Étapes:**
1. Connectez-vous avec Google OAuth
2. Notez votre page actuelle (ex: `/coach/dashboard`)
3. Appuyez sur `F5` ou `Ctrl+R`
4. **Résultat attendu:** Vous devez rester sur la même page, connecté

**Logs attendus dans la console:**
```
✅ Auth check successful via localStorage token
```

---

### Test 2: Refresh Automatique du Token

**Objectif:** Vérifier que le token est automatiquement rafraîchi quand il expire.

**Dans la console du navigateur, exécutez:**

```javascript
// Simuler un token expiré
const originalToken = localStorage.getItem('authToken');
console.log('🔒 Setting expired token...');
localStorage.setItem('authToken', 'invalid_token_123');

// Tester une requête API (devrait déclencher le refresh)
console.log('📡 Making API call with expired token...');
fetch('http://localhost:3001/api/auth/me', {
  headers: { 'Authorization': 'Bearer invalid_token_123' }
})
.then(res => {
  console.log('Response status:', res.status);
  return res.json();
})
.then(data => console.log('API Response:', data))
.catch(err => console.error('API Error:', err));

// Attendre 3 secondes puis vérifier le token
setTimeout(() => {
  const newToken = localStorage.getItem('authToken');
  if (newToken !== 'invalid_token_123') {
    console.log('✅ Token was refreshed automatically!');
    console.log('New token preview:', newToken.substring(0, 50) + '...');
  } else {
    console.log('❌ Token was NOT refreshed');
  }
}, 3000);
```

**Logs attendus dans la console:**
```
🚨 Interceptor: Caught 401 Unauthorized. Attempting token refresh...
🔄 Refreshing auth token...
✅ Token refreshed successfully
✅ Token was refreshed automatically!
```

---

### Test 3: Reconnexion avec Refresh Token Uniquement

**Objectif:** Vérifier qu'on peut se reconnecter avec seulement le refresh token.

**Dans la console du navigateur, exécutez:**

```javascript
// Supprimer le token d'accès mais garder le refresh token
console.log('🗑️ Removing access token, keeping refresh token...');
const refreshToken = localStorage.getItem('supabaseRefreshToken');
console.log('Refresh token exists:', !!refreshToken);

localStorage.removeItem('authToken');
delete axios.defaults.headers.common['Authorization'];

// Attendre 2 secondes puis recharger
setTimeout(() => {
  console.log('🔄 Reloading page...');
  window.location.reload();
}, 2000);
```

**Résultat attendu:** 
- Après le reload, vous devez rester connecté
- Un nouveau access token doit être généré

**Logs attendus dans la console:**
```
🔄 No access token found, will use refreshSession
🔄 Refreshing auth token...
✅ Token refreshed successfully
✅ Auth check successful via Supabase session
```

---

### Test 4: Déconnexion Complète

**Objectif:** Vérifier la déconnexion quand tous les tokens sont supprimés.

**Dans la console du navigateur, exécutez:**

```javascript
// Supprimer tous les tokens
console.log('🗑️ Clearing all tokens...');
localStorage.clear();
sessionStorage.clear();
delete axios.defaults.headers.common['Authorization'];

// Recharger
setTimeout(() => {
  console.log('🔄 Reloading page...');
  window.location.reload();
}, 1000);
```

**Résultat attendu:**
- Vous devez être redirigé vers `/login`

**Logs attendus dans la console:**
```
ℹ️ No auth data in storage, skipping Supabase check
```

---

### Test 5: Token Expiré Naturellement

**Objectif:** Attendre que le token expire naturellement (pour un test réel).

**Dans la console du navigateur, exécutez:**

```javascript
// Vérifier quand le token expire
const token = localStorage.getItem('authToken');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const timeLeftMinutes = Math.round((expiresAt - now) / 1000 / 60);
    
    console.log('⏰ Token expires at:', expiresAt.toLocaleString('fr-FR'));
    console.log('⏱️ Time left:', timeLeftMinutes, 'minutes');
    
    if (timeLeftMinutes < 60) {
      console.log('⚠️ Token expires soon! You can wait and test automatic refresh.');
    } else {
      console.log('ℹ️ Token has', timeLeftMinutes, 'minutes left. Too long to wait for natural expiration.');
    }
  } catch (e) {
    console.error('❌ Error decoding token:', e);
  }
} else {
  console.log('❌ No token found');
}
```

**Note:** Les tokens JWT de Supabase expirent généralement après 1 heure. Vous pouvez attendre qu'il expire naturellement, puis faire une requête API pour voir si le refresh se déclenche automatiquement.

---

## 🔍 Commandes Utiles de Debug

### Vérifier l'État Actuel de l'Auth

```javascript
// Vérifier tous les tokens
console.log('=== AUTH STATE ===');
console.log('Auth Token:', localStorage.getItem('authToken') ? '✅ Present' : '❌ Missing');
console.log('Refresh Token:', localStorage.getItem('supabaseRefreshToken') ? '✅ Present' : '❌ Missing');
console.log('Supabase Session:', localStorage.getItem('sb-auth-token') ? '✅ Present' : '❌ Missing');

// Décoder le token actuel
const token = localStorage.getItem('authToken');
if (token) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      console.log('Token payload:', {
        user_id: payload.sub,
        email: payload.email,
        role: payload.user_metadata?.role,
        expires: new Date(payload.exp * 1000).toLocaleString('fr-FR'),
        issued: new Date(payload.iat * 1000).toLocaleString('fr-FR')
      });
    }
  } catch (e) {
    console.error('Error decoding token:', e);
  }
}
```

### Forcer un Refresh Manuel

```javascript
// Forcer un refresh du token
console.log('🔄 Forcing token refresh...');
// Cette fonction doit être appelée depuis le contexte React
// Vous pouvez trigger un 401 en faisant une requête avec un token invalide
fetch('http://localhost:3001/api/auth/me', {
  headers: { 'Authorization': 'Bearer invalid' }
}).catch(err => console.log('Expected error:', err));
```

### Vérifier l'Intercepteur Axios

```javascript
// Vérifier si l'intercepteur est actif
console.log('Axios interceptors:', {
  request: axios.interceptors.request.handlers.length,
  response: axios.interceptors.response.handlers.length
});

// L'intercepteur response devrait être >= 1 pour le refresh automatique
```

---

## ✅ Checklist de Tests

- [ ] Test 1: Persistance après F5 ✓
- [ ] Test 2: Refresh automatique avec token expiré ✓
- [ ] Test 3: Reconnexion avec refresh token uniquement ✓
- [ ] Test 4: Déconnexion complète ✓
- [ ] Test 5: Vérifier l'expiration naturelle du token (optionnel)

---

## 🐛 Problèmes Connus et Solutions

### Problème: "Token was NOT refreshed"
**Solution:** Vérifiez que le refresh token existe dans localStorage. Si absent, reconnectez-vous.

### Problème: Redirected to login after F5
**Solution:** 
1. Vérifiez que les tokens sont dans localStorage
2. Vérifiez les logs pour voir si `checkAuthStatus` est appelé
3. Assurez-vous que le backend est accessible

### Problème: Infinite refresh loop
**Solution:** Cela indique que le refresh token est invalide. Déconnectez-vous complètement et reconnectez-vous.

---

## 📊 Résultats Attendus

| Test | Résultat Attendu | Durée |
|------|------------------|-------|
| Persistance F5 | Reste connecté | Instantané |
| Refresh auto | Token rafraîchi | 1-3 secondes |
| Refresh token only | Nouvelle session | 2-4 secondes |
| Déconnexion | Redirect vers login | Instantané |

---

**Note:** Ces tests sont non-destructifs et peuvent être exécutés à tout moment pendant le développement.

