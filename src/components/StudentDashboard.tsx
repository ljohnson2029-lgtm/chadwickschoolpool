import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCarpoolItem } from "@/components/ui/skeleton-card";
import { 
  GraduationCap,
  Car,
  Link2,
  ArrowRight,
  Calendar,
  Users,
  User,
} from "lucide-react";
import { useLinkedParentRides } from "@/hooks/useLinkedParentRides";
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
            <div className="mb-8">
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="mb-8">
              <Skeleton className="h-7 w-40 mb-4" />
              <div className="space-y-3">
                <SkeletonCarpoolItem />
                <SkeletonCarpoolItem />
                <SkeletonCarpoolItem />
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
