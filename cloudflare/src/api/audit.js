import { error, json } from 'itty-router';
import {
  ASSET_AUDIT_ACTION_VALUES,
  ASSET_AUDIT_ROLE_FILTER_VALUES,
  ASSET_AUDIT_USER_TYPES,
  defaultFrom,
} from '../../../scripts/audit/asset-audit-constants.js';
import { PERMISSIONS } from '../../../scripts/auth/permissions.js';
import { assertPermission } from '../util/authz.js';

const AUDIT_ACTIONS = ASSET_AUDIT_ACTION_VALUES;
const USER_TYPES = ASSET_AUDIT_USER_TYPES;
const ROLE_FILTERS = ASSET_AUDIT_ROLE_FILTER_VALUES;
const EXPORT_LIMIT = 10_000;
const TOP_ASSETS_LIMIT = 20;

/** Map filter role to stored user_role values (matches search analytics). */
const ROLE_MAPPINGS = {
  associate: ['associate', 'employee', 'contingent-worker'],
  agency: ['agency'],
  partner: ['partner'],
};

export function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function parseToBoundary(str) {
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

export function daysBetween(from, to) {
  return Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
}

export function bucketExpr(from, to) {
  const days = daysBetween(from, to);
  if (days <= 31) return { expr: 'DATE(occurred_at)', bucket: 'day' };
  if (days <= 180) {
    return {
      expr: "DATE(occurred_at, '-' || ((CAST(strftime('%w', occurred_at) AS INTEGER) + 6) % 7) || ' days')",
      bucket: 'week',
    };
  }
  return { expr: "strftime('%Y-%m', occurred_at)", bucket: 'month' };
}

export function enumerateBuckets(from, to, bucket) {
  const out = [];
  const d = new Date(from);
  d.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);

  if (bucket === 'day') {
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
  } else if (bucket === 'week') {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    while (d <= end) {
      out.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 7);
    }
  } else {
    d.setUTCDate(1);
    while (d <= end) {
      out.push(d.toISOString().slice(0, 7));
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
  }
  return out;
}

export function resolveAuditUserFields(user = {}) {
  return {
    userId: user.sub,
    userEmail: user.email,
    userCountry: user.country ?? null,
    userType: user.userType ?? null,
    userRole: user.roles?.[0] ?? null,
  };
}

export function buildWhere(p) {
  const conds = [];
  const vals = [];

  if (p.user) {
    conds.push('user_email = ?');
    vals.push(p.user);
  }

  if (p.country === 'unknown') conds.push('user_country IS NULL');
  else if (p.country) {
    conds.push('user_country = ?');
    vals.push(p.country);
  }

  if (p.userType === 'unknown') conds.push('user_type IS NULL');
  else if (p.userType) {
    conds.push('user_type = ?');
    vals.push(p.userType);
  }

  if (p.role === 'unknown') conds.push('user_role IS NULL');
  else if (p.role) {
    const roleValues = ROLE_MAPPINGS[p.role] || [p.role];
    if (roleValues.length === 1) {
      conds.push('user_role = ?');
      vals.push(roleValues[0]);
    } else {
      conds.push(`(${roleValues.map(() => 'user_role = ?').join(' OR ')})`);
      vals.push(...roleValues);
    }
  }

  if (p.assetId) {
    conds.push('asset_id = ?');
    vals.push(p.assetId);
  }
  if (p.action) {
    conds.push('action = ?');
    vals.push(p.action);
  }
  if (p.from) {
    conds.push('occurred_at >= ?');
    vals.push(p.from);
  }
  if (p.to) {
    conds.push('occurred_at <= ?');
    vals.push(p.to);
  }

  return { clause: conds.length ? `WHERE ${conds.join(' AND ')}` : '', values: vals };
}

export function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

export function parseFilterParams(url) {
  return {
    user: url.searchParams.get('user') || '',
    country: url.searchParams.get('country') || '',
    userType: url.searchParams.get('userType') || '',
    role: url.searchParams.get('role') || '',
    assetId: url.searchParams.get('assetId') || '',
    action: url.searchParams.get('action') || '',
    from: parseDate(url.searchParams.get('from')) || defaultFrom(),
    to: parseToBoundary(url.searchParams.get('to')) || new Date().toISOString(),
  };
}

export function validateFilterParams(p) {
  if (p.action && !AUDIT_ACTIONS.includes(p.action)) return error(400, 'Invalid action');
  if (p.userType && !USER_TYPES.includes(p.userType)) return error(400, 'Invalid userType');
  if (p.role && !ROLE_FILTERS.includes(p.role) && p.role !== 'unknown') return error(400, 'Invalid role');
  return null;
}

export async function auditPostEvent(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return error(400, 'Invalid JSON body');
  }

  const { action, assetId } = body;
  if (!action || !AUDIT_ACTIONS.includes(action)) {
    return error(400, `Invalid action. Must be one of: ${AUDIT_ACTIONS.join(', ')}`);
  }
  if (!assetId) return error(400, 'assetId is required');

  const { userId, userEmail, userCountry, userType, userRole } = resolveAuditUserFields(request.user);
  if (!userId || !userEmail) return error(401, 'User session is incomplete');

  try {
    await env.AUDIT_EVENTS.prepare(
      `INSERT INTO audit_events
       (user_id, user_email, user_country, user_type, user_role, action, asset_id, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        userId,
        userEmail,
        userCountry,
        userType,
        userRole,
        action,
        assetId,
        new Date().toISOString(),
      )
      .run();
  } catch (err) {
    console.error('[audit] INSERT failed:', err?.message);
    return error(500, 'Failed to record event');
  }

  return new Response(null, { status: 204 });
}

export async function auditGetSummary(request, env) {
  const denied = assertPermission(request, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;

  const p = parseFilterParams(new URL(request.url));
  const validationError = validateFilterParams(p);
  if (validationError) return validationError;

  const { clause, values } = buildWhere(p);
  const { expr, bucket } = bucketExpr(p.from, p.to);
  const db = env.AUDIT_EVENTS;

  const topAssetsInner = `SELECT asset_id FROM audit_events ${clause} GROUP BY asset_id ORDER BY COUNT(*) DESC LIMIT ${TOP_ASSETS_LIMIT}`;
  const topAssetsWhere = clause
    ? `${clause} AND asset_id IN (${topAssetsInner})`
    : `WHERE asset_id IN (${topAssetsInner})`;
  const topAssetsSql = `SELECT asset_id, action, COUNT(*) AS count FROM audit_events ${topAssetsWhere} GROUP BY asset_id, action`;

  let totalResult,
    uniqueUsersResult,
    uniqueAssetsResult,
    timelineResult,
    byActionResult,
    byUserTypeResult,
    byRoleResult,
    byCountryResult,
    byAssetResult,
    topAssetsResult;
  try {
    [
      totalResult,
      uniqueUsersResult,
      uniqueAssetsResult,
      timelineResult,
      byActionResult,
      byUserTypeResult,
      byRoleResult,
      byCountryResult,
      byAssetResult,
      topAssetsResult,
    ] = await Promise.all([
      db
        .prepare(`SELECT COUNT(*) AS total FROM audit_events ${clause}`)
        .bind(...values)
        .first(),
      db
        .prepare(`SELECT COUNT(DISTINCT user_email) AS unique_users FROM audit_events ${clause}`)
        .bind(...values)
        .first(),
      db
        .prepare(`SELECT COUNT(DISTINCT asset_id) AS unique_assets FROM audit_events ${clause}`)
        .bind(...values)
        .first(),
      db
        .prepare(
          `SELECT ${expr} AS bucket, COALESCE(action, 'unknown') AS action, COUNT(*) AS count FROM audit_events ${clause} GROUP BY bucket, action ORDER BY bucket`,
        )
        .bind(...values)
        .all(),
      db
        .prepare(`SELECT action, COUNT(*) AS count FROM audit_events ${clause} GROUP BY action`)
        .bind(...values)
        .all(),
      db
        .prepare(
          `SELECT COALESCE(user_type, 'unknown') AS user_type, COUNT(*) AS count FROM audit_events ${clause} GROUP BY user_type`,
        )
        .bind(...values)
        .all(),
      db
        .prepare(
          `SELECT COALESCE(user_role, 'unknown') AS user_role, COUNT(*) AS count FROM audit_events ${clause} GROUP BY user_role ORDER BY count DESC`,
        )
        .bind(...values)
        .all(),
      db
        .prepare(
          `SELECT COALESCE(user_country, 'unknown') AS user_country, COUNT(*) AS count FROM audit_events ${clause} GROUP BY user_country ORDER BY count DESC LIMIT 10`,
        )
        .bind(...values)
        .all(),
      db
        .prepare(
          `SELECT REPLACE(asset_id, 'urn:aaid:aem:', '') AS asset_id, COUNT(*) AS count FROM audit_events ${clause} GROUP BY asset_id ORDER BY count DESC LIMIT 10`,
        )
        .bind(...values)
        .all(),
      db
        .prepare(topAssetsSql)
        .bind(...values, ...values)
        .all(),
    ]);
  } catch (err) {
    console.error('[audit] summary query failed:', err?.message);
    return error(500, 'Failed to query audit data');
  }

  const seriesSet = new Set();
  const byBucketMap = {};
  for (const row of timelineResult.results) {
    seriesSet.add(row.action);
    if (!byBucketMap[row.bucket]) byBucketMap[row.bucket] = {};
    byBucketMap[row.bucket][row.action] = row.count;
  }
  const series = [...seriesSet].sort();
  const timelineData = enumerateBuckets(p.from, p.to, bucket).map((label) => {
    const row = { bucket: label, ...(byBucketMap[label] ?? {}) };
    for (const s of series) row[s] ??= 0;
    return row;
  });

  const PREFIX = 'urn:aaid:aem:';
  const assetMap = {};
  for (const row of topAssetsResult.results) {
    if (!assetMap[row.asset_id]) assetMap[row.asset_id] = { actions: {}, total: 0 };
    assetMap[row.asset_id].actions[row.action] = row.count;
    assetMap[row.asset_id].total += row.count;
  }
  const topAssets = Object.entries(assetMap)
    .map(([assetId, { actions, total }]) => ({
      assetId,
      displayId: assetId.startsWith(PREFIX) ? assetId.slice(PREFIX.length) : assetId,
      encodedId: assetId,
      actions,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  return json({
    total: totalResult?.total ?? 0,
    uniqueUsers: uniqueUsersResult?.unique_users ?? 0,
    uniqueAssets: uniqueAssetsResult?.unique_assets ?? 0,
    timeline: { bucket, series, data: timelineData },
    byAction: Object.fromEntries(byActionResult.results.map((r) => [r.action, r.count])),
    byUserType: Object.fromEntries(byUserTypeResult.results.map((r) => [r.user_type, r.count])),
    byRole: Object.fromEntries(byRoleResult.results.map((r) => [r.user_role, r.count])),
    byCountry: Object.fromEntries(byCountryResult.results.map((r) => [r.user_country, r.count])),
    byAsset: Object.fromEntries(byAssetResult.results.map((r) => [r.asset_id, r.count])),
    topAssets,
  });
}

export async function auditGetExportCsv(request, env) {
  const denied = assertPermission(request, PERMISSIONS.VIEW_AUDIT);
  if (denied) return denied;

  const p = parseFilterParams(new URL(request.url));
  const validationError = validateFilterParams(p);
  if (validationError) return validationError;

  const { clause, values } = buildWhere(p);

  let result;
  try {
    result = await env.AUDIT_EVENTS.prepare(
      `SELECT occurred_at, user_id, user_email, user_country, user_type, user_role, action, asset_id
       FROM audit_events ${clause} ORDER BY occurred_at DESC LIMIT ${EXPORT_LIMIT + 1}`,
    )
      .bind(...values)
      .all();
  } catch (err) {
    console.error('[audit] export query failed:', err?.message);
    return error(500, 'Failed to export audit data');
  }

  const truncated = result.results.length > EXPORT_LIMIT;
  const rows = truncated ? result.results.slice(0, EXPORT_LIMIT) : result.results;

  const header = 'Occurred At,User ID,Email,Country,User Type,Role,Action,Asset ID\r\n';
  const csvBody = rows
    .map((r) =>
      [r.occurred_at, r.user_id, r.user_email, r.user_country, r.user_type, r.user_role, r.action, r.asset_id]
        .map(csvEscape)
        .join(','),
    )
    .join('\r\n');

  const date = new Date().toISOString().slice(0, 10);
  return new Response(header + csvBody, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="spark-asset-activity-export-${date}.csv"`,
      'X-Total-Rows': String(rows.length),
      'X-Truncated': String(truncated),
    },
  });
}
