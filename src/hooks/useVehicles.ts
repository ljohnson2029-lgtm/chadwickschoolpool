import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Vehicle {
  id: string;
  car_make: string;
  car_model: string;
  car_color: string;
  license_plate: string;
  is_primary: boolean;
}

export interface VehicleInfo {
  car_make: string;
  car_model: string;
  car_color: string;
  license_plate: string;
  vehicle_id?: string;
}

const VEHICLES_CHANGED_EVENT = "vehicles:changed";

export function useVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    setVehicles((data as Vehicle[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Sync across all useVehicles() consumers in the app
  useEffect(() => {
    const handler = () => fetchVehicles();
    window.addEventListener(VEHICLES_CHANGED_EVENT, handler);
    return () => window.removeEventListener(VEHICLES_CHANGED_EVENT, handler);
  }, [fetchVehicles]);

  const broadcastChange = () => window.dispatchEvent(new Event(VEHICLES_CHANGED_EVENT));

  const addVehicle = async (v: Omit<Vehicle, "id" | "is_primary">) => {
    if (!user) return;
    const isPrimary = vehicles.length === 0;
    const { error } = await supabase.from("vehicles").insert({
      user_id: user.id,
      car_make: v.car_make,
      car_model: v.car_model,
      car_color: v.car_color,
      license_plate: v.license_plate,
      is_primary: isPrimary,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    if (!error) await fetchVehicles();
    return error;
  };

  const updateVehicle = async (id: string, v: Partial<Vehicle>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("vehicles").update(v as any).eq("id", id);
    if (!error) await fetchVehicles();
    return error;
  };

  const removeVehicle = async (id: string) => {
    const vehicle = vehicles.find((v) => v.id === id);
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (!error) {
      // If removed vehicle was primary, set first remaining as primary
      if (vehicle?.is_primary) {
        const remaining = vehicles.filter((v) => v.id !== id);
        if (remaining.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from("vehicles").update({ is_primary: true } as any).eq("id", remaining[0].id);
        }
      }
      await fetchVehicles();
    }
    return error;
  };

  const setPrimary = async (id: string) => {
    if (!user) return;
    // Unset all, then set the chosen one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("vehicles").update({ is_primary: false } as any).eq("user_id", user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("vehicles").update({ is_primary: true } as any).eq("id", id);
    await fetchVehicles();
  };

  const primaryVehicle = vehicles.find((v) => v.is_primary) || vehicles[0] || null;

  const toVehicleInfo = (v: Vehicle): VehicleInfo => ({
    car_make: v.car_make,
    car_model: v.car_model,
    car_color: v.car_color,
    license_plate: v.license_plate,
    vehicle_id: v.id,
  });

  return { vehicles, loading, fetchVehicles, addVehicle, updateVehicle, removeVehicle, setPrimary, primaryVehicle, toVehicleInfo };
}
