 import { useState, useEffect, useCallback } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { isStudent as checkIsStudent } from "@/lib/permissions";
 
 export interface LinkedParent {
   parent_id: string;
   parent_email: string;
   parent_first_name: string;
   parent_last_name: string;
   linked_at: string;
 }
 
 export interface FamilyRide {
   id: string;
   type: string;
   ride_date: string;
   ride_time: string;
   pickup_location: string;
   dropoff_location: string;
   pickup_latitude: number | null;
   pickup_longitude: number | null;
   dropoff_latitude: number | null;
   dropoff_longitude: number | null;
   seats_available: number | null;
   seats_needed: number | null;
   status: string | null;
   user_id: string;
   parent_id: string;
   parent_name: string;
   parent_email: string;
 }
 
 interface UseLinkedParentRidesResult {
   linkedParents: LinkedParent[];
   familyRides: FamilyRide[];
   isStudent: boolean;
   loading: boolean;
   refresh: () => Promise<void>;
 }
 
 export function useLinkedParentRides(): UseLinkedParentRidesResult {
   const { user } = useAuth();
   const [linkedParents, setLinkedParents] = useState<LinkedParent[]>([]);
   const [familyRides, setFamilyRides] = useState<FamilyRide[]>([]);
   const [isStudent, setIsStudent] = useState(false);
   const [loading, setLoading] = useState(true);
 
   const fetchData = useCallback(async () => {
     if (!user) {
       setLoading(false);
       return;
     }
 
     setLoading(true);
 
     try {
       // Check if user is a student by querying their email
       const { data: userData, error: userError } = await supabase
         .from('users')
         .select('email')
         .eq('user_id', user.id)
         .single();
 
       if (userError) {
         console.error('Error fetching user email:', userError);
       }
 
       const userEmail = userData?.email;
       const userIsStudent = userEmail ? checkIsStudent(userEmail) : false;
       setIsStudent(userIsStudent);
 
       console.log('[useLinkedParentRides] User email:', userEmail, 'isStudent:', userIsStudent);
 
       if (!userIsStudent) {
         // Not a student, no family rides to show
         setLinkedParents([]);
         setFamilyRides([]);
         setLoading(false);
         return;
       }
 
       // Fetch linked parents using RPC function
       const { data: parents, error: parentsError } = await supabase.rpc('get_linked_parents', {
         student_user_id: user.id
       });
       
       console.log('[useLinkedParentRides] Linked parents:', parents, 'Error:', parentsError);
 
       if (parentsError) {
         console.error('Error fetching linked parents:', parentsError);
         setLinkedParents([]);
         setFamilyRides([]);
         setLoading(false);
         return;
       }
 
       setLinkedParents(parents || []);
 
       if (!parents || parents.length === 0) {
         setFamilyRides([]);
         setLoading(false);
         return;
       }
 
       // Fetch family schedule using the new RPC that includes joined rides
       const { data: schedule, error: scheduleError } = await supabase.rpc(
         'get_family_schedule',
         { student_user_id: user.id }
       );
       
       console.log('[useLinkedParentRides] Family schedule:', schedule, 'Error:', scheduleError);
 
       if (scheduleError) {
         console.error('Error fetching family schedule:', scheduleError);
         setFamilyRides([]);
         setLoading(false);
         return;
       }
 
       // Map the schedule to FamilyRide format
       const ridesWithParentInfo: FamilyRide[] = (schedule || []).map((ride: any) => ({
         id: ride.id,
         type: ride.type,
         ride_date: ride.ride_date,
         ride_time: ride.ride_time,
         pickup_location: ride.pickup_location,
         dropoff_location: ride.dropoff_location,
         pickup_latitude: ride.pickup_latitude,
         pickup_longitude: ride.pickup_longitude,
         dropoff_latitude: ride.dropoff_latitude,
         dropoff_longitude: ride.dropoff_longitude,
         seats_available: ride.seats_available,
         seats_needed: ride.seats_needed,
         status: ride.status,
         user_id: ride.user_id,
         parent_id: ride.parent_id,
         parent_name: `${ride.parent_first_name || ''} ${ride.parent_last_name || ''}`.trim() || 'Parent',
         parent_email: ride.parent_email || '',
       }));
 
       // Sort by date/time
       ridesWithParentInfo.sort((a, b) => {
         const dateA = new Date(`${a.ride_date}T${a.ride_time}`);
         const dateB = new Date(`${b.ride_date}T${b.ride_time}`);
         return dateA.getTime() - dateB.getTime();
       });

       setFamilyRides(ridesWithParentInfo);
     } catch (error) {
       console.error('Error in useLinkedParentRides:', error);
       setLinkedParents([]);
       setFamilyRides([]);
     } finally {
       setLoading(false);
     }
   }, [user]);
 
   useEffect(() => {
     fetchData();
   }, [fetchData]);
 
   return {
     linkedParents,
     familyRides,
     isStudent,
     loading,
     refresh: fetchData,
   };
 }