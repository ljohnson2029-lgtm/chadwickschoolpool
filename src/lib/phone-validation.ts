/** Validate that a stored phone value has the exact required digit count for its country */

const COUNTRY_DIAL_TO_LENGTH: Record<string, number> = {
  // Order matters when matching prefixes — longer dial codes must be tried first.
  "+880": 10, // Bangladesh
  "+886": 9,  // Taiwan
  "+852": 8,  // Hong Kong
  "+972": 9,  // Israel
  "+971": 9,  // UAE
  "+966": 9,  // Saudi Arabia
  "+358": 9,  // Finland
  "+353": 9,  // Ireland
  "+351": 9,  // Portugal
  "+254": 9,  // Kenya
  "+234": 10, // Nigeria
  "+91": 10,  // India
  "+92": 10,  // Pakistan
  "+90": 10,  // Turkey
  "+86": 11,  // China
  "+84": 9,   // Vietnam
  "+82": 10,  // South Korea
  "+81": 10,  // Japan
  "+66": 9,   // Thailand
  "+65": 8,   // Singapore
  "+64": 9,   // New Zealand
  "+63": 10,  // Philippines
  "+62": 10,  // Indonesia
  "+61": 9,   // Australia
  "+60": 10,  // Malaysia
  "+57": 10,  // Colombia
  "+56": 9,   // Chile
  "+55": 11,  // Brazil
  "+54": 10,  // Argentina
  "+52": 10,  // Mexico
  "+51": 9,   // Peru
  "+49": 11,  // Germany
  "+48": 9,   // Poland
  "+47": 8,   // Norway
  "+46": 9,   // Sweden
  "+45": 8,   // Denmark
  "+44": 10,  // UK
  "+43": 10,  // Austria
  "+41": 9,   // Switzerland
  "+39": 10,  // Italy
  "+34": 9,   // Spain
  "+33": 9,   // France
  "+32": 9,   // Belgium
  "+31": 9,   // Netherlands
  "+27": 9,   // South Africa
  "+20": 10,  // Egypt
  "+7": 10,   // Russia
  "+1": 10,   // US/Canada
};

export function isValidPhoneNumber(value: string): boolean {
  if (!value) return false;

  // Find the longest dial code that the value starts with.
  const dials = Object.keys(COUNTRY_DIAL_TO_LENGTH).sort((a, b) => b.length - a.length);
  for (const dial of dials) {
    if (value.startsWith(dial)) {
      const digits = value.slice(dial.length).replace(/\D/g, "");
      return digits.length === COUNTRY_DIAL_TO_LENGTH[dial];
    }
  }

  // Fallback: if no recognized dial code, accept 10 digits.
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}
