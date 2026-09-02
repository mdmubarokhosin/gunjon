/**
 * Cascading Bangladesh location selector hook.
 *
 * Loads divisions → districts → upazilas → unions from the Unified Geo
 * API (https://unifiedapi.pages.dev), with the bundled JSON as a
 * fallback if the API is unreachable.
 *
 * Each level is loaded lazily on demand:
 *  - Divisions load on mount.
 *  - Districts load when a division is selected.
 *  - Upazilas load when a district is selected.
 *  - Unions load when an upazila is selected.
 *
 * Selecting a new parent resets all of its children, exactly as the
 * user expects (selecting a new division clears district/upazila/union).
 *
 * Results are cached in a module-level Map so navigating away and back
 * doesn't refetch them.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchDivisions,
  fetchDistrictsByDivision,
  fetchUpazilasByDistrict,
  fetchUnionsByUpazila,
  type Division,
  type District,
  type Upazila,
  type Union,
} from './client-data';

// ─────────────────────────────────────────────────────────────────────
//  Per-session cache so we don't refetch the same data when the user
//  navigates between views. Keyed by `${level}:${parentId}`.
// ─────────────────────────────────────────────────────────────────────
const cache = new Map<string, any[]>();

function getCached<T>(key: string): T[] | undefined {
  return cache.get(key) as T[] | undefined;
}

function setCached<T>(key: string, value: T[]): void {
  cache.set(key, value);
}

export interface LocationSelection {
  divisionId: string;
  divisionName: string;
  districtId: string;
  districtName: string;
  upazilaId: string;
  upazilaName: string;
  unionId: string;
  unionName: string;
}

export const EMPTY_SELECTION: LocationSelection = {
  divisionId: '',
  divisionName: '',
  districtId: '',
  districtName: '',
  upazilaId: '',
  upazilaName: '',
  unionId: '',
  unionName: '',
};

export function useLocationCascade() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [upazilas, setUpazilas] = useState<Upazila[]>([]);
  const [unions, setUnions] = useState<Union[]>([]);

  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingUpazilas, setLoadingUpazilas] = useState(false);
  const [loadingUnions, setLoadingUnions] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [selection, setSelection] = useState<LocationSelection>(EMPTY_SELECTION);

  // Load divisions on mount.
  useEffect(() => {
    const key = 'divisions';
    const cached = getCached<Division>(key);
    if (cached) {
      setDivisions(cached);
      return;
    }
    setLoadingDivisions(true);
    setError(null);
    fetchDivisions()
      .then((data) => {
        setDivisions(data);
        setCached(key, data);
      })
      .catch((err) => {
        console.error('Failed to load divisions:', err);
        setError('বিভাগ তালিকা লোড করা যায়নি');
        setDivisions([]);
      })
      .finally(() => setLoadingDivisions(false));
  }, []);

  /** Select a division by id. Resets district/upazila/union. */
  const selectDivision = useCallback(
    async (divisionId: string) => {
      const div = divisions.find((d) => d.id === divisionId);
      setSelection({
        ...EMPTY_SELECTION,
        divisionId,
        divisionName: div?.bn_name || '',
      });
      setDistricts([]);
      setUpazilas([]);
      setUnions([]);
      if (!divisionId) return;

      const key = `districts:${divisionId}`;
      const cached = getCached<District>(key);
      if (cached) {
        setDistricts(cached);
        return;
      }
      setLoadingDistricts(true);
      try {
        const data = await fetchDistrictsByDivision(divisionId);
        setDistricts(data);
        setCached(key, data);
      } catch (err) {
        console.error('Failed to load districts:', err);
        setError('জেলা তালিকা লোড করা যায়নি');
      } finally {
        setLoadingDistricts(false);
      }
    },
    [divisions],
  );

  /** Select a district by id. Resets upazila/union. */
  const selectDistrict = useCallback(
    async (districtId: string) => {
      const dist = districts.find((d) => d.id === districtId);
      setSelection((prev) => ({
        ...prev,
        districtId,
        districtName: dist?.bn_name || '',
        upazilaId: '',
        upazilaName: '',
        unionId: '',
        unionName: '',
      }));
      setUpazilas([]);
      setUnions([]);
      if (!districtId) return;

      const key = `upazilas:${districtId}`;
      const cached = getCached<Upazila>(key);
      if (cached) {
        setUpazilas(cached);
        return;
      }
      setLoadingUpazilas(true);
      try {
        const data = await fetchUpazilasByDistrict(districtId);
        setUpazilas(data);
        setCached(key, data);
      } catch (err) {
        console.error('Failed to load upazilas:', err);
        setError('উপজেলা তালিকা লোড করা যায়নি');
      } finally {
        setLoadingUpazilas(false);
      }
    },
    [districts],
  );

  /** Select an upazila by id. Resets union. */
  const selectUpazila = useCallback(
    async (upazilaId: string) => {
      const upz = upazilas.find((u) => u.id === upazilaId);
      setSelection((prev) => ({
        ...prev,
        upazilaId,
        upazilaName: upz?.bn_name || '',
        unionId: '',
        unionName: '',
      }));
      setUnions([]);
      if (!upazilaId) return;

      const key = `unions:${upazilaId}`;
      const cached = getCached<Union>(key);
      if (cached) {
        setUnions(cached);
        return;
      }
      setLoadingUnions(true);
      try {
        const data = await fetchUnionsByUpazila(upazilaId);
        setUnions(data);
        setCached(key, data);
      } catch (err) {
        console.error('Failed to load unions:', err);
        setError('ইউনিয়ন তালিকা লোড করা যায়নি');
      } finally {
        setLoadingUnions(false);
      }
    },
    [upazilas],
  );

  /** Select a union by id. */
  const selectUnion = useCallback(
    (unionId: string) => {
      const un = unions.find((u) => u.id === unionId);
      setSelection((prev) => ({
        ...prev,
        unionId,
        unionName: un?.bn_name || '',
      }));
    },
    [unions],
  );

  /** Reset everything back to empty. */
  const reset = useCallback(() => {
    setSelection(EMPTY_SELECTION);
    setDistricts([]);
    setUpazilas([]);
    setUnions([]);
    setError(null);
  }, []);

  return {
    // data
    divisions,
    districts,
    upazilas,
    unions,
    // loading flags
    loadingDivisions,
    loadingDistricts,
    loadingUpazilas,
    loadingUnions,
    // error message
    error,
    clearError: () => setError(null),
    // selection
    selection,
    // actions
    selectDivision,
    selectDistrict,
    selectUpazila,
    selectUnion,
    reset,
  };
}
