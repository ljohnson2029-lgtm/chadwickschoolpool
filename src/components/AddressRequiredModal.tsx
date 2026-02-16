import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2 } from "lucide-react";

interface AddressSuggestion {
  place_name: string;
  center: [number, number]; // [longitude, latitude]
}

interface AddressAutocompleteInputProps {
  value: string;
  onAddressSelect: (address: string, latitude: number, longitude: number) => void;
  placeholder?: string;
  required?: boolean;
}

const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onAddressSelect,
  placeholder = "Enter your home address",
  required = false,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{ lat: number; lng: number } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setSuggestions([]);
      setFetchError(null);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    try {
      // Use Nominatim (OpenStreetMap) for geocoding - no auth required
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "ChadwickCarpools/1.0",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch address suggestions");
      }

      const data = await response.json();
      console.log("Nominatim response:", data);

      // Transform Nominatim format to our format
      const formattedSuggestions: AddressSuggestion[] = data.map((item: any) => ({
        place_name: item.display_name,
        center: [parseFloat(item.lon), parseFloat(item.lat)] as [number, number],
      }));

      setSuggestions(formattedSuggestions);
      setShowSuggestions(true);

      if (formattedSuggestions.length === 0) {
        setFetchError("No addresses found. Try a different search.");
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setFetchError("Unable to find address suggestions. Please try again.");
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedAddress(null); // Clear selected address when typing

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce API call
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 500);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const [longitude, latitude] = suggestion.center;
    setInputValue(suggestion.place_name);
    setSelectedAddress({ lat: latitude, lng: longitude });
    setShowSuggestions(false);
    setSuggestions([]);

    // Call the callback with the selected address
    onAddressSelect(suggestion.place_name, latitude, longitude);

    toast({
      title: "Address Selected",
      description: "Address successfully geocoded",
    });
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          required={required}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : selectedAddress ? (
            <MapPin className="h-4 w-4 text-primary" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-start gap-2 border-b border-border last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">{suggestion.place_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Error message */}
      {fetchError && !isLoading && <p className="text-xs text-destructive mt-1">{fetchError}</p>}

      {/* Validation message */}
      {required && inputValue && !selectedAddress && !fetchError && (
        <p className="text-xs text-muted-foreground mt-1">Please select an address from the suggestions</p>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
