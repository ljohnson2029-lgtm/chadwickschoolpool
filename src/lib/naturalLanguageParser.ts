/**
 * Natural Language Ride Parser
 * Allows parents to type in plain English (or simple text) to create rides
 * 
 * Examples:
 * - "I need pickup for Tommy on Monday at 3:15"
 * - "Can someone drive Sarah to school Tuesday morning?"
 * - "Offering ride from PV to Chadwick every Wednesday at 7:45"
 * - "Pickup needed for 2 kids Friday at 2:30"
 */

import type { GradeLevel } from './smartSchedule';
import { parseNaturalTime, getSchoolSchedule, calculatePickupTime } from './smartSchedule';

export interface ParsedRideRequest {
  rideType: 'request' | 'offer';
  action: 'pickup' | 'dropoff' | 'both';
  childName?: string;
  dayOfWeek?: number;
  date?: Date;
  time?: string;
  isRecurring: boolean;
  recurringDays?: number[];
  confidence: number; // 0-100
  parsedFields: string[];
  missingFields: string[];
  suggestions: string[];
}

const DAYS_OF_WEEK = [
  { names: ['sunday', 'sun'], value: 0 },
  { names: ['monday', 'mon'], value: 1 },
  { names: ['tuesday', 'tue', 'tues'], value: 2 },
  { names: ['wednesday', 'wed'], value: 3 },
  { names: ['thursday', 'thu', 'thurs'], value: 4 },
  { names: ['friday', 'fri'], value: 5 },
  { names: ['saturday', 'sat'], value: 6 },
];

const RIDE_TYPE_INDICATORS = {
  request: ['need', 'needs', 'looking for', 'searching for', 'can someone', 'please help', 'help with'],
  offer: ['offering', 'can drive', 'have room', 'available', 'driving', 'pickup available', 'rides available']
};

const ACTION_INDICATORS = {
  pickup: ['pickup', 'pick up', 'get', 'collect', 'bring home', 'from school'],
  dropoff: ['dropoff', 'drop off', 'take', 'drive to', 'to school', 'morning', 'bring to'],
  both: ['round trip', 'there and back', 'both ways', 'to and from']
};

const RECURRING_INDICATORS = ['every', 'weekly', 'each', 'all', 'regular', 'always'];

/**
 * Parse natural language input into a structured ride request
 */
export function parseRideRequest(
  input: string,
  userChildren: Array<{ name: string; grade: GradeLevel }>,
  userLocation?: { lat: number; lng: number }
): ParsedRideRequest {
  const normalized = input.toLowerCase().trim();
  const result: ParsedRideRequest = {
    rideType: 'request',
    action: 'pickup',
    isRecurring: false,
    confidence: 0,
    parsedFields: [],
    missingFields: [],
    suggestions: []
  };
  
  let confidencePoints = 0;
  const maxPoints = 6; // rideType, action, child, day, time, recurring
  
  // 1. Detect ride type (request vs offer)
  for (const indicator of RIDE_TYPE_INDICATORS.offer) {
    if (normalized.includes(indicator)) {
      result.rideType = 'offer';
      result.parsedFields.push('rideType: offer');
      confidencePoints++;
      break;
    }
  }
  if (result.rideType === 'request') {
    for (const indicator of RIDE_TYPE_INDICATORS.request) {
      if (normalized.includes(indicator)) {
        result.parsedFields.push('rideType: request');
        confidencePoints++;
        break;
      }
    }
  }
  
  // 2. Detect action (pickup vs dropoff)
  if (normalized.includes('round trip') || normalized.includes('both ways')) {
    result.action = 'both';
    result.parsedFields.push('action: both ways');
    confidencePoints++;
  } else {
    for (const indicator of ACTION_INDICATORS.dropoff) {
      if (normalized.includes(indicator)) {
        result.action = 'dropoff';
        result.parsedFields.push('action: dropoff');
        confidencePoints++;
        break;
      }
    }
    if (result.action === 'pickup') {
      for (const indicator of ACTION_INDICATORS.pickup) {
        if (normalized.includes(indicator)) {
          result.parsedFields.push('action: pickup');
          confidencePoints++;
          break;
        }
      }
    }
  }
  
  // 3. Extract child name
  for (const child of userChildren) {
    if (normalized.includes(child.name.toLowerCase())) {
      result.childName = child.name;
      result.parsedFields.push(`child: ${child.name}`);
      confidencePoints++;
      break;
    }
  }
  
  // 4. Extract day of week
  for (const day of DAYS_OF_WEEK) {
    for (const name of day.names) {
      if (normalized.includes(name)) {
        result.dayOfWeek = day.value;
        result.parsedFields.push(`day: ${day.names[0]}`);
        confidencePoints++;
        break;
      }
    }
    if (result.dayOfWeek !== undefined) break;
  }
  
  // 5. Detect if recurring
  for (const indicator of RECURRING_INDICATORS) {
    if (normalized.includes(indicator)) {
      result.isRecurring = true;
      result.parsedFields.push('recurring: yes');
      confidencePoints++;
      break;
    }
  }
  
  // 6. Extract time
  const timeMatch = parseNaturalTime(normalized);
  if (timeMatch) {
    result.time = timeMatch;
    result.parsedFields.push(`time: ${timeMatch}`);
    confidencePoints++;
  }
  
  // Calculate confidence score
  result.confidence = Math.round((confidencePoints / maxPoints) * 100);
  
  // Determine missing fields and generate suggestions
  if (!result.childName && userChildren.length > 0) {
    result.missingFields.push('child');
    result.suggestions.push(`Which child? (${userChildren.map(c => c.name).join(', ')})`);
  }
  
  if (result.dayOfWeek === undefined) {
    result.missingFields.push('day');
    result.suggestions.push('Which day? (Monday, Tuesday, etc.)');
  }
  
  if (!result.time) {
    result.missingFields.push('time');
    if (result.childName && result.dayOfWeek !== undefined && userLocation) {
      // Try to suggest smart time
      const child = userChildren.find(c => c.name === result.childName);
      if (child) {
        const nextDate = getNextDate(result.dayOfWeek);
        const recommendation = calculatePickupTime(
          child.grade,
          nextDate,
          userLocation
        );
        result.suggestions.push(`Suggested pickup time: ${recommendation.suggestedPickupTime}`);
      }
    }
    result.suggestions.push('What time? (e.g., "3:15 PM")');
  }
  
  // Auto-fill recurring days if not specified
  if (result.isRecurring && result.dayOfWeek !== undefined && !result.recurringDays) {
    result.recurringDays = [result.dayOfWeek];
  }
  
  return result;
}

/**
 * Get the next occurrence of a specific day of week
 */
function getNextDate(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  return nextDate;
}

/**
 * Quick reply suggestions for chat interface
 */
export const QUICK_REPLIES = {
  runningLate: [
    { label: "Running 5 min late", message: "Running about 5 minutes late, be there soon!" },
    { label: "Running 10 min late", message: "Running about 10 minutes late, sorry for the delay!" },
    { label: "Stuck in traffic", message: "Stuck in traffic, will be there as soon as possible" },
  ],
  arrival: [
    { label: "I'm here", message: "I'm here in the pickup line" },
    { label: "Outside now", message: "I'm outside the main entrance" },
    { label: "In parking lot", message: "I'm in the parking lot, where are you?" },
  ],
  changes: [
    { label: "Can't make it", message: "Sorry, I can't make it today. Can someone else pickup?" },
    { label: "Different driver", message: "My spouse will be picking up instead of me today" },
    { label: "Running early", message: "I'm running early today, can pickup whenever" },
  ],
  confirmation: [
    { label: "Confirmed", message: "Confirmed! See you then." },
    { label: "Thanks!", message: "Thanks so much for the help!" },
    { label: "Sounds good", message: "Sounds good, see you at pickup!" },
  ]
};

/**
 * Auto-suggest improvements to ride requests
 */
export function suggestRideImprovements(ride: ParsedRideRequest): string[] {
  const suggestions: string[] = [];
  
  if (ride.confidence < 50) {
    suggestions.push("Try being more specific. For example: 'I need pickup for Tommy on Monday at 3:15 PM'");
  }
  
  if (ride.action === 'both') {
    suggestions.push("Consider splitting this into two separate requests (morning dropoff and afternoon pickup) for better matching");
  }
  
  if (ride.isRecurring && ride.recurringDays && ride.recurringDays.length === 1) {
    suggestions.push("Weekly recurring rides work best! Parents love consistent schedules");
  }
  
  if (ride.rideType === 'request' && !ride.time) {
    suggestions.push("Offering a specific time makes it easier for others to help");
  }
  
  return suggestions;
}
