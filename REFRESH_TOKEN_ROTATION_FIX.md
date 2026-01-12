# 🔧 Fix : Refresh Token Rotation ("Already Used" Error)

**Date :** 9 janvier 2025  
**Problème :** `Invalid Refresh Token: Already Used`  
**Status :** ✅ **CORRIGÉ**

---

## 🐛 Problème Identifié

### Erreur Observée

```
AuthApiError: Invalid Refresh Token: Already Used
    at handleError (@supabase_supabase-js.js?v=9edfa3f5:659:9)
```

### Cause Racine

**Refresh Token Rotation Race Condition**

Supabase utilise un système de **rotation des refresh tokens** :
1. Chaque refresh token ne peut être utilisé **qu'une seule fois**
2. Après utilisation, Supabase génère un **nouveau** refresh token
3. L'ancien refresh token est **invalidé** immédiatement

Le problème survient quand **deux processus tentent de rafraîchir en même temps** :

```
Temps T0: Token expire
    │
    ├─> Processus A: refreshAuthToken() utilise refresh_token_1
    │
    └─> Processus B: Supabase autoRefreshToken utilise refresh_token_1
        │
        └─> ❌ ERREUR: "Already Used" (le premier a invalidé le token)
```

### Scénarios Déclencheurs

1. **Concurrence interne :** `refreshAuthToken()` + Supabase `autoRefreshToken` en parallèle
2. **Plusieurs onglets :** Deux onglets utilisent le même refresh token
3. **Refresh Token obsolète :** Utilisation d'un ancien refresh token déjà remplacé

---

## ✅ Solutions Implémentées

### 1. Meilleure Détection de l'Erreur "Already Used"

Ajout de la détection spécifique de `"Already Used"` dans tous les endroits où on gère les erreurs de refresh :

```javascript
if (error.message?.includes('Invalid Refresh Token') || 
    error.message?.includes('Refresh Token Not Found') ||
    error.message?.includes('Already Used')) {  // ✅ NOUVEAU
  console.log('ℹ️ Refresh token invalid or already used, cleaning up...');
  // Nettoyer tous les tokens
  safeRemoveItem('supabaseRefreshToken');
  safeRemoveItem('authToken');
  safeRemoveItem('sb-auth-token');
  logout(true); // Forcer la déconnexion
}
```

**Fichier modifié :** `frontend/src/contexts/AuthContext.jsx`  
**Lignes :** 203-214, 217-228, 247-257

### 2. Synchronisation des Refresh Manuels et Automatiques

Quand Supabase termine un refresh automatique, on résout les refresh manuels en attente :

```javascript
if (event === 'TOKEN_REFRESHED') {
  if (session) {
    console.log('✅ Supabase auto-refresh completed, persisting new tokens...');
    persistSessionTokens(session);
    
    // ✅ NOUVEAU: Si un refresh manuel est en cours, le résoudre
    if (isRefreshingRef.current) {
      console.log('🔄 Manual refresh in progress, resolving with Supabase token');
      resolveRefreshQueue(null, session.access_token);
      isRefreshingRef.current = false;
    }
  }
}
```

**Fichier modifié :** `frontend/src/contexts/AuthContext.jsx`  
**Lignes :** 528-537

### 3. Nettoyage Complet des Tokens

En cas d'erreur "Already Used", on nettoie **tous** les tokens (pas seulement les principaux) :

```javascript
safeRemoveItem('supabaseRefreshToken');  // Refresh token
safeRemoveItem('authToken');             // Access token
safeRemoveItem('sb-auth-token');         // Session Supabase
localStorage.removeItem('sb-auth-token'); // Double cleanup
```

---

## 🧪 Tests de Validation

### Test 1 : Vérifier que l'Erreur ne se Reproduit Plus

**Exécutez ce test dans la console :**

```javascript
(async () => {
  console.log('\n=== 🧪 Test: Refresh Token Rotation ===\n');
  
  if (!window.axios) {
    console.log('❌ Axios not found. Please reload.');
    return;
  }
  
  const originalToken = localStorage.getItem('authToken');
  if (!originalToken) {
    console.log('❌ No token found. Please login first.');
    return;
  }
  
  console.log('✅ Setting invalid token...');
  localStorage.setItem('authToken', 'invalid_test_token');
  window.axios.defaults.headers.common['Authorization'] = 'Bearer invalid_test_token';
  
  console.log('📡 Making request (should auto-refresh)...\n');
  
  try {
    const response = await window.axios.get('http://localhost:3001/api/exercises');
    console.log('\n✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
    console.log('Request completed after auto-refresh!\n');
    
    const newToken = localStorage.getItem('authToken');
    if (newToken !== 'invalid_test_token') {
      console.log('🎉 Token refreshed successfully!');
    }
  } catch (error) {
    console.log('\n❌ FAILED:', error.message);
    if (error.message?.includes('Already Used')) {
      console.log('🚨 PROBLEM: "Already Used" error still occurring!');
    } else {
      console.log('ℹ️  Different error (might be expected)');
    }
  }
  
  console.log('\n==================\n');
})();
```

**Résultat attendu :**
- ✅ Pas d'erreur "Already Used"
- ✅ Token rafraîchi avec succès
- ✅ Requête complétée

---

### Test 2 : Persistance après F5

**Instructions :**
1. Connectez-vous à l'application
2. Attendez 5-10 secondes
3. Appuyez sur **F5**
4. Vérifiez que vous restez connecté

**Résultat attendu :**
- ✅ Pas de redirection vers `/login`
- ✅ Vous restez sur la même page
- ✅ Aucune erreur dans la console

---

### Test 3 : Connexion après Déconnexion Forcée

**Instructions :**
1. Si vous avez été déconnecté à cause de l'erreur "Already Used", reconnectez-vous
2. Naviguez normalement dans l'application
3. Attendez quelques minutes (pour tester le refresh automatique)

**Résultat attendu :**
- ✅ La connexion reste stable
- ✅ Pas d'erreur "Already Used"
- ✅ Le refresh automatique fonctionne silencieusement

---

## 📊 Logs de Diagnostic

### Logs Attendus (Normal)

```
✅ Supabase auto-refresh completed, persisting new tokens...
✅ Token refreshed successfully
```

### Logs d'Erreur (Si le Problème Persiste)

```
❌ refreshSession failed: Invalid Refresh Token: Already Used
🚨 Refresh token is invalid or already used
🔒 Refresh token invalid or already used, forcing logout...
```

---

## 🛡️ Prévention Future

### Bonnes Pratiques Implémentées

1. **Queue de Refresh :** Évite les refresh simultanés (`isRefreshingRef`)
2. **Synchronisation Supabase :** Réutilise les tokens rafraîchis par Supabase
3. **Nettoyage Complet :** En cas d'erreur, nettoie tous les tokens
4. **Logout Forcé :** Évite les boucles infinies de refresh

### Architecture de Refresh

```
                    Token Expiré
                         │
                         ▼
              ┌──────────────────────┐
              │ Qui rafraîchit ?     │
              └──────────────────────┘
                    │          │
        ┌───────────┴──┐      │
        │              │      │
        ▼              ▼      ▼
  Supabase Auto   refreshAuthToken()
  (autoRefreshToken)    (Axios)
        │              │
        └──────┬───────┘
               │
               ▼
    ┌──────────────────────┐
    │ onAuthStateChange    │
    │ détecte TOKEN_REFRESHED│
    └──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ persistSessionTokens  │
    │ (nouveau refresh token)│
    └──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Résoudre les refresh  │
    │ manuels en attente    │
    └──────────────────────┘
               │
               ▼
         ✅ Success !
```

---

## 🔍 Monitoring

Pour surveiller si le problème se reproduit, cherchez ces logs dans la console :

### ✅ Logs de Succès

```
✅ Supabase auto-refresh completed
✅ Token refreshed successfully
🔄 Manual refresh in progress, resolving with Supabase token
```

### 🚨 Logs d'Alerte

```
🚨 Refresh token is invalid or already used
🔒 Refresh token invalid or already used, forcing logout
```

---

## 📝 Checklist Post-Fix

- [x] Détection de "Already Used" ajoutée
- [x] Synchronisation Supabase + Manual refresh
- [x] Nettoyage complet des tokens
- [x] Logout forcé en cas d'erreur
- [ ] Test de validation (à exécuter)
- [ ] Test de persistance F5 (à exécuter)
- [ ] Monitoring sur plusieurs sessions

---

## 🎯 Prochaines Étapes

1. **Exécutez le Test 1** dans la console pour valider le fix
2. **Testez la Persistance** (F5) pour confirmer la stabilité
3. **Utilisez l'Application** normalement pendant 15-30 minutes
4. **Surveillez les Logs** pour détecter toute récurrence

---

**Si le problème persiste après ces fixes, envisagez :**
- Désactiver `autoRefreshToken: false` dans Supabase (gérer manuellement)
- Implémenter un système de "refresh token lock" multi-onglets
- Ajouter un délai aléatoire avant les refresh pour éviter les collisions

---

**Status :** ✅ **FIX IMPLÉMENTÉ - EN ATTENTE DE VALIDATION**

