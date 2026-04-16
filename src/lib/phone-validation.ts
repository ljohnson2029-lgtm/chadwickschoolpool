/** Validate that a stored phone value has the exact required digit count for its country */
export function isValidPhoneNumber(value: string): boolean {
  if (!value) return false;
  
  // Parse the stored value format: "+1|1234567890"
  const parseStoredValue = (val: string): { countryCode: string; digits: string } => {
    const parts = val.split('|');
    return {
      countryCode: parts[0] || '',
      digits: parts[1] || '',
    };
  };
  
  // Get country digit length by country code
  const getCountryByCode = (code: string): { digitLength: number } => {
    const lengths: Record<string, number> = {
      '+1': 10, // US/Canada
      '+44': 10, // UK
      '+61': 9, // Australia
      '+33': 9, // France
      '+49': 11, // Germany
      '+81': 10, // Japan
      '+86': 11, // China
      '+91': 10, // India
    };
    return { digitLength: lengths[code] || 10 };
  };
  
  const parsed = parseStoredValue(value);
  const country = getCountryByCode(parsed.countryCode);
  return parsed.digits.length === country.digitLength;
}
