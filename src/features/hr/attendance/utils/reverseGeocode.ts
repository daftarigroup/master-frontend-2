/**
 * Reverse geocodes coordinates (latitude, longitude) into a precise, human-readable address.
 * Combines BigDataCloud client API and OpenStreetMap Nominatim with caching and timeout
 * to ensure fast, reliable response without blocking photo capture.
 */

const locationCache = new Map<string, string>();

/**
 * Fetches the human-readable physical address for coordinates.
 * Returns null if resolution fails or times out.
 */
export async function getPreciseLocationAddress(
  latitude: number,
  longitude: number,
  timeoutMs = 4000
): Promise<string | null> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (locationCache.has(cacheKey)) {
    return locationCache.get(cacheKey)!;
  }

  const fetchWithTimeout = async (url: string, headers?: Record<string, string>): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal, headers });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  };

  // Provider 1: BigDataCloud (Client-side, CORS enabled, extremely fast)
  try {
    const res = await fetchWithTimeout(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const parts: string[] = [];

      // Collect specific locality, city, district/subdivision, and country
      if (data.locality) parts.push(data.locality);
      if (data.city && data.city !== data.locality) parts.push(data.city);
      if (data.principalSubdivision) parts.push(data.principalSubdivision);
      if (data.countryName) parts.push(data.countryName);

      if (parts.length > 0) {
        const address = Array.from(new Set(parts)).join(', ');
        locationCache.set(cacheKey, address);
        return address;
      }
    }
  } catch {
    // Fall back to Nominatim
  }

  // Provider 2: Nominatim (OpenStreetMap)
  try {
    const res = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const parts = [
          addr.road || addr.neighbourhood || addr.suburb,
          addr.suburb && addr.suburb !== addr.road ? addr.suburb : null,
          addr.city || addr.town || addr.village || addr.county,
          addr.state,
          addr.postcode,
          addr.country,
        ].filter(Boolean) as string[];

        if (parts.length > 0) {
          const formatted = Array.from(new Set(parts)).join(', ');
          locationCache.set(cacheKey, formatted);
          return formatted;
        }
      }
      if (data.display_name) {
        locationCache.set(cacheKey, data.display_name);
        return data.display_name;
      }
    }
  } catch {
    // Both failed or offline
  }

  return null;
}
