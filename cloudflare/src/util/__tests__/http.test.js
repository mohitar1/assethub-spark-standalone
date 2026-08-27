import { beforeEach, describe, expect, it } from 'vitest';
import { deleteCookie, isValidUrl, setCookie } from '../http.js';

describe('http utilities', () => {
  describe('setCookie', () => {
    let response;

    beforeEach(() => {
      response = new Response();
    });

    it('should set a basic cookie with security defaults', () => {
      setCookie(response, 'session', 'abc123');
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('session=abc123');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('should set cookie with custom path', () => {
      setCookie(response, 'pref', 'dark', { Path: '/admin' });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('Path=/admin');
    });

    it('should set cookie with custom domain', () => {
      setCookie(response, 'pref', 'dark', { Domain: '.example.com' });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('Domain=.example.com');
    });

    it('should set cookie with expiration', () => {
      const expires = 'Thu, 01 Jan 2025 00:00:00 GMT';
      setCookie(response, 'pref', 'dark', { Expires: expires });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain(`Expires=${expires}`);
    });

    it('should set cookie with max-age', () => {
      setCookie(response, 'pref', 'dark', { MaxAge: '3600' });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('Max-Age=3600');
    });

    it('should allow disabling HttpOnly', () => {
      setCookie(response, 'pref', 'dark', { HttpOnly: false });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).not.toContain('HttpOnly');
    });

    it('should allow disabling Secure', () => {
      setCookie(response, 'pref', 'dark', { Secure: false });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).not.toContain('Secure');
    });

    it('should allow setting SameSite to Lax', () => {
      setCookie(response, 'pref', 'dark', { SameSite: 'Lax' });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('SameSite=Lax');
    });

    it('should allow omitting SameSite', () => {
      setCookie(response, 'pref', 'dark', { SameSite: false });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).not.toContain('SameSite');
    });

    it('should set Partitioned attribute when specified', () => {
      setCookie(response, 'pref', 'dark', { Partitioned: true });
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('Partitioned');
    });
  });

  describe('deleteCookie', () => {
    it('should set cookie with past expiration to delete it', () => {
      const response = new Response();
      deleteCookie(response, 'session');
      const cookie = response.headers.get('Set-Cookie');

      expect(cookie).toContain('session=');
      expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    });
  });

  describe('isValidUrl', () => {
    it('should return URL object for valid http URL', () => {
      const result = isValidUrl('http://example.com');
      expect(result).toBeInstanceOf(URL);
      expect(result.hostname).toBe('example.com');
    });

    it('should return URL object for valid https URL', () => {
      const result = isValidUrl('https://example.com/path?query=1');
      expect(result).toBeInstanceOf(URL);
      expect(result.pathname).toBe('/path');
    });

    it('should return null for invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(isValidUrl('')).toBeNull();
    });

    it('should return null for malformed URL', () => {
      expect(isValidUrl('http://')).toBeNull();
    });
  });
});
