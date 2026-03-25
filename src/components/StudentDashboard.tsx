 import { useNavigate } from "react-router-dom";
 import { useAuth } from "@/contexts/AuthContext";
 import { DashboardLayout } from "@/components/DashboardLayout";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { SkeletonListItem, SkeletonCarpoolItem } from "@/components/ui/skeleton-card";
 import { 
   GraduationCap,
   Users,
   Calendar,
   Car,
   User,
   Link2,
   ArrowRight,
   Radio
 } from "lucide-react";
 import { useLinkedParentRides } from "@/hooks/useLinkedParentRides";
 import { LinkedParentsList } from "@/components/student/LinkedParentsList";
 import { WeekCalendar } from "@/components/student/WeekCalendar";
 
 const StudentDashboard = () => {
   const { user, profile } = useAuth();
   const navigate = useNavigate();
   
   // Use the centralized hook for linked parents and rides
   const { linkedParents, familyRides, loading } = useLinkedParentRides();
 
   if (!user || !profile) {
     return (
       <DashboardLayout>
         <div className="container mx-auto px-4 py-8 max-w-5xl">
           {/* Header skeleton */}
           <div className="mb-8">
             <Skeleton className="h-9 w-64 mb-2" />
             <Skeleton className="h-6 w-32" />
           </div>
 
           {/* Linked Parents skeleton */}
           <div className="mb-8">
             <Skeleton className="h-7 w-40 mb-4" />
             <div className="grid gap-4 sm:grid-cols-2">
               <SkeletonListItem />
               <SkeletonListItem />
             </div>
           </div>
 
           {/* Family Carpools skeleton */}
           <div className="mb-8">
             <Skeleton className="h-7 w-40 mb-4" />
             <div className="space-y-3">
               <SkeletonCarpoolItem />
               <SkeletonCarpoolItem />
               <SkeletonCarpoolItem />
             </div>
           </div>
 
           {/* Quick Actions skeleton */}
           <div>
             <Skeleton className="h-7 w-32 mb-4" />
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {[1, 2, 3].map((i) => (
                 <Card key={i}>
                   <CardContent className="py-6 text-center">
                     <Skeleton className="h-8 w-8 mx-auto mb-3 rounded" />
                     <Skeleton className="h-4 w-32 mx-auto mb-2" />
                     <Skeleton className="h-3 w-24 mx-auto" />
                   </CardContent>
                 </Card>
               ))}
             </div>
           </div>
         </div>
       </DashboardLayout>
     );
   }
 
   return (
     <DashboardLayout>
       <div className="container mx-auto px-4 py-8 max-w-5xl">
         {/* Header */}
         <div className="mb-8">
           <div className="flex items-center gap-3 mb-2">
             <h1 className="text-3xl font-bold">Welcome back, {profile.first_name}!</h1>
           </div>
           <div className="flex items-center gap-2">
             <Badge variant="secondary" className="gap-1">
               <GraduationCap className="h-3 w-3" />
               Student Account
             </Badge>
           </div>
         </div>
 
          {/* Schedule */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Car className="h-5 w-5" />
                 Scheduled Rides
              </h2>
              {linkedParents.length > 0 && familyRides.length > 0 && (
                <Button variant="ghost" onClick={() => navigate('/family-carpools')} className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {linkedParents.length === 0 ? (
              <Card className="bg-muted/30">
                <CardContent className="py-8 text-center">
                  <Link2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Link to a parent account to see family carpools
                  </p>
                </CardContent>
              </Card>
            ) : (
              <WeekCalendar rides={familyRides} loading={loading} />
            )}
          </div>
        </div>
      </DashboardLayout>
   );
 };
 
 export default StudentDashboard;
