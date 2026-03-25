import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";

interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
}

const COUNTRIES: Country[] = [
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "MX", dial: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "AR", dial: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "CN", dial: "+86", flag: "🇨🇳", name: "China" },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "KR", dial: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "PH", dial: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "TH", dial: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "VN", dial: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "MY", dial: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "ID", dial: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "NZ", dial: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "EG", dial: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "IL", dial: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "TR", dial: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "RU", dial: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "PL", dial: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "SE", dial: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "NO", dial: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "DK", dial: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "FI", dial: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "AT", dial: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "IE", dial: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "CL", dial: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "CO", dial: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "PE", dial: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "TW", dial: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "HK", dial: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "PK", dial: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "BD", dial: "+880", flag: "🇧🇩", name: "Bangladesh" },
];

/** Format digits into US-style dashes: 310-555-1234 */
function formatUSNumber(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/** Parse a stored value like "+13105551234" into { dialCode, digits } */
function parseStoredValue(value: string): { countryCode: string; digits: string } {
  if (!value) return { countryCode: "US", digits: "" };

  // Try to match a country dial code
  for (const country of COUNTRIES) {
    if (value.startsWith(country.dial)) {
      return { countryCode: country.code, digits: value.slice(country.dial.length) };
    }
  }
  // Fallback: strip non-digits
  return { countryCode: "US", digits: value.replace(/\D/g, "") };
}

interface PhoneNumberInputProps {
  value: string; // stored as "+13105551234"
  onChange: (fullNumber: string) => void; // emits "+13105551234"
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  placeholder?: string;
  onBlur?: () => void;
}

const PhoneNumberInput = ({
  value,
  onChange,
  className,
  disabled,
  id,
  onBlur,
}: PhoneNumberInputProps) => {
  const parsed = parseStoredValue(value);
  const [selectedCountry, setSelectedCountry] = useState<string>(parsed.countryCode);
  const [digits, setDigits] = useState(parsed.digits);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const country = COUNTRIES.find(c => c.code === selectedCountry) || COUNTRIES[0];

  // Sync from external value changes
  useEffect(() => {
    const p = parseStoredValue(value);
    setSelectedCountry(p.countryCode);
    setDigits(p.digits);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [dropdownOpen]);

  const emitChange = (countryCode: string, rawDigits: string) => {
    const c = COUNTRIES.find(cc => cc.code === countryCode) || COUNTRIES[0];
    const full = rawDigits ? `${c.dial}${rawDigits}` : "";
    onChange(full);
  };

  const handleDigitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setDigits(raw);
    emitChange(selectedCountry, raw);
  };

  const handleCountrySelect = (code: string) => {
    setSelectedCountry(code);
    setDropdownOpen(false);
    setSearch("");
    emitChange(code, digits);
  };

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const displayValue = formatUSNumber(digits);

  return (
    <div className={cn("flex items-stretch", className)} ref={dropdownRef}>
      {/* Country selector */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "flex items-center gap-1 h-10 px-2.5 border border-input bg-background rounded-l-md text-sm",
            "hover:bg-accent/50 transition-colors border-r-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          )}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="text-muted-foreground text-xs">{country.dial}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full pl-7 pr-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCountries.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c.code)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors text-left",
                    c.code === selectedCountry && "bg-accent"
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="text-muted-foreground w-10">{c.dial}</span>
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="text-sm text-muted-foreground p-3 text-center">No results</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Number input */}
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleDigitChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder="310-555-1234"
        className={cn(
          "flex h-10 w-full rounded-r-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        )}
      />
    </div>
  );
};

/** Validate that a stored phone value has enough digits */
export function isValidPhoneNumber(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10;
}

export default PhoneNumberInput;
