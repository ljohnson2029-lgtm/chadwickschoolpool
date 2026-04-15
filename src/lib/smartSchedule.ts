/**
 * Smart School Schedule & Pickup Time Calculator
 * Rule-based AI for automatic time calculations
 * 
 * School Schedule:
 * - K-6: 7:55 AM - 3:15 PM (Mon, Tue, Thu)
 * - K-6: 8:55 AM - 3:15 PM (Wed - late start)
 * - K-6: 7:55 AM - 2:30 PM (Fri - early dismissal)
 * - 7-12: 7:55 AM - 3:40 PM (Mon, Tue, Thu)
 * - 7-12: 8:55 AM - 3:40 PM (Wed - late start)
 * - 9-12 Sports: until 5:00 PM
 */

export type GradeLevel = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

interface SchoolSchedule {
  startTime: string; // "07:55"
  endTime: string;   // "15:15"
  hasSports: boolean;
}

interface TravelTimeEstimate {
  distanceKm: number;
  minutes: number;
  trafficBuffer: number;
}

interface PickupRecommendation {
  suggestedPickupTime: string;
  arrivalBufferMinutes: number;
  travelTimeMinutes: number;
  reasoning: string;
  isEarlyDismissal: boolean;
  isLateStart: boolean;
}

// Chadwick School location (Palos Verdes)
const SCHOOL_LOCATION = {
  lat: 33.77667,
  lng: -118.36111,
  address: "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274"
};

// Default arrival buffer (how early to arrive before bell)
const DEFAULT_ARRIVAL_BUFFER = 5; // minutes
const SPORTS_END_TIME = "17:00"; // 5:00 PM

/**
 * Get school schedule for a specific grade and day
 */
export function getSchoolSchedule(
  grade: GradeLevel,
  dayOfWeek: number, // 0 = Sunday, 1 = Monday, etc.
  hasSportsPractice: boolean = false
): SchoolSchedule {
  // Parse grade number
  const gradeNum = grade === 'K' ? 0 : parseInt(grade, 10);
  const isK6 = gradeNum <= 6;
  const is912 = gradeNum >= 9;
  
  // Wednesday late start (day 3)
  const isWednesday = dayOfWeek === 3;
  
  // Friday early dismissal for K-6 (day 5)
  const isFriday = dayOfWeek === 5;
  
  if (isK6) {
    // K-6 Schedule
    if (isWednesday) {
      return {
        startTime: "08:55",
        endTime: "15:15",
        hasSports: false
      };
    }
    if (isFriday) {
      return {
        startTime: "07:55",
        endTime: "14:30",
        hasSports: false
      };
    }
    return {
      startTime: "07:55",
      endTime: "15:15",
      hasSports: false
    };
  } else {
    // 7-12 Schedule
    const baseSchedule = {
      startTime: isWednesday ? "08:55" : "07:55",
      endTime: "15:40",
      hasSports: false
    };
    
    // 9-12 with sports
    if (is912 && hasSportsPractice) {
      return {
        ...baseSchedule,
        endTime: SPORTS_END_TIME,
        hasSports: true
      };
    }
    
    return baseSchedule;
  }
}

/**
 * Estimate travel time based on distance and typical traffic patterns
 * Uses rule-based heuristics for Palos Verdes area
 */
export function estimateTravelTime(
  distanceKm: number,
  isMorning: boolean,
  dayOfWeek: number
): TravelTimeEstimate {
  // Base speed: 30 km/h in PV (hilly, winding roads)
  // Traffic multipliers
  const isRushHour = isMorning 
    ? true // Morning dropoff is always busy
    : dayOfWeek <= 5 && (dayOfWeek !== 5); // Afternoon pickup busy except Friday
  
  const trafficMultiplier = isRushHour ? 1.4 : 1.0;
  const baseMinutes = (distanceKm / 30) * 60; // At 30 km/h
  const adjustedMinutes = Math.ceil(baseMinutes * trafficMultiplier);
  
  // Add buffer for parking/walking to pickup area
  const parkingBuffer = 3;
  
  return {
    distanceKm,
    minutes: adjustedMinutes,
    trafficBuffer: parkingBuffer
  };
}

/**
 * Calculate optimal pickup time
 */
export function calculatePickupTime(
  grade: GradeLevel,
  date: Date,
  homeLocation: { lat: number; lng: number },
  hasSportsPractice: boolean = false,
  customArrivalBuffer: number = DEFAULT_ARRIVAL_BUFFER
): PickupRecommendation {
  const dayOfWeek = date.getDay();
  const schedule = getSchoolSchedule(grade, dayOfWeek, hasSportsPractice);
  
  // Calculate distance to school (simplified - could use Mapbox API)
  const distanceKm = calculateDistance(
    homeLocation.lat,
    homeLocation.lng,
    SCHOOL_LOCATION.lat,
    SCHOOL_LOCATION.lng
  );
  
  // Estimate travel time
  const travelEstimate = estimateTravelTime(distanceKm, false, dayOfWeek);
  const totalTravelTime = travelEstimate.minutes + travelEstimate.trafficBuffer;
  
  // Calculate suggested pickup time
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
  const schoolEndTime = new Date(date);
  schoolEndTime.setHours(endHour, endMinute, 0, 0);
  
  // Subtract travel time and arrival buffer
  const pickupTime = new Date(schoolEndTime.getTime() - (totalTravelTime + customArrivalBuffer) * 60000);
  
  const suggestedPickupTime = formatTime(pickupTime);
  
  // Generate human-readable reasoning
  const isEarlyDismissal = schedule.endTime === "14:30";
  const isLateStart = schedule.startTime === "08:55";
  
  let reasoning = `School ends at ${formatTime24to12(schedule.endTime)}. `;
  if (isEarlyDismissal) {
    reasoning += "It's Friday early dismissal for K-6. ";
  }
  if (isLateStart) {
    reasoning += "Wednesday late start day. ";
  }
  if (schedule.hasSports) {
    reasoning += "Includes sports practice until 5:00 PM. ";
  }
  reasoning += `With ${Math.round(distanceKm * 0.621371)} miles to travel and ${totalTravelTime} minutes needed `;
  reasoning += `(${travelEstimate.minutes} min drive + ${travelEstimate.trafficBuffer} min buffer), `;
  reasoning += `leave by ${suggestedPickupTime} to arrive ${customArrivalBuffer} minutes early.`;
  
  return {
    suggestedPickupTime,
    arrivalBufferMinutes: customArrivalBuffer,
    travelTimeMinutes: totalTravelTime,
    reasoning,
    isEarlyDismissal,
    isLateStart
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format time as "h:mm AM/PM"
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Convert 24h time ("15:15") to 12h format ("3:15 PM")
 */
function formatTime24to12(time24: string): string {
  const [hour, minute] = time24.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parse natural language time input
 * Examples: "3:15 PM", "15:15", "3:15", "3pm", "afternoon"
 */
export function parseNaturalTime(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  
  // Handle "afternoon", "morning", etc.
  if (normalized.includes('afternoon')) {
    return "15:15"; // Default to standard dismissal
  }
  if (normalized.includes('morning')) {
    return "07:55"; // Default morning start
  }
  
  // Try to match time patterns
  // Pattern: "3:15 PM" or "3:15 pm" or "15:15"
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/;
  const match = normalized.match(timePattern);
  
  if (!match) return null;
  
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];
  
  // Convert to 24-hour format
  if (period === 'pm' && hour !== 12) {
    hour += 12;
  }
  if (period === 'am' && hour === 12) {
    hour = 0;
  }
  
  // If no period specified and hour is small, assume PM for pickup times
  if (!period && hour < 7) {
    hour += 12;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Auto-complete ride details based on child's grade and typical patterns
 */
export function autoCompleteRideDetails(
  childGrade: GradeLevel,
  rideDate: Date,
  rideType: 'pickup' | 'dropoff',
  homeLocation?: { lat: number; lng: number }
): {
  suggestedTime: string;
  explanation: string;
} {
  const dayOfWeek = rideDate.getDay();
  const schedule = getSchoolSchedule(childGrade, dayOfWeek);
  
  if (rideType === 'dropoff') {
    // For dropoff, suggest arriving 10 minutes before start
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const arrivalTime = new Date(rideDate);
    arrivalTime.setHours(startHour, startMinute - 10, 0, 0);
    
    return {
      suggestedTime: formatTime(arrivalTime),
      explanation: `Arrive 10 minutes before school starts (${formatTime24to12(schedule.startTime)})`
    };
  } else {
    // For pickup, use smart calculation if we have location
    if (homeLocation) {
      const rec = calculatePickupTime(childGrade, rideDate, homeLocation);
      return {
        suggestedTime: rec.suggestedPickupTime,
        explanation: rec.reasoning
      };
    } else {
      // Default: right at dismissal
      return {
        suggestedTime: formatTime24to12(schedule.endTime),
        explanation: `School dismissal time (${formatTime24to12(schedule.endTime)})`
      };
    }
  }
}

/**
 * Smart matching: Find the best carpool match based on proximity and schedule
 */
export interface PotentialMatch {
  parentId: string;
  parentName: string;
  distance: number; // km
  scheduleCompatibility: number; // 0-100
  childrenInCommon: number;
  reason: string;
}

export function findPotentialMatches(
  myLocation: { lat: number; lng: number },
  mySchedule: { days: number[]; times: string[] },
  otherParents: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    schedule: { days: number[]; times: string[] };
    children: string[];
  }>,
  myChildren: string[]
): PotentialMatch[] {
  const matches: PotentialMatch[] = [];
  
  for (const parent of otherParents) {
    // Calculate distance
    const distance = calculateDistance(
      myLocation.lat, myLocation.lng,
      parent.location.lat, parent.location.lng
    );
    
    // Skip if too far (more than 3 km)
    if (distance > 3) continue;
    
    // Calculate schedule overlap
    const commonDays = mySchedule.days.filter(d => parent.schedule.days.includes(d));
    const commonTimes = mySchedule.times.filter(t => parent.schedule.times.includes(t));
    
    if (commonDays.length === 0) continue;
    
    // Calculate compatibility score
    const dayCompatibility = (commonDays.length / Math.max(mySchedule.days.length, parent.schedule.days.length)) * 100;
    const timeCompatibility = (commonTimes.length / Math.max(mySchedule.times.length, parent.schedule.times.length)) * 100;
    const scheduleCompatibility = Math.round((dayCompatibility + timeCompatibility) / 2);
    
    // Count children in same activities/classes
    const childrenInCommon = myChildren.filter(c => parent.children.includes(c)).length;
    
    // Generate reason
    let reason = `${Math.round(distance * 0.621371 * 10) / 10} miles away`;
    if (commonDays.length > 0) {
      reason += ` • ${commonDays.length} days compatible`;
    }
    if (childrenInCommon > 0) {
      reason += ` • ${childrenInCommon} children in common`;
    }
    
    matches.push({
      parentId: parent.id,
      parentName: parent.name,
      distance,
      scheduleCompatibility,
      childrenInCommon,
      reason
    });
  }
  
  // Sort by distance, then compatibility
  return matches.sort((a, b) => {
    if (Math.abs(a.distance - b.distance) > 0.5) {
      return a.distance - b.distance;
    }
    return b.scheduleCompatibility - a.scheduleCompatibility;
  });
}
