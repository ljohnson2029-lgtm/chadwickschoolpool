import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  X,
  User
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format } from "date-fns";
import { toast } from "sonner";

interface Conversation {
  id: string;
  ride_id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  message: string | null;
  created_at: string;
  sender_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  recipient_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  ride?: {
    type: string;
    pickup_location: string;
    dropoff_location: string;
    ride_date: string;
    ride_time: string;
    seats_needed: number | null;
    seats_available: number | null;
  };
}

const Conversations = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    setLoadingConversations(true);
    const { data, error } = await supabase
      .from('ride_conversations')
      .select(`
        *,
        sender_profile:profiles!ride_conversations_sender_id_fkey(first_name, last_name, username),
        recipient_profile:profiles!ride_conversations_recipient_id_fkey(first_name, last_name, username),
        ride:rides(type, pickup_location, dropoff_location, ride_date, ride_time, seats_needed, seats_available)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      setConversations(data as any || []);
    }
    setLoadingConversations(false);
  };

  const handleAccept = async (conversationId: string) => {
    const { error } = await supabase
      .from('ride_conversations')
      .update({ status: 'accepted' })
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to accept ride');
    } else {
      toast.success('Ride accepted!');
      fetchConversations();
    }
  };

  const handleDecline = async (conversationId: string) => {
    const { error } = await supabase
      .from('ride_conversations')
      .update({ status: 'declined' })
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to decline ride');
    } else {
      toast.success('Ride declined');
      fetchConversations();
    }
  };

  const handleCancel = async (conversationId: string) => {
    const { error } = await supabase
      .from('ride_conversations')
      .update({ status: 'cancelled' })
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to cancel request');
    } else {
      toast.success('Request cancelled');
      fetchConversations();
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
    const isSender = conversation.sender_id === user?.id;
    const otherParty = isSender ? conversation.recipient_profile : conversation.sender_profile;
    const canRespond = !isSender && conversation.status === 'pending';
    const canCancel = isSender && conversation.status === 'pending';

    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(otherParty?.first_name || null, otherParty?.last_name || null, otherParty?.username || 'UN')}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">
                  {otherParty?.first_name} {otherParty?.last_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">@{otherParty?.username}</p>
              </div>
            </div>
            {getStatusBadge(conversation.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">
              {isSender ? 'You sent a request' : 'Received a request'} for a {conversation.ride?.type === 'offer' ? 'ride offer' : 'ride request'}
            </p>
            {conversation.message && (
              <p className="text-sm text-muted-foreground italic">"{conversation.message}"</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium">{conversation.ride?.pickup_location}</div>
                <div className="text-muted-foreground">to {conversation.ride?.dropoff_location}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {conversation.ride?.ride_date && format(new Date(conversation.ride.ride_date), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {conversation.ride?.ride_time}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {format(new Date(conversation.created_at), 'PPp')}
            </p>
          </div>

          {canRespond && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => handleAccept(conversation.id)}
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" />
                Accept
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleDecline(conversation.id)}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          )}

          {canCancel && (
            <Button 
              variant="outline"
              onClick={() => handleCancel(conversation.id)}
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Request
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-5xl">
        <Breadcrumbs items={[{ label: "My Conversations" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Conversations</h1>
          <p className="text-muted-foreground">
            All your direct ride negotiations and responses to public posts
          </p>
        </div>

        {loadingConversations ? (
          <div className="text-center py-12">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No Active Conversations"
            description="When you respond to rides or receive ride requests, they'll appear here"
            action={{
              label: "Find Rides",
              onClick: () => navigate('/find-rides')
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conversations.map((conversation) => (
              <ConversationCard key={conversation.id} conversation={conversation} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Conversations;
