import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Radio,
  Trash2,
  Edit
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MyRide {
  id: string;
  type: string;
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  ride_time: string;
  seats_needed: number | null;
  seats_available: number | null;
  route_details: string | null;
  is_recurring: boolean;
  recurring_days: string[] | null;
  transaction_type: string;
  status: string;
}

const MyRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [myRides, setMyRides] = useState<MyRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyRides();
    }
  }, [user]);

  const fetchMyRides = async () => {
    if (!user) return;

    setLoadingRides(true);
    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true });

    if (error) {
      console.error('Error fetching my rides:', error);
    } else {
      setMyRides(data || []);
    }
    setLoadingRides(false);
  };

  const handleDeleteRide = async () => {
    if (!rideToDelete) return;

    const { error } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideToDelete);

    if (error) {
      toast.error('Failed to delete ride');
    } else {
      toast.success('Ride deleted successfully');
      fetchMyRides();
    }
    setDeleteDialogOpen(false);
    setRideToDelete(null);
  };

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const RideCard = ({ ride }: { ride: MyRide }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {ride.type === 'offer' ? 'Ride Offer' : 'Ride Request'}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={ride.type === "offer" ? "default" : "secondary"}>
                {ride.type === "offer" ? "Offering Ride" : "Requesting Ride"}
              </Badge>
              {ride.transaction_type === 'broadcast' && (
                <Badge className="gap-1 bg-purple-600 dark:bg-purple-700">
                  <Radio className="h-3 w-3" />
                  Public Post
                </Badge>
              )}
            </div>
          </div>
          {ride.is_recurring && (
            <Badge variant="outline">Recurring</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium">{ride.pickup_location}</div>
            <div className="text-muted-foreground">to {ride.dropoff_location}</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(ride.ride_date), 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {ride.ride_time}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          {ride.type === "offer"
            ? `${ride.seats_available} seats available`
            : `${ride.seats_needed} seats needed`}
        </div>

        {ride.route_details && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            {ride.route_details}
          </div>
        )}

        {ride.is_recurring && ride.recurring_days && (
          <div className="text-sm pt-2 border-t">
            <span className="text-muted-foreground">Repeats: </span>
            {ride.recurring_days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(", ")}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t">
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => {
              setRideToDelete(ride.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "My Posted Rides" }]} />

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Posted Rides</h1>
              <p className="text-muted-foreground">
                Manage all your ride requests and offers
              </p>
            </div>
            <Button onClick={() => navigate('/post-ride')} className="gap-2">
              <Radio className="h-4 w-4" />
              Post New Ride
            </Button>
          </div>
        </div>

        {loadingRides ? (
          <div className="text-center py-12">Loading your rides...</div>
        ) : myRides.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No Posted Rides"
            description="You haven't posted any rides yet. Create one to get started!"
            action={{
              label: "Post a Ride",
              onClick: () => navigate('/post-ride')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ride?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this ride post. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRide} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default MyRides;
