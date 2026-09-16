import { OpenLocationCode } from 'open-location-code';

const olc = new OpenLocationCode();

/**
 * Google's Plus Code (Open Location Code) for a coordinate — a short,
 * globally-unique code derived purely from lat/lng, computed entirely
 * client-side (no API key, no network call, no reverse-geocoding cost).
 * Returns null if the coordinates are out of range.
 */
export function encodePlusCode(latitude: number, longitude: number): string | null {
  try {
    return olc.encode(latitude, longitude);
  } catch {
    return null;
  }
}
