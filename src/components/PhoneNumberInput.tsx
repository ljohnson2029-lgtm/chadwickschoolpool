import { useState, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-react";

interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
  digitLength: number; // expected number of local digits
}

const COUNTRIES: Country[] = [
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States", digitLength: 10 },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada", digitLength: 10 },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom", digitLength: 10 },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia", digitLength: 9 },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany", digitLength: 11 },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France", digitLength: 9 },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italy", digitLength: 10 },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Spain", digitLength: 9 },
  { code: "MX", dial: "+52", flag: "🇲🇽", name: "Mexico", digitLength: 10 },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brazil", digitLength: 11 },
  { code: "AR", dial: "+54", flag: "🇦🇷", name: "Argentina", digitLength: 10 },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India", digitLength: 10 },
  { code: "CN", dial: "+86", flag: "🇨🇳", name: "China", digitLength: 11 },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "Japan", digitLength: 10 },
  { code: "KR", dial: "+82", flag: "🇰🇷", name: "South Korea", digitLength: 10 },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore", digitLength: 8 },
  { code: "PH", dial: "+63", flag: "🇵🇭", name: "Philippines", digitLength: 10 },
  { code: "TH", dial: "+66", flag: "🇹🇭", name: "Thailand", digitLength: 9 },
  { code: "VN", dial: "+84", flag: "🇻🇳", name: "Vietnam", digitLength: 9 },
  { code: "MY", dial: "+60", flag: "🇲🇾", name: "Malaysia", digitLength: 10 },
  { code: "ID", dial: "+62", flag: "🇮🇩", name: "Indonesia", digitLength: 10 },
  { code: "NZ", dial: "+64", flag: "🇳🇿", name: "New Zealand", digitLength: 9 },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "South Africa", digitLength: 9 },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria", digitLength: 10 },
  { code: "EG", dial: "+20", flag: "🇪🇬", name: "Egypt", digitLength: 10 },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya", digitLength: 9 },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates", digitLength: 9 },
  { code: "SA", dial: "+966", flag: "🇸🇦", name: "Saudi Arabia", digitLength: 9 },
  { code: "IL", dial: "+972", flag: "🇮🇱", name: "Israel", digitLength: 9 },
  { code: "TR", dial: "+90", flag: "🇹🇷", name: "Turkey", digitLength: 10 },
  { code: "RU", dial: "+7", flag: "🇷🇺", name: "Russia", digitLength: 10 },
  { code: "PL", dial: "+48", flag: "🇵🇱", name: "Poland", digitLength: 9 },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Netherlands", digitLength: 9 },
  { code: "SE", dial: "+46", flag: "🇸🇪", name: "Sweden", digitLength: 9 },
  { code: "NO", dial: "+47", flag: "🇳🇴", name: "Norway", digitLength: 8 },
  { code: "DK", dial: "+45", flag: "🇩🇰", name: "Denmark", digitLength: 8 },
  { code: "FI", dial: "+358", flag: "🇫🇮", name: "Finland", digitLength: 9 },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Switzerland", digitLength: 9 },
  { code: "AT", dial: "+43", flag: "🇦🇹", name: "Austria", digitLength: 10 },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgium", digitLength: 9 },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal", digitLength: 9 },
  { code: "IE", dial: "+353", flag: "🇮🇪", name: "Ireland", digitLength: 9 },
  { code: "CL", dial: "+56", flag: "🇨🇱", name: "Chile", digitLength: 9 },
  { code: "CO", dial: "+57", flag: "🇨🇴", name: "Colombia", digitLength: 10 },
  { code: "PE", dial: "+51", flag: "🇵🇪", name: "Peru", digitLength: 9 },
  { code: "TW", dial: "+886", flag: "🇹🇼", name: "Taiwan", digitLength: 9 },
  { code: "HK", dial: "+852", flag: "🇭🇰", name: "Hong Kong", digitLength: 8 },
  { code: "PK", dial: "+92", flag: "🇵🇰", name: "Pakistan", digitLength: 10 },
  { code: "BD", dial: "+880", flag: "🇧🇩", name: "Bangladesh", digitLength: 10 },
];

/** Format digits with dashes for display */
function formatNumber(digits: string, length: number): string {
  // US/CA style: 310-555-1234
  if (length === 10) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 8-digit: 1234-5678
  if (length === 8) {
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  // 9-digit: 123-456-789
  if (length === 9) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 11-digit: 123-4567-8901
  if (length === 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  // Fallback
  return digits;
}

function getCountryByCode(code: string): Country {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
}

/** Parse a stored value like "+13105551234" into { countryCode, digits } */
function parseStoredValue(value: string): { countryCode: string; digits: string } {
  if (!value) return { countryCode: "US", digits: "" };
  // Sort by dial length descending to match longest first (e.g. +852 before +8)
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (value.startsWith(country.dial)) {
      return { countryCode: country.code, digits: value.slice(country.dial.length) };
    }
  }
  return { countryCode: "US", digits: value.replace(/\D/g, "") };
}

interface PhoneNumberInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
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

  const country = getCountryByCode(selectedCountry);

  useEffect(() => {
    const p = parseStoredValue(value);
    setSelectedCountry(p.countryCode);
    setDigits(p.digits);
  }, [value]);

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

  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [dropdownOpen]);

  const emitChange = (countryCode: string, rawDigits: string) => {
    const c = getCountryByCode(countryCode);
    const full = rawDigits ? `${c.dial}${rawDigits}` : "";
    onChange(full);
  };

  const handleDigitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, country.digitLength);
    setDigits(raw);
    emitChange(selectedCountry, raw);
  };

  const handleCountrySelect = (code: string) => {
    const newCountry = getCountryByCode(code);
    const trimmed = digits.slice(0, newCountry.digitLength);
    setSelectedCountry(code);
    setDropdownOpen(false);
    setSearch("");
    setDigits(trimmed);
    emitChange(code, trimmed);
  };

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase();
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const displayValue = formatNumber(digits, country.digitLength);

  return (
    <div className={cn("flex items-stretch", className)} ref={dropdownRef}>
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

      <input
        id={id}
        type="tel"
        inputMode="numeric"
        value={displayValue}
        onChange={handleDigitChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={formatNumber("0".repeat(country.digitLength), country.digitLength).replace(/0/g, "X")}
        className={cn(
          "flex h-10 w-full rounded-r-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        )}
      />
    </div>
  );
};

export default PhoneNumberInput;
