import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import RecurringRideForm from "./RecurringRideForm";
import RecurringRideCard from "./RecurringRideCard";

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface RecurringRide {
  id: string;
  space_id: string;
  creator_id: string;
  recipient_id: string;
  ride_type: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_latitude: number;
  dropoff_longitude: number;
  ride_time: string;
  recurring_days: string[];
  creator_children: any;
  recipient_children: any;
  status: string;
  created_at: string;
}

interface Props {
  spaceId: string;
  otherParentName: string;
  onBack: () => void;
}

const SeriesSpaceView = ({ spaceId, otherParentName, onBack }: Props) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [rides, setRides] = useState<RecurringRide[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [loadingRides, setLoadingRides] = useState(true);
  const [showForm, setShowForm] = useState<"offer" | "request" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [otherParentId, setOtherParentId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState("");

  // Determine other parent ID and current user name
  useEffect(() => {
    if (!user) return;
    const fetchSpace = async () => {
      const { data } = await supabase
        .from("series_spaces")
        .select("parent_a_id, parent_b_id")
        .eq("id", spaceId)
        .single();
      if (data) {
        setOtherParentId(data.parent_a_id === user.id ? data.parent_b_id : data.parent_a_id);
      }
    };
    fetchSpace();
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "A parent";
    setCurrentUserName(name);
  }, [user, spaceId, profile]);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("series_messages")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setMessages(data.reverse());
    setLoadingMsgs(false);
  }, [spaceId]);

  const fetchRides = useCallback(async () => {
    const { data } = await supabase
      .from("recurring_rides")
      .select("*")
      .eq("space_id", spaceId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (data) setRides(data as RecurringRide[]);
    setLoadingRides(false);
  }, [spaceId]);

  useEffect(() => { fetchMessages(); fetchRides(); }, [fetchMessages, fetchRides]);

  // Mark messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;
    supabase
      .from("series_messages")
      .update({ is_read: true })
      .eq("space_id", spaceId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then();
  }, [messages, user, spaceId]);

  // Realtime for messages
  useEffect(() => {
    const channel = supabase
      .channel(`series-chat-${spaceId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "series_messages",
        filter: `space_id=eq.${spaceId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("series_messages").insert({
      space_id: spaceId,
      sender_id: user.id,
      message_text: text,
    });

    if (error) {
      setNewMessage(text);
    } else {
      // Send notification
      if (otherParentId) {
        try {
          await supabase.functions.invoke("create-notification", {
            body: {
              userId: otherParentId,
              type: "series_message",
              message: `💬 ${currentUserName} sent you a message in your Series space`,
            },
          });
        } catch {}
      }
    }
    setSending(false);
  };

  const handleRidePosted = () => {
    setShowForm(null);
    fetchRides();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Series with {otherParentName}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Coordinate recurring rides with this parent here</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div ref={scrollRef} className="h-64 overflow-y-auto space-y-2 mb-3 border rounded-lg p-3 bg-muted/30">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {isMe ? "You" : otherParentName}
                      </p>
                      <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                        {msg.message_text}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(msg.created_at), "h:mm a")}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              />
              <Button size="sm" className="h-9 px-3" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recurring Rides Section */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recurring Rides</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {showForm ? (
              <RecurringRideForm
                spaceId={spaceId}
                otherParentId={otherParentId}
                otherParentName={otherParentName}
                rideType={showForm}
                onCancel={() => setShowForm(null)}
                onSuccess={handleRidePosted}
              />
            ) : (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => setShowForm("offer")} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Post Recurring Ride Offer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm("request")} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Post Recurring Ride Request
                </Button>
              </div>
            )}

            {loadingRides ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : rides.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recurring rides yet.</p>
            ) : (
              rides.map((ride) => (
                <RecurringRideCard
                  key={ride.id}
                  ride={ride}
                  otherParentName={otherParentName}
                  onUpdate={fetchRides}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SeriesSpaceView;
