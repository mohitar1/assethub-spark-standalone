import { describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '../../../../scripts/auth/permissions.js';
import { auditPostEvent } from '../audit.js';

function makeEnv(onRun) {
  return {
    AUDIT_EVENTS: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              run: async () => {
                onRun({ sql, args });
              },
            };
          },
        };
      },
    },
  };
}

function postRequest(user, body) {
  return {
    user,
    json: async () => body,
  };
}

describe('auditPostEvent', () => {
  it('persists session userType, role, and country on INSERT', async () => {
    const recorder = [];
    const env = makeEnv((call) => recorder.push(call));

    const res = await auditPostEvent(
      postRequest(
        {
          sub: 'sub-abc',
          email: 'mohitar@adobe.com',
          country: 'IN',
          userType: 'internal',
          roles: ['employee', 'admin'],
        },
        { action: 'download', assetId: 'urn:aaid:aem:test' },
      ),
      env,
    );

    expect(res.status).toBe(204);
    expect(recorder).toHaveLength(1);
    expect(recorder[0].sql).toContain('user_type, user_role');
    expect(recorder[0].args).toEqual([
      'sub-abc',
      'mohitar@adobe.com',
      'IN',
      'internal',
      'employee',
      'download',
      'urn:aaid:aem:test',
      expect.any(String),
    ]);
  });

  it('returns 401 when session is incomplete', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await auditPostEvent(
      postRequest({}, { action: 'view', assetId: 'urn:aaid:aem:test' }),
      makeEnv(() => {}),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid action', async () => {
    const res = await auditPostEvent(
      postRequest({ sub: 'x', email: 'a@b.com' }, { action: 'bogus', assetId: 'id' }),
      makeEnv(() => {}),
    );
    expect(res.status).toBe(400);
  });
});
