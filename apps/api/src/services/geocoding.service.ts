import { logger } from '../utils/logger.js';

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Geocode an address using Nominatim (free, no API key needed)
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const encoded = encodeURIComponent(address + ', Brasil');
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=br`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'PedireiOnline/1.0' },
    });

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      formattedAddress: data[0].display_name,
    };
  } catch (error) {
    logger.error({ err: error }, 'Geocoding error');
    return null;
  }
}
