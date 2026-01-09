import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Radio,
  Trash2,
  Send,
  Inbox,
  MessageSquare,
  Check,
  X
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DeleteRideDialog,
  CancelRequestDialog,
  DeclineRequestDialog,
} from "@/components/ConfirmDialogs";
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

interface BroadcastRide {
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

interface PrivateRequest {
  id: string;
  request_type: 'request' | 'offer';
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  ride_date: string;
  pickup_time: string;
  is_round_trip: boolean;
  return_time: string | null;
  pickup_address: string;
  dropoff_address: string;
  seats_needed: number | null;
  seats_offered: number | null;
  message: string | null;
  distance_from_route: number | null;
  created_at: string;
  responded_at: string | null;
  sender_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  recipient_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
}

const MyRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [broadcastRides, setBroadcastRides] = useState<BroadcastRide[]>([]);
  const [sentRequests, setSentRequests] = useState<PrivateRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PrivateRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rideToDelete, setRideToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PrivateRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;
    setLoadingData(true);
    await Promise.all([
      fetchBroadcastRides(),
      fetchPrivateRequests()
    ]);
    setLoadingData(false);
  };

  const fetchBroadcastRides = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true });

    if (error) {
      console.error('Error fetching broadcast rides:', error);
    } else {
      setBroadcastRides(data || []);
    }
  };

  const fetchPrivateRequests = async () => {
    if (!user) return;

    // Fetch sent requests
    const { data: sent, error: sentError } = await supabase
      .from('private_ride_requests')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (sentError) {
      console.error('Error fetching sent requests:', sentError);
    } else {
      // Get recipient profiles separately
      const recipientIds = [...new Set(sent?.map(r => r.recipient_id) || [])];
      let recipientProfiles: Record<string, any> = {};
      if (recipientIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username')
          .in('id', recipientIds);
        if (profiles) {
          recipientProfiles = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      setSentRequests((sent || []).map(r => ({
        ...r,
        recipient_profile: recipientProfiles[r.recipient_id] || null
      })) as any);
    }

    // Fetch received requests
    const { data: received, error: receivedError } = await supabase
      .from('private_ride_requests')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (receivedError) {
      console.error('Error fetching received requests:', receivedError);
    } else {
      // Get sender profiles separately
      const senderIds = [...new Set(received?.map(r => r.sender_id) || [])];
      let senderProfiles: Record<string, any> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username')
          .in('id', senderIds);
        if (profiles) {
          senderProfiles = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      setReceivedRequests((received || []).map(r => ({
        ...r,
        sender_profile: senderProfiles[r.sender_id] || null
      })) as any);
    }
  };

  const handleDeleteRide = async () => {
    if (!rideToDelete || !user) return;

    setDeleteLoading(true);
    console.log('Deleting ride:', rideToDelete, 'for user:', user.id);
    
    const { data, error } = await supabase
      .from('rides')
      .update({ status: 'cancelled' })
      .eq('id', rideToDelete)
      .eq('user_id', user.id)
      .select();

    console.log('Delete result:', { data, error });

    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete ride: ' + error.message);
    } else if (!data || data.length === 0) {
      toast.error('No ride was updated - you may not have permission');
    } else {
      toast.success('Ride deleted successfully');
      fetchBroadcastRides();
    }
    setDeleteLoading(false);
    setDeleteDialogOpen(false);
    setRideToDelete(null);
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('private_ride_requests')
      .update({
        status: 'cancelled',
        responded_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to cancel request');
    } else {
      // Notify the recipient
      await supabase.from('notifications').insert({
        user_id: selectedRequest.recipient_id,
        type: 'private_request_cancelled',
        message: `${profile?.first_name} ${profile?.last_name} cancelled their ${selectedRequest.request_type === 'request' ? 'ride request' : 'ride offer'}`,
        is_read: false
      });

      toast.success('Request cancelled');
      fetchPrivateRequests();
    }
    setActionLoading(false);
    setCancelDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('private_ride_requests')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to accept request');
      setActionLoading(false);
      return;
    }

    // Create notification
    await supabase.from('notifications').insert({
      user_id: selectedRequest.sender_id,
      type: 'private_request_accepted',
      message: `${profile?.first_name} ${profile?.last_name} accepted your ${selectedRequest.request_type === 'request' ? 'ride request' : 'ride offer'}!`,
      is_read: false
    });

    toast.success('Request accepted!');
    fetchPrivateRequests();
    setActionLoading(false);
    setAcceptDialogOpen(false);
    setSelectedRequest(null);
  };

  const handleDeclineRequest = async (reason?: string) => {
    if (!selectedRequest) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('private_ride_requests')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to decline request');
      setActionLoading(false);
      return;
    }

    // Create notification with optional reason
    const reasonText = reason ? ` Reason: "${reason}"` : "";
    await supabase.from('notifications').insert({
      user_id: selectedRequest.sender_id,
      type: 'private_request_declined',
      message: `${profile?.first_name} ${profile?.last_name} declined your ${selectedRequest.request_type === 'request' ? 'ride request' : 'ride offer'}.${reasonText}`,
      is_read: false
    });

    toast.success('Request declined');
    fetchPrivateRequests();
    setActionLoading(false);
    setDeclineDialogOpen(false);
    setSelectedRequest(null);
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600';
      case 'accepted': return 'bg-green-500/10 text-green-600';
      case 'declined': return 'bg-red-500/10 text-red-600';
      case 'cancelled': return 'bg-gray-500/10 text-gray-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
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

  const BroadcastRideCard = ({ ride }: { ride: BroadcastRide }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {ride.type === 'request' ? '🙏 Ride Request' : '🚗 Ride Offer'}
          </CardTitle>
          <Badge className="gap-1">
            <Radio className="h-3 w-3" />
            Public
          </Badge>
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
          {ride.type === 'offer'
            ? `${ride.seats_available} seats available`
            : `${ride.seats_needed} seats needed`}
        </div>

        <Button 
          variant="destructive" 
          size="sm"
          className="w-full gap-2"
          onClick={() => {
            setRideToDelete(ride.id);
            setDeleteDialogOpen(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </CardContent>
    </Card>
  );

  const PrivateRequestCard = ({ request, isSent }: { request: PrivateRequest; isSent: boolean }) => {
    const otherProfile = isSent ? request.recipient_profile : request.sender_profile;
    
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(otherProfile?.first_name || null, otherProfile?.last_name || null, otherProfile?.username || 'U')}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {otherProfile?.first_name} {otherProfile?.last_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">@{otherProfile?.username}</p>
              </div>
            </div>
            <Badge className={getStatusColor(request.status)}>
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="outline" className="gap-1">
            {request.request_type === 'request' ? '🙏 Request' : '🚗 Offer'}
          </Badge>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">{request.pickup_address}</div>
              <div className="text-muted-foreground">to {request.dropoff_address}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(new Date(request.ride_date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {request.pickup_time}
            </div>
          </div>

          {request.message && (
            <p className="text-sm text-muted-foreground pt-2 border-t italic">
              "{request.message}"
            </p>
          )}

          {/* Actions for received pending requests */}
          {!isSent && request.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                className="flex-1 gap-2"
                onClick={() => {
                  setSelectedRequest(request);
                  setAcceptDialogOpen(true);
                }}
              >
                <Check className="h-4 w-4" />
                Accept
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => {
                  setSelectedRequest(request);
                  setDeclineDialogOpen(true);
                }}
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          )}

          {/* Cancel button for sent pending requests */}
          {isSent && request.status === 'pending' && (
            <Button 
              size="sm" 
              variant="outline"
              className="w-full gap-2 mt-2"
              onClick={() => {
                setSelectedRequest(request);
                setCancelDialogOpen(true);
              }}
            >
              <X className="h-4 w-4" />
              Cancel Request
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            {isSent ? 'Sent' : 'Received'} {format(new Date(request.created_at), 'MMM d, h:mm a')}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "My Rides" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Rides</h1>
          <p className="text-muted-foreground">
            Manage your posted rides and private requests
          </p>
        </div>

        <Tabs defaultValue="posted" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posted" className="gap-2">
              <Radio className="h-4 w-4" />
              Posted Rides ({broadcastRides.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Send className="h-4 w-4" />
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-2">
              <Inbox className="h-4 w-4" />
              Received ({receivedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posted">
            {loadingData ? (
              <div className="text-center py-12">Loading...</div>
            ) : broadcastRides.length === 0 ? (
              <EmptyState
                icon={Radio}
                title="No Posted Rides"
                description="You haven't posted any public rides yet"
                action={{
                  label: "Post a Ride",
                  onClick: () => navigate('/find-rides?tab=post')
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {broadcastRides.map((ride) => (
                  <BroadcastRideCard key={ride.id} ride={ride} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent">
            {loadingData ? (
              <div className="text-center py-12">Loading...</div>
            ) : sentRequests.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No Sent Requests"
                description="You haven't sent any private ride requests yet"
                action={{
                  label: "Find Parents on Map",
                  onClick: () => navigate('/map/find-parents')
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sentRequests.map((request) => (
                  <PrivateRequestCard key={request.id} request={request} isSent={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received">
            {loadingData ? (
              <div className="text-center py-12">Loading...</div>
            ) : receivedRequests.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No Received Requests"
                description="No one has sent you private ride requests yet"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {receivedRequests.map((request) => (
                  <PrivateRequestCard key={request.id} request={request} isSent={false} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Dialog */}
        <DeleteRideDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteRide}
          loading={deleteLoading}
        />

        {/* Accept Dialog */}
        <AlertDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept this request?</AlertDialogTitle>
              <AlertDialogDescription>
                By accepting, {selectedRequest?.sender_profile?.first_name} will be notified and receive your contact information.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAcceptRequest} disabled={actionLoading}>
                {actionLoading ? "Accepting..." : "Accept Request"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Decline Dialog */}
        <DeclineRequestDialog
          open={declineDialogOpen}
          onOpenChange={setDeclineDialogOpen}
          onConfirm={handleDeclineRequest}
          senderName={`${selectedRequest?.sender_profile?.first_name || ''} ${selectedRequest?.sender_profile?.last_name || ''}`.trim() || 'This parent'}
          loading={actionLoading}
        />

        {/* Cancel Request Dialog */}
        <CancelRequestDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleCancelRequest}
          recipientName={`${selectedRequest?.recipient_profile?.first_name || ''} ${selectedRequest?.recipient_profile?.last_name || ''}`.trim() || 'The recipient'}
          loading={actionLoading}
        />
      </div>
    </DashboardLayout>
  );
};

export default MyRides;