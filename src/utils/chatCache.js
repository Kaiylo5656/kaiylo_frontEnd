import { safeGetItem, safeSetItem, safeRemoveItem } from './storage';

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHED_MESSAGES = 50;

// --- Keys ---
const conversationsKey = (userId) => `kaiylo_chat_${userId}`;
const messagesKey = (conversationId) => `kaiylo_msgs_${conversationId}`;
const KNOWN_KEYS_KEY = 'kaiylo_chat_keys';

// Track all cache keys so clearAll can find them
function trackKey(key) {
  try {
    const raw = safeGetItem(KNOWN_KEYS_KEY);
    const keys = raw ? JSON.parse(raw) : [];
    if (!keys.includes(key)) {
      keys.push(key);
      safeSetItem(KNOWN_KEYS_KEY, JSON.stringify(keys));
    }
  } catch {
    // ignore
  }
}

// --- Conversations ---

export function getCachedConversations(userId) {
  if (!userId) return null;
  try {
    const raw = safeGetItem(conversationsKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      safeRemoveItem(conversationsKey(userId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedConversations(userId, conversations) {
  if (!userId) return;
  const key = conversationsKey(userId);
  try {
    safeSetItem(key, JSON.stringify({
      data: conversations,
      timestamp: Date.now()
    }));
    trackKey(key);
  } catch {
    // ignore — quota exceeded etc.
  }
}

export function updateCachedConversation(userId, convId, updates) {
  if (!userId || !convId) return;
  const cached = getCachedConversations(userId);
  if (!cached) return;
  const updated = cached.data.map(conv =>
    conv.id === convId ? { ...conv, ...updates } : conv
  );
  setCachedConversations(userId, updated);
}

// Get the ISO timestamp of when conversations were last cached (for sync endpoint)
export function getCacheTimestamp(userId) {
  const cached = getCachedConversations(userId);
  if (!cached?.timestamp) return null;
  return new Date(cached.timestamp).toISOString();
}

// Merge synced conversations into cached list (update existing, add new)
export function mergeSyncedConversations(userId, synced) {
  if (!userId || !synced?.length) return;
  const cached = getCachedConversations(userId);
  if (!cached?.data) return;

  const map = new Map(cached.data.map(c => [c.id, c]));
  synced.forEach(conv => map.set(conv.id, conv));

  const merged = [...map.values()].sort((a, b) => {
    const aTime = a.last_message_at || a.created_at || '';
    const bTime = b.last_message_at || b.created_at || '';
    return new Date(bTime) - new Date(aTime);
  });

  setCachedConversations(userId, merged);
  return merged;
}

// --- Messages ---

export function getCachedMessages(conversationId) {
  if (!conversationId) return null;
  try {
    const raw = safeGetItem(messagesKey(conversationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      safeRemoveItem(messagesKey(conversationId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedMessages(conversationId, messages, nextCursor) {
  if (!conversationId) return;
  const key = messagesKey(conversationId);
  try {
    // Only cache the latest messages (tail)
    const toCache = messages.slice(-MAX_CACHED_MESSAGES);
    safeSetItem(key, JSON.stringify({
      messages: toCache,
      nextCursor: nextCursor || null,
      timestamp: Date.now()
    }));
    trackKey(key);
  } catch {
    // ignore
  }
}

export function appendCachedMessage(conversationId, message) {
  if (!conversationId || !message) return;
  const cached = getCachedMessages(conversationId);
  if (!cached) return;
  // Avoid duplicates
  if (cached.messages.some(m => m.id === message.id)) return;
  const updated = [...cached.messages, message].slice(-MAX_CACHED_MESSAGES);
  setCachedMessages(conversationId, updated, cached.nextCursor);
}

// --- Cleanup ---

export function clearAllChatCache() {
  try {
    const raw = safeGetItem(KNOWN_KEYS_KEY);
    if (raw) {
      const keys = JSON.parse(raw);
      keys.forEach(key => safeRemoveItem(key));
    }
    safeRemoveItem(KNOWN_KEYS_KEY);
  } catch {
    // ignore
  }
}
