import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedConversations,
  setCachedConversations,
  updateCachedConversation,
  getCacheTimestamp,
  mergeSyncedConversations,
  getCachedMessages,
  setCachedMessages,
  appendCachedMessage,
  clearAllChatCache,
} from '../chatCache';

// --- Helpers ---

const USER_ID = 'user-abc-123';
const CONV_ID = 'conv-xyz-789';

const makeConversation = (id, lastMessageAt) => ({
  id,
  created_at: '2025-01-01T00:00:00Z',
  last_message_at: lastMessageAt || '2025-06-01T12:00:00Z',
  other_participant_id: 'other-user',
  other_participant_name: 'Test User',
  last_message: { id: `msg-${id}`, content: 'Hello', sender_id: 'other-user', created_at: lastMessageAt || '2025-06-01T12:00:00Z' },
  unread_count: 0,
});

const makeMessage = (id, content = 'Hello') => ({
  id,
  content,
  sender_id: 'other-user',
  message_type: 'text',
  created_at: new Date().toISOString(),
});

// --- Tests ---

describe('chatCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // =====================
  // Conversations
  // =====================
  describe('Conversations cache', () => {
    it('returns null when nothing is cached', () => {
      expect(getCachedConversations(USER_ID)).toBeNull();
    });

    it('returns null for falsy userId', () => {
      expect(getCachedConversations(null)).toBeNull();
      expect(getCachedConversations('')).toBeNull();
      expect(getCachedConversations(undefined)).toBeNull();
    });

    it('stores and retrieves conversations', () => {
      const convs = [makeConversation('c1'), makeConversation('c2')];
      setCachedConversations(USER_ID, convs);

      const cached = getCachedConversations(USER_ID);
      expect(cached).not.toBeNull();
      expect(cached.data).toHaveLength(2);
      expect(cached.data[0].id).toBe('c1');
      expect(cached.data[1].id).toBe('c2');
      expect(cached.timestamp).toBeGreaterThan(0);
    });

    it('does not store when userId is falsy', () => {
      setCachedConversations(null, [makeConversation('c1')]);
      setCachedConversations('', [makeConversation('c1')]);
      // Nothing should be in localStorage
      expect(Object.keys(localStorage)).toHaveLength(0);
    });

    it('isolates cache per userId', () => {
      setCachedConversations('user-A', [makeConversation('cA')]);
      setCachedConversations('user-B', [makeConversation('cB')]);

      expect(getCachedConversations('user-A').data[0].id).toBe('cA');
      expect(getCachedConversations('user-B').data[0].id).toBe('cB');
    });

    it('expires after TTL', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);

      // Fast-forward past 24h TTL
      const cached = getCachedConversations(USER_ID);
      expect(cached).not.toBeNull();

      // Manually backdate the timestamp
      const key = `kaiylo_chat_${USER_ID}`;
      const data = JSON.parse(localStorage.getItem(key));
      data.timestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      localStorage.setItem(key, JSON.stringify(data));

      expect(getCachedConversations(USER_ID)).toBeNull();
      // Should also have been removed from localStorage
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem(`kaiylo_chat_${USER_ID}`, 'not-json{{{');
      expect(getCachedConversations(USER_ID)).toBeNull();
    });
  });

  // =====================
  // updateCachedConversation
  // =====================
  describe('updateCachedConversation', () => {
    it('updates a specific conversation in the cache', () => {
      setCachedConversations(USER_ID, [
        makeConversation('c1'),
        makeConversation('c2'),
      ]);

      updateCachedConversation(USER_ID, 'c1', { unread_count: 5 });

      const cached = getCachedConversations(USER_ID);
      expect(cached.data.find(c => c.id === 'c1').unread_count).toBe(5);
      expect(cached.data.find(c => c.id === 'c2').unread_count).toBe(0);
    });

    it('no-ops when cache does not exist', () => {
      // Should not throw
      updateCachedConversation(USER_ID, 'c1', { unread_count: 5 });
      expect(getCachedConversations(USER_ID)).toBeNull();
    });

    it('no-ops for falsy userId or convId', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);
      updateCachedConversation(null, 'c1', { unread_count: 5 });
      updateCachedConversation(USER_ID, null, { unread_count: 5 });
      // Original should be unchanged
      expect(getCachedConversations(USER_ID).data[0].unread_count).toBe(0);
    });
  });

  // =====================
  // getCacheTimestamp
  // =====================
  describe('getCacheTimestamp', () => {
    it('returns null when no cache exists', () => {
      expect(getCacheTimestamp(USER_ID)).toBeNull();
    });

    it('returns an ISO string after caching', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);
      const ts = getCacheTimestamp(USER_ID);
      expect(ts).toBeTruthy();
      // Verify it's a valid ISO string
      expect(new Date(ts).toISOString()).toBe(ts);
    });
  });

  // =====================
  // mergeSyncedConversations
  // =====================
  describe('mergeSyncedConversations', () => {
    it('merges new conversations into cached list', () => {
      setCachedConversations(USER_ID, [
        makeConversation('c1', '2025-06-01T10:00:00Z'),
        makeConversation('c2', '2025-06-01T09:00:00Z'),
      ]);

      const synced = [makeConversation('c3', '2025-06-01T12:00:00Z')];
      const merged = mergeSyncedConversations(USER_ID, synced);

      expect(merged).toHaveLength(3);
      // c3 is newest, should be first
      expect(merged[0].id).toBe('c3');
    });

    it('updates existing conversations with synced data', () => {
      setCachedConversations(USER_ID, [
        makeConversation('c1', '2025-06-01T10:00:00Z'),
      ]);

      const updated = { ...makeConversation('c1', '2025-06-01T14:00:00Z'), unread_count: 3 };
      const merged = mergeSyncedConversations(USER_ID, [updated]);

      expect(merged).toHaveLength(1);
      expect(merged[0].unread_count).toBe(3);
      expect(merged[0].last_message_at).toBe('2025-06-01T14:00:00Z');
    });

    it('persists merged result to cache', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);
      mergeSyncedConversations(USER_ID, [makeConversation('c2', '2025-07-01T00:00:00Z')]);

      const cached = getCachedConversations(USER_ID);
      expect(cached.data).toHaveLength(2);
    });

    it('returns undefined when no cache exists', () => {
      const result = mergeSyncedConversations(USER_ID, [makeConversation('c1')]);
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty synced array', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);
      expect(mergeSyncedConversations(USER_ID, [])).toBeUndefined();
      expect(mergeSyncedConversations(USER_ID, null)).toBeUndefined();
    });

    it('sorts merged conversations by last_message_at descending', () => {
      setCachedConversations(USER_ID, [
        makeConversation('c1', '2025-06-01T08:00:00Z'),
        makeConversation('c2', '2025-06-01T12:00:00Z'),
      ]);

      const synced = [makeConversation('c3', '2025-06-01T10:00:00Z')];
      const merged = mergeSyncedConversations(USER_ID, synced);

      expect(merged[0].id).toBe('c2'); // 12:00
      expect(merged[1].id).toBe('c3'); // 10:00
      expect(merged[2].id).toBe('c1'); // 08:00
    });
  });

  // =====================
  // Messages
  // =====================
  describe('Messages cache', () => {
    it('returns null when nothing is cached', () => {
      expect(getCachedMessages(CONV_ID)).toBeNull();
    });

    it('returns null for falsy conversationId', () => {
      expect(getCachedMessages(null)).toBeNull();
      expect(getCachedMessages('')).toBeNull();
    });

    it('stores and retrieves messages', () => {
      const msgs = [makeMessage('m1'), makeMessage('m2'), makeMessage('m3')];
      setCachedMessages(CONV_ID, msgs, 'cursor-abc');

      const cached = getCachedMessages(CONV_ID);
      expect(cached).not.toBeNull();
      expect(cached.messages).toHaveLength(3);
      expect(cached.messages[0].id).toBe('m1');
      expect(cached.nextCursor).toBe('cursor-abc');
      expect(cached.timestamp).toBeGreaterThan(0);
    });

    it('stores null nextCursor when not provided', () => {
      setCachedMessages(CONV_ID, [makeMessage('m1')]);
      expect(getCachedMessages(CONV_ID).nextCursor).toBeNull();
    });

    it('does not store when conversationId is falsy', () => {
      setCachedMessages(null, [makeMessage('m1')]);
      setCachedMessages('', [makeMessage('m1')]);
      expect(Object.keys(localStorage).filter(k => k.startsWith('kaiylo_msgs_'))).toHaveLength(0);
    });

    it('caps cached messages at 50', () => {
      const msgs = Array.from({ length: 80 }, (_, i) => makeMessage(`m${i}`));
      setCachedMessages(CONV_ID, msgs);

      const cached = getCachedMessages(CONV_ID);
      expect(cached.messages).toHaveLength(50);
      // Should keep the latest 50 (tail)
      expect(cached.messages[0].id).toBe('m30');
      expect(cached.messages[49].id).toBe('m79');
    });

    it('expires after TTL', () => {
      setCachedMessages(CONV_ID, [makeMessage('m1')]);

      const key = `kaiylo_msgs_${CONV_ID}`;
      const data = JSON.parse(localStorage.getItem(key));
      data.timestamp = Date.now() - (25 * 60 * 60 * 1000);
      localStorage.setItem(key, JSON.stringify(data));

      expect(getCachedMessages(CONV_ID)).toBeNull();
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem(`kaiylo_msgs_${CONV_ID}`, '{broken}}}');
      expect(getCachedMessages(CONV_ID)).toBeNull();
    });
  });

  // =====================
  // appendCachedMessage
  // =====================
  describe('appendCachedMessage', () => {
    it('appends a message to the cached list', () => {
      setCachedMessages(CONV_ID, [makeMessage('m1'), makeMessage('m2')]);

      appendCachedMessage(CONV_ID, makeMessage('m3', 'New message'));

      const cached = getCachedMessages(CONV_ID);
      expect(cached.messages).toHaveLength(3);
      expect(cached.messages[2].id).toBe('m3');
      expect(cached.messages[2].content).toBe('New message');
    });

    it('does not add duplicate messages', () => {
      setCachedMessages(CONV_ID, [makeMessage('m1')]);

      appendCachedMessage(CONV_ID, makeMessage('m1', 'Duplicate'));

      const cached = getCachedMessages(CONV_ID);
      expect(cached.messages).toHaveLength(1);
    });

    it('no-ops when no cache exists for that conversation', () => {
      // Should not throw
      appendCachedMessage(CONV_ID, makeMessage('m1'));
      expect(getCachedMessages(CONV_ID)).toBeNull();
    });

    it('no-ops for falsy conversationId or message', () => {
      setCachedMessages(CONV_ID, [makeMessage('m1')]);
      appendCachedMessage(null, makeMessage('m2'));
      appendCachedMessage(CONV_ID, null);
      expect(getCachedMessages(CONV_ID).messages).toHaveLength(1);
    });

    it('caps at 50 messages after appending', () => {
      const msgs = Array.from({ length: 50 }, (_, i) => makeMessage(`m${i}`));
      setCachedMessages(CONV_ID, msgs);

      appendCachedMessage(CONV_ID, makeMessage('m50', 'Newest'));

      const cached = getCachedMessages(CONV_ID);
      expect(cached.messages).toHaveLength(50);
      // First message should now be m1 (m0 evicted)
      expect(cached.messages[0].id).toBe('m1');
      expect(cached.messages[49].id).toBe('m50');
    });

    it('preserves nextCursor when appending', () => {
      setCachedMessages(CONV_ID, [makeMessage('m1')], 'cursor-123');
      appendCachedMessage(CONV_ID, makeMessage('m2'));

      expect(getCachedMessages(CONV_ID).nextCursor).toBe('cursor-123');
    });
  });

  // =====================
  // clearAllChatCache
  // =====================
  describe('clearAllChatCache', () => {
    it('removes all chat-related keys from localStorage', () => {
      setCachedConversations('user-A', [makeConversation('c1')]);
      setCachedConversations('user-B', [makeConversation('c2')]);
      setCachedMessages('conv-1', [makeMessage('m1')]);
      setCachedMessages('conv-2', [makeMessage('m2')]);

      // Verify keys exist
      const chatKeysBefore = Object.keys(localStorage).filter(k => k.startsWith('kaiylo_'));
      expect(chatKeysBefore.length).toBeGreaterThan(0);

      clearAllChatCache();

      const chatKeysAfter = Object.keys(localStorage).filter(k => k.startsWith('kaiylo_'));
      expect(chatKeysAfter).toHaveLength(0);
    });

    it('does not throw when no cache exists', () => {
      expect(() => clearAllChatCache()).not.toThrow();
    });

    it('does not affect non-chat localStorage keys', () => {
      localStorage.setItem('authToken', 'abc123');
      localStorage.setItem('other_key', 'value');
      setCachedConversations(USER_ID, [makeConversation('c1')]);

      clearAllChatCache();

      expect(localStorage.getItem('authToken')).toBe('abc123');
      expect(localStorage.getItem('other_key')).toBe('value');
    });
  });

  // =====================
  // Key tracking
  // =====================
  describe('Key tracking (internal)', () => {
    it('tracks conversation and message keys in the keys registry', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);
      setCachedMessages(CONV_ID, [makeMessage('m1')]);

      const keysRaw = localStorage.getItem('kaiylo_chat_keys');
      expect(keysRaw).toBeTruthy();
      const keys = JSON.parse(keysRaw);
      expect(keys).toContain(`kaiylo_chat_${USER_ID}`);
      expect(keys).toContain(`kaiylo_msgs_${CONV_ID}`);
    });

    it('does not duplicate keys when writing to the same cache multiple times', () => {
      setCachedConversations(USER_ID, [makeConversation('c1')]);
      setCachedConversations(USER_ID, [makeConversation('c2')]);
      setCachedConversations(USER_ID, [makeConversation('c3')]);

      const keys = JSON.parse(localStorage.getItem('kaiylo_chat_keys'));
      const count = keys.filter(k => k === `kaiylo_chat_${USER_ID}`).length;
      expect(count).toBe(1);
    });
  });
});
