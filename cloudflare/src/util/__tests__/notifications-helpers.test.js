import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchHelixSheetMock } = vi.hoisted(() => ({
  fetchHelixSheetMock: vi.fn(),
}));

vi.mock('../helixutil.js', () => ({
  fetchHelixSheet: fetchHelixSheetMock,
}));

import { getSystemAdminEmails } from '../notifications-helpers.js';

describe('getSystemAdminEmails', () => {
  const env = {};

  beforeEach(() => {
    fetchHelixSheetMock.mockReset();
  });

  it('returns emails with admin-system permission', async () => {
    fetchHelixSheetMock.mockResolvedValue({
      'alice@example.com': { permissions: ['admin-system'] },
      'bob@example.com': { permissions: ['admin-rights'] },
      'carol@example.com': { permissions: ['admin-system', 'admin-rights'] },
    });

    const result = await getSystemAdminEmails(env);
    expect(result).toEqual(['alice@example.com', 'carol@example.com']);
  });

  it('excludes domain-level entries (no @ sign)', async () => {
    fetchHelixSheetMock.mockResolvedValue({
      'adobe.com': { permissions: ['admin-system'] },
      'admin@example.com': { permissions: ['admin-system'] },
    });

    const result = await getSystemAdminEmails(env);
    expect(result).toEqual(['admin@example.com']);
  });

  it('lowercases returned emails', async () => {
    fetchHelixSheetMock.mockResolvedValue({
      'Admin@Example.COM': { permissions: ['admin-system'] },
    });

    const result = await getSystemAdminEmails(env);
    expect(result).toEqual(['admin@example.com']);
  });

  it('returns empty array when sheet returns null', async () => {
    fetchHelixSheetMock.mockResolvedValue(null);

    const result = await getSystemAdminEmails(env);
    expect(result).toEqual([]);
  });

  it('returns empty array when fetchHelixSheet throws', async () => {
    fetchHelixSheetMock.mockRejectedValue(new Error('network error'));

    const result = await getSystemAdminEmails(env);
    expect(result).toEqual([]);
  });

  it('handles entries with missing permissions array', async () => {
    fetchHelixSheetMock.mockResolvedValue({
      'user@example.com': {},
      'admin@example.com': { permissions: ['admin-system'] },
    });

    const result = await getSystemAdminEmails(env);
    expect(result).toEqual(['admin@example.com']);
  });
});
