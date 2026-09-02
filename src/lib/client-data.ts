import {
  divisions,
  districts,
  upazilas,
  unions,
  API_VERSION,
  type Division,
  type District,
  type Upazila,
  type Union,
} from '@/lib/bd-data';

// Re-export the geo types so callers can import everything from one place.
export type { Division, District, Upazila, Union };

/**
 * Base URL of the public Unified Bangladesh Geo API.
 * Docs: https://unifiedapi.pages.dev/
 *
 * Defaults to the deployed Cloudflare Pages endpoint. Override at build
 * time with NEXT_PUBLIC_UNIFIED_API_BASE if you self-host the API.
 */
export const UNIFIED_API_BASE =
  process.env.NEXT_PUBLIC_UNIFIED_API_BASE ||
  'https://unifiedapi.pages.dev/api/geo/v1.0';

/**
 * Same-shape success envelope returned by both the local fallback API
 * and the remote Unified API.
 */
export interface UnifiedApiResponse<T = unknown> {
  success: boolean;
  data: T;
  count: number;
  message: string;
  api_version: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Local fallback resolver (kept identical to the API contract)       */
/* ------------------------------------------------------------------ */

export function resolveClientData(
  path: string,
  searchType?: string,
  queryParams?: Record<string, string>,
): UnifiedApiResponse {
  let data: unknown = [];
  let message = '';
  let pagination: UnifiedApiResponse['pagination'];

  const clean = path
    .replace(/\?.*$/, '')
    .replace(/^\/api\/geo\/v1\.0/, '')
    .replace(/^\/+/, '');

  if (clean === 'divisions') {
    data = divisions;
    message = 'Divisions retrieved successfully';
  } else if (clean.startsWith('divisions/')) {
    const id = clean.split('/')[1];
    const found = divisions.find((d) => d.id === id);
    data = found || null;
    message = found
      ? `Division with ID ${id}`
      : `Division not found with ID: ${id}`;
  } else if (clean === 'districts') {
    let filtered = districts.map(({ division_id, ...rest }) => rest);
    if (queryParams?.division_id) {
      filtered = districts
        .filter((d) => d.division_id === queryParams.division_id)
        .map(({ division_id, ...rest }) => rest);
      message = `Districts for division ID ${queryParams.division_id}`;
    } else {
      message = 'Districts retrieved successfully';
    }
    const page = parseInt(queryParams?.page || '1', 10);
    const limit = parseInt(queryParams?.limit || '100', 10);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    if (page > 1 || limit < total) {
      const start = (page - 1) * limit;
      data = filtered.slice(start, start + limit);
      pagination = { page, limit, total, total_pages: totalPages };
    } else {
      data = filtered;
    }
  } else if (clean.startsWith('districts/')) {
    const id = clean.split('/')[1];
    if (queryParams?.lookup === 'true') {
      const found = districts.find((d) => d.id === id);
      data = found || null;
      message = found ? `District with ID ${id}` : `District not found with ID: ${id}`;
    } else {
      data = districts
        .filter((d) => d.division_id === id)
        .map(({ division_id, ...rest }) => rest);
      message = `Districts for division ID ${id}`;
    }
  } else if (clean === 'upazilas') {
    let filtered = upazilas.map(({ district_id, ...rest }) => rest);
    if (queryParams?.district_id) {
      filtered = upazilas
        .filter((u) => u.district_id === queryParams.district_id)
        .map(({ district_id, ...rest }) => rest);
      message = `Upazilas for district ID ${queryParams.district_id}`;
    } else {
      message = 'Upazilas retrieved successfully';
    }
    const page = parseInt(queryParams?.page || '1', 10);
    const limit = parseInt(queryParams?.limit || '500', 10);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    if (page > 1 || limit < total) {
      const start = (page - 1) * limit;
      data = filtered.slice(start, start + limit);
      pagination = { page, limit, total, total_pages: totalPages };
    } else {
      data = filtered;
    }
  } else if (clean.startsWith('upazilas/')) {
    const id = clean.split('/')[1];
    if (queryParams?.lookup === 'true') {
      const found = upazilas.find((u) => u.id === id);
      data = found || null;
      message = found ? `Upazila with ID ${id}` : `Upazila not found with ID: ${id}`;
    } else {
      data = upazilas
        .filter((u) => u.district_id === id)
        .map(({ district_id, ...rest }) => rest);
      message = `Upazilas for district ID ${id}`;
    }
  } else if (clean === 'unions') {
    let filtered = unions.map(({ upazila_id, ...rest }) => rest);
    if (queryParams?.upazila_id) {
      filtered = unions
        .filter((u) => u.upazila_id === queryParams.upazila_id)
        .map(({ upazila_id, ...rest }) => rest);
      message = `Unions for upazila ID ${queryParams.upazila_id}`;
    } else {
      message = 'Unions retrieved successfully';
    }
    const page = parseInt(queryParams?.page || '1', 10);
    const limit = parseInt(queryParams?.limit || '500', 10);
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    if (page > 1 || limit < total) {
      const start = (page - 1) * limit;
      data = filtered.slice(start, start + limit);
      pagination = { page, limit, total, total_pages: totalPages };
    } else {
      data = filtered;
    }
  } else if (clean.startsWith('unions/')) {
    const id = clean.split('/')[1];
    if (queryParams?.lookup === 'true') {
      const found = unions.find((u) => u.id === id);
      data = found || null;
      message = found ? `Union with ID ${id}` : `Union not found with ID: ${id}`;
    } else {
      data = unions
        .filter((u) => u.upazila_id === id)
        .map(({ upazila_id, ...rest }) => rest);
      message = `Unions for upazila ID ${id}`;
    }
  } else if (clean.startsWith('search/')) {
    const q = decodeURIComponent(clean.split('/')[1]);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const type = searchType && searchType !== 'all' ? searchType : '';
    const limit = parseInt(queryParams?.limit || '50', 10);
    const page = parseInt(queryParams?.page || '1', 10);
    const results: {
      id: string;
      name: string;
      bn_name: string;
      type: string;
      [k: string]: unknown;
    }[] = [];
    if (!type || type === 'division') {
      for (const d of divisions) {
        if (regex.test(d.name) || regex.test(d.bn_name))
          results.push({ type: 'division', id: d.id, name: d.name, bn_name: d.bn_name });
      }
    }
    if (!type || type === 'district') {
      for (const d of districts) {
        if (regex.test(d.name) || regex.test(d.bn_name))
          results.push({ type: 'district', id: d.id, name: d.name, bn_name: d.bn_name, division_id: d.division_id });
      }
    }
    if (!type || type === 'upazila') {
      for (const u of upazilas) {
        if (regex.test(u.name) || regex.test(u.bn_name))
          results.push({ type: 'upazila', id: u.id, name: u.name, bn_name: u.bn_name, district_id: u.district_id });
      }
    }
    if (!type || type === 'union') {
      for (const u of unions) {
        if (regex.test(u.name) || regex.test(u.bn_name))
          results.push({ type: 'union', id: u.id, name: u.name, bn_name: u.bn_name, upazila_id: u.upazila_id });
      }
    }
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    data = results.slice(start, start + limit);
    pagination = { page, limit, total, total_pages: totalPages };
    message = `Search results for "${q}"`;
  }

  const result: UnifiedApiResponse = {
    success: true,
    data,
    count: Array.isArray(data) ? data.length : 0,
    message,
    api_version: API_VERSION,
    timestamp: new Date().toISOString(),
  };
  if (pagination) result.pagination = pagination;
  return result;
}

/**
 * Fetches a geo path from the public Unified API first, then falls back
 * to the local resolver (which uses bundled JSON) if the network call
 * fails. This guarantees the location selectors always render data even
 * when the remote API is unreachable.
 */
export async function fetchGeo<T = unknown>(
  path: string,
  queryParams?: Record<string, string>,
): Promise<T> {
  const clean = path.replace(/^\/+/, '').replace(/^\?/, '');
  const qs = queryParams
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';

  // 1. Try the public Unified API.
  try {
    const res = await fetch(`${UNIFIED_API_BASE}/${clean}${qs}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (err) {
    console.warn('Unified API fetch failed, using local fallback:', err);
  }

  // 2. Fall back to local bundled data.
  return resolveClientData(clean, undefined, queryParams) as unknown as T;
}

/**
 * Convenience helpers for the cascading location selector.
 * Each returns the `data` array of the API response (typed).
 *
 * IMPORTANT: These helpers always use the **local bundled JSON**
 * (`resolveClientData`) rather than the remote Unified API.
 *
 * Why? The public API at unifiedapi.pages.dev currently has two bugs:
 *   1. `/districts?division_id=X` ignores the query parameter and
 *      returns all 64 districts.
 *   2. The records in that response omit the `division_id` field, so
 *      we cannot post-filter them either.
 *
 * The same applies to upazilas and unions. The bundled JSON in
 * `src/data/*.json` is the same source data and contains all the
 * foreign-key fields we need, so it is both faster and more correct
 * for the cascading selector use case.
 *
 * The remote API is still useful for ad-hoc reads (the search endpoint,
 * the public docs site, etc.) — `fetchGeo` above remains available for
 * those callers.
 */

export async function fetchDivisions(): Promise<Division[]> {
  const json = resolveClientData('divisions');
  return Array.isArray(json?.data) ? (json.data as Division[]) : [];
}

export async function fetchDistrictsByDivision(
  divisionId: string,
): Promise<District[]> {
  const json = resolveClientData('districts', undefined, {
    division_id: divisionId,
    limit: '100',
  });
  if (!Array.isArray(json?.data)) return [];
  return json.data as District[];
}

export async function fetchUpazilasByDistrict(
  districtId: string,
): Promise<Upazila[]> {
  const json = resolveClientData('upazilas', undefined, {
    district_id: districtId,
    limit: '500',
  });
  if (!Array.isArray(json?.data)) return [];
  return json.data as Upazila[];
}

export async function fetchUnionsByUpazila(
  upazilaId: string,
): Promise<Union[]> {
  const json = resolveClientData('unions', undefined, {
    upazila_id: upazilaId,
    limit: '500',
  });
  if (!Array.isArray(json?.data)) return [];
  return json.data as Union[];
}
