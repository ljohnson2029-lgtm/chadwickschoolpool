import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: { latitude: number; longitude: number; address: string }) => void;
  placeholder?: string;
  className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Enter address",
  className
}) => {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { toast } = useToast();

  const handleGeocode = useCallback(async () => {
    if (!value.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter an address to geocode",
        variant: "destructive"
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address: value }
      });

      if (error) {
        console.error('Geocoding error:', error);
        toast({
          title: "Geocoding Failed",
          description: "Could not find location for this address",
          variant: "destructive"
        });
        return;
      }

      if (data && onLocationSelect) {
        onLocationSelect({
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.formatted_address
        });
        onChange(data.formatted_address);
        
        toast({
          title: "Location Found",
          description: "Address successfully geocoded",
        });
      }
    } catch (err) {
      console.error('Error geocoding address:', err);
      toast({
        title: "Error",
        description: "An error occurred while geocoding the address",
        variant: "destructive"
      });
    } finally {
      setIsGeocoding(false);
    }
  }, [value, onLocationSelect, onChange, toast]);

  return (
    <div className="flex gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleGeocode();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleGeocode}
        disabled={isGeocoding || !value.trim()}
      >
        {isGeocoding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default AddressAutocomplete;
