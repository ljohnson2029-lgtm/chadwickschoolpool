import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchUnifiedRides } from "@/lib/fetchUnifiedRides";

/**
 * Prefetches data for key routes on hover so navigation feels instant.
 */
export function usePrefetchRoutes() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const isStudent = profile?.account_type === "student";

  const prefetch = useCallback(
    (path: string) => {
      if (!user) return;

      switch (path) {
        case "/my-rides":
          if (!isStudent) {
            queryClient.prefetchQuery({
              queryKey: ["my-rides", user.id],
              queryFn: () => fetchUnifiedRides(user.id),
              staleTime: 2 * 60 * 1000,
            });
          }
          break;

        case "/family-carpools":
          // Prefetch broadcast rides list
          queryClient.prefetchQuery({
            queryKey: ["family-carpools-rides"],
            queryFn: async () => {
              const today = new Date().toISOString().split("T")[0];
              const { data } = await supabase
                .from("rides")
                .select(
                  "*, profiles:user_id(first_name, last_name, username, phone_number, share_phone, share_email, home_address, car_make, car_model, car_color, license_plate)"
                )
                .gte("ride_date", today)
                .eq("is_fulfilled", false)
                .order("ride_date", { ascending: true })
                .order("ride_time", { ascending: true })
                .limit(50);
              return data;
            },
            staleTime: 2 * 60 * 1000,
          });
          break;

        case "/dashboard":
          // Dashboard data is lightweight, no heavy prefetch needed
          break;

        case "/profile":
          queryClient.prefetchQuery({
            queryKey: ["profile", user.id],
            queryFn: async () => {
              const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
          break;
      }
    },
    [user, isStudent, queryClient]
  );

  return prefetch;
}
