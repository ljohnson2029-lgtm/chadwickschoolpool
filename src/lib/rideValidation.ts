// Shared helpers for ride form validation

/**
 * Returns true if the given date (yyyy-MM-dd) and time (HH:mm) combine to a
 * moment in the future relative to "now". Useful for preventing past ride posts.
 */
export const isFutureDateTime = (dateStr: string, timeStr: string): boolean => {
  if (!dateStr || !timeStr) return false;
  const ride = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(ride.getTime())) return false;
  return ride.getTime() > Date.now();
};

/**
 * Combines a Date (used for the date portion only) and an HH:mm string into a
 * single Date and checks whether it is in the future.
 */
export const isFutureDateAndTime = (date: Date | undefined, timeStr: string): boolean => {
  if (!date || !timeStr) return false;
  const [h, m] = timeStr.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(h || 0, m || 0, 0, 0);
  return combined.getTime() > Date.now();
};

export const PAST_DATETIME_ERROR = "Please select a future date and time for your ride";

/**
 * Compute great-circle distance in miles between two lat/lng points (Haversine).
 */
export const haversineMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 3958.8; // Earth radius in miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};
