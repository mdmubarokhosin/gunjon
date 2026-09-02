// ============================================================
//  Version Config — এখানে শুধু VERSION পরিবর্তন করলেই সব জায়গায় আপডেট হবে
// ============================================================
export const API_VERSION = "v1.0";
export const API_PREFIX = `/api/geo/${API_VERSION}`;

// ============================================================
//  Data Layer — Static JSON import (MongoDB লাগবে না)
// ============================================================
import divisionsData from "@/data/divisions.json";
import districtsData from "@/data/districts.json";
import upazilasData from "@/data/upazilas.json";
import unionsData from "@/data/unions.json";

export interface Division {
  id: string;
  name: string;
  bn_name: string;
  url: string;
}

export interface District {
  id: string;
  division_id: string;
  name: string;
  bn_name: string;
  lat: string;
  lon: string;
  url: string;
}

export interface Upazila {
  id: string;
  district_id: string;
  name: string;
  bn_name: string;
  url: string;
}

export interface Union {
  id: string;
  upazila_id: string;
  name: string;
  bn_name: string;
  url: string;
}

export const divisions: Division[] = divisionsData;
export const districts: District[] = districtsData;
export const upazilas: Upazila[] = upazilasData;
export const unions: Union[] = unionsData;

// ============================================================
//  Response Helpers
// ============================================================
export function successResponse(
  data: unknown,
  message: string,
  extra?: Record<string, unknown>
) {
  return Response.json({
    success: true,
    data,
    count: Array.isArray(data) ? data.length : 0,
    message,
    api_version: API_VERSION,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

export function errorResponse(message: string, status: number) {
  return Response.json(
    {
      success: false,
      message,
      api_version: API_VERSION,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
