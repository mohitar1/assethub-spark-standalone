import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { createNotification, deleteNotification, getNotification, updateNotification } from '../notifications.js';

/**
 * Helper to create a request with authenticated user
 */
function createAuthenticatedRequest(url, options = {}) {
  const request = new Request(url, options);
  request.user = { email: 'test@example.com' };
  return request;
}

describe('Notifications API', () => {
  const testUserEmail = 'test@example.com';

  beforeEach(async () => {
    // Clear KV store before each test
    const { keys } = await env.MESSAGES.list();
    await Promise.all(keys.map((key) => env.MESSAGES.delete(key.name)));
  });

  describe('createNotification', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new Request('http://test/api/messages', {
        method: 'POST',
        body: JSON.stringify({ id: '1', subject: 'Test', message: 'Hello' }),
      });
      // No user attached to request
      const response = await createNotification(request, env);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User not authenticated');
    });

    it('should return 400 when required fields are missing', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages', {
        method: 'POST',
        body: JSON.stringify({ id: '1' }), // missing subject and message
      });
      const response = await createNotification(request, env);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
    });

    it('should create notification with required fields', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          id: 'notif-1',
          subject: 'Test Subject',
          message: 'Test message body',
        }),
      });
      const response = await createNotification(request, env);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message.id).toBe('notif-1');
      expect(data.message.subject).toBe('Test Subject');
      expect(data.message.message).toBe('Test message body');
      expect(data.message.owner).toBe(testUserEmail);
      expect(data.message.date).toBeDefined();
      // Check defaults
      expect(data.message.type).toBe('Notification');
      expect(data.message.priority).toBe('normal');
      expect(data.message.status).toBe('unread');
    });

    it('should create notification with custom fields', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          id: 'notif-2',
          subject: 'Urgent',
          message: 'Important message',
          type: 'Alert',
          priority: 'high',
          from: 'admin@example.com',
          expiresInXDays: 7,
        }),
      });
      const response = await createNotification(request, env);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message.type).toBe('Alert');
      expect(data.message.priority).toBe('high');
      expect(data.message.from).toBe('admin@example.com');
      expect(data.message.expiresInXDays).toBe(7);
    });

    it('should store notification in KV with correct key', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          id: 'notif-3',
          subject: 'Test',
          message: 'Body',
        }),
      });
      await createNotification(request, env);

      // Verify stored with correct key format
      const stored = await env.MESSAGES.get(`${testUserEmail}:notif-3`);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored);
      expect(parsed.id).toBe('notif-3');
    });
  });

  describe('getNotification', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new Request('http://test/api/messages/notif-1');
      const response = await getNotification(request, env, 'notif-1');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages/nonexistent');
      const response = await getNotification(request, env, 'nonexistent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Notification not found');
    });

    it('should return existing notification', async () => {
      // First create a notification
      const notification = {
        id: 'notif-get',
        subject: 'Get Test',
        message: 'Get test body',
        owner: testUserEmail,
        date: new Date().toISOString(),
        type: 'Notification',
        priority: 'normal',
        status: 'unread',
      };
      await env.MESSAGES.put(`${testUserEmail}:notif-get`, JSON.stringify(notification));

      const request = createAuthenticatedRequest('http://test/api/messages/notif-get');
      const response = await getNotification(request, env, 'notif-get');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message.id).toBe('notif-get');
      expect(data.message.subject).toBe('Get Test');
    });
  });

  describe('updateNotification', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new Request('http://test/api/messages/notif-1', {
        method: 'POST',
        body: JSON.stringify({ status: 'read' }),
      });
      const response = await updateNotification(request, env, 'notif-1');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages/nonexistent', {
        method: 'POST',
        body: JSON.stringify({ status: 'read' }),
      });
      const response = await updateNotification(request, env, 'nonexistent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should update notification status', async () => {
      // First create a notification
      const notification = {
        id: 'notif-update',
        subject: 'Update Test',
        message: 'Update test body',
        owner: testUserEmail,
        date: '2024-01-01T00:00:00Z',
        type: 'Notification',
        priority: 'normal',
        status: 'unread',
      };
      await env.MESSAGES.put(`${testUserEmail}:notif-update`, JSON.stringify(notification));

      const request = createAuthenticatedRequest('http://test/api/messages/notif-update', {
        method: 'POST',
        body: JSON.stringify({ status: 'read' }),
      });
      const response = await updateNotification(request, env, 'notif-update');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.message.status).toBe('read');
      // Original fields preserved
      expect(data.message.subject).toBe('Update Test');
    });

    it('should not allow changing immutable fields', async () => {
      const originalDate = '2024-01-01T00:00:00Z';
      const notification = {
        id: 'notif-immutable',
        subject: 'Immutable Test',
        message: 'Body',
        owner: testUserEmail,
        date: originalDate,
        type: 'Notification',
        priority: 'normal',
        status: 'unread',
      };
      await env.MESSAGES.put(`${testUserEmail}:notif-immutable`, JSON.stringify(notification));

      const request = createAuthenticatedRequest('http://test/api/messages/notif-immutable', {
        method: 'POST',
        body: JSON.stringify({
          id: 'hacked-id',
          owner: 'hacker@example.com',
          date: '2099-01-01T00:00:00Z',
          status: 'read',
        }),
      });
      const response = await updateNotification(request, env, 'notif-immutable');
      const data = await response.json();

      expect(data.success).toBe(true);
      // Immutable fields should not change
      expect(data.message.id).toBe('notif-immutable');
      expect(data.message.owner).toBe(testUserEmail);
      expect(data.message.date).toBe(originalDate);
      // Mutable field should change
      expect(data.message.status).toBe('read');
    });
  });

  describe('deleteNotification', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new Request('http://test/api/messages/notif-1', {
        method: 'DELETE',
      });
      const response = await deleteNotification(request, env, 'notif-1');
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const request = createAuthenticatedRequest('http://test/api/messages/nonexistent', {
        method: 'DELETE',
      });
      const response = await deleteNotification(request, env, 'nonexistent');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should delete existing notification', async () => {
      // First create a notification
      const notification = {
        id: 'notif-delete',
        subject: 'Delete Test',
        message: 'Delete test body',
        owner: testUserEmail,
        date: new Date().toISOString(),
      };
      await env.MESSAGES.put(`${testUserEmail}:notif-delete`, JSON.stringify(notification));

      const request = createAuthenticatedRequest('http://test/api/messages/notif-delete', {
        method: 'DELETE',
      });
      const response = await deleteNotification(request, env, 'notif-delete');
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.notificationId).toBe('notif-delete');

      // Verify it was deleted
      const stored = await env.MESSAGES.get(`${testUserEmail}:notif-delete`);
      expect(stored).toBeNull();
    });
  });
});
