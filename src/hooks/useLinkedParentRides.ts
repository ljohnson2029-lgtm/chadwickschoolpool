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
         // Fallback: try to get email from auth metadata
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
 
       // If no linked parents, no rides to show
       if (!parents || parents.length === 0) {
         setFamilyRides([]);
         setLoading(false);
         return;
       }
 
       // Fetch rides from linked parents
       const parentIds = parents.map((p: LinkedParent) => p.parent_id);
       const today = new Date().toISOString().split('T')[0];
 
       const { data: rides, error: ridesError } = await supabase
         .from('rides')
         .select('*')
         .in('user_id', parentIds)
         .eq('status', 'active')
         .gte('ride_date', today)
         .order('ride_date', { ascending: true })
         .order('ride_time', { ascending: true });
       
       console.log('[useLinkedParentRides] Family rides:', rides, 'Error:', ridesError);
 
       if (ridesError) {
         console.error('Error fetching family rides:', ridesError);
         setFamilyRides([]);
         setLoading(false);
         return;
       }
 
       // Map parent info to rides
       const parentMap = parents.reduce((acc: Record<string, { name: string; email: string }>, p: LinkedParent) => {
         const name = `${p.parent_first_name || ''} ${p.parent_last_name || ''}`.trim() || 'Parent';
         acc[p.parent_id] = { name, email: p.parent_email };
         return acc;
       }, {});
 
       const ridesWithParentInfo: FamilyRide[] = (rides || []).map(ride => ({
         ...ride,
         parent_name: parentMap[ride.user_id]?.name || 'Parent',
         parent_email: parentMap[ride.user_id]?.email || '',
       }));
 
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