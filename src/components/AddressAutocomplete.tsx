import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2, CheckCircle2, X, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ─── Types ─────────────────────────────────────────────────────── */

interface GeocodedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: GeocodedLocation) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoGeocode?: boolean;
  autoGeocodeDelay?: number;
}

/* ─── Status Type ───────────────────────────────────────────────── */

type GeocodeStatus = "idle" | "loading" | "success" | "error";

/* ─── Component ─────────────────────────────────────────────────── */

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter address",
  className,
  required = false,
  autoGeocode = false,
  autoGeocodeDelay = 800,
}) => {
  const [status, setStatus] = useState<GeocodeStatus>("idle");
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Geocode logic ──────────────────────────────────────── */

  const handleGeocode = useCallback(async () => {
    if (!value.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter an address to geocode",
        variant: "destructive",
      });
      return;
    }

    setStatus("loading");

    try {
      const { data, error } = await supabase.functions.invoke("geocode-address", { body: { address: value } });

      if (error || !data) {
        console.error("Geocoding error:", error);
        setStatus("error");
        setResolvedAddress(null);
        toast({
          title: "Geocoding Failed",
          description: "Could not find location for this address",
          variant: "destructive",
        });
        return;
      }

      const formatted = data.formatted_address ?? value;
      setStatus("success");
      setResolvedAddress(formatted);
      onChange(formatted);

      onLocationSelect?.({
        latitude: data.latitude,
        longitude: data.longitude,
        address: formatted,
      });

      toast({
        title: "Location Found",
        description: "Address successfully geocoded",
      });
    } catch (err) {
      console.error("Error geocoding address:", err);
      setStatus("error");
      setResolvedAddress(null);
      toast({
        title: "Error",
        description: "An error occurred while geocoding the address",
        variant: "destructive",
      });
    }
  }, [value, onLocationSelect, onChange, toast]);

  /* ── Auto-geocode on typing (optional) ──────────────────── */

  useEffect(() => {
    if (!autoGeocode || !value.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      handleGeocode();
    }, autoGeocodeDelay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [autoGeocode, autoGeocodeDelay, value, handleGeocode]);

  /* ── Reset status when user edits the address ───────────── */

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Reset status when the user changes text after a geocode
      if (status === "success" || status === "error") {
        setStatus("idle");
        setResolvedAddress(null);
      }
    },
    [onChange, status],
  );

  /* ── Clear handler ──────────────────────────────────────── */

  const handleClear = useCallback(() => {
    onChange("");
    setStatus("idle");
    setResolvedAddress(null);
  }, [onChange]);

  /* ── Derived state ──────────────────────────────────────── */

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  const inputBorderClass = isSuccess
    ? "border-emerald-500 focus-visible:ring-emerald-500/30"
    : isError
      ? "border-red-500 focus-visible:ring-red-500/30"
      : "";

  /* ── Geocode button icon ────────────────────────────────── */

  const GeocodeIcon = () => {
    if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isError) return <RotateCw className="h-4 w-4" />;
    if (isSuccess) return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    return <MapPin className="h-4 w-4" />;
  };

  return (
    <div className="space-y-1.5">
      {/* ── Input row ─────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`${inputBorderClass} ${value.trim() ? "pr-8" : ""} ${className ?? ""}`}
            required={required}
            aria-invalid={isError}
            aria-describedby="address-helper"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleGeocode();
              }
            }}
          />

          {/* Clear button inside input */}
          {value.trim() && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear address"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Geocode button */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGeocode}
          disabled={isLoading || !value.trim()}
          aria-label={isLoading ? "Geocoding address…" : isError ? "Retry geocoding" : "Geocode address"}
        >
          <GeocodeIcon />
        </Button>
      </div>

      {/* ── Helper text / resolved address ────────────────── */}
      <div id="address-helper">
        {isSuccess && resolvedAddress && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            <span className="truncate">{resolvedAddress}</span>
          </div>
        )}

        {isError && (
          <p className="text-xs text-red-500">Could not locate this address. Check spelling and try again.</p>
        )}

        {status === "idle" && !autoGeocode && value.trim().length === 0 && (
          <p className="text-xs text-muted-foreground">Type an address and press Enter or click the pin icon</p>
        )}
      </div>
    </div>
  );
};

export default AddressAutocomplete;
