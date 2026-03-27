import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface RideMessage {
  id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface RideChatThreadProps {
  rideRefId: string;
  rideSource: "public" | "private";
  currentUserId: string;
  currentUserName: string;
  otherParentId: string;
  otherParentName: string;
  isStudent?: boolean;
  rideDate?: string;
  onNewMessage?: () => void;
}

export function RideChatThread({
  rideRefId,
  rideSource,
  currentUserId,
  currentUserName,
  otherParentId,
  otherParentName,
  isStudent,
  rideDate,
  onNewMessage,
}: RideChatThreadProps) {
  const [messages, setMessages] = useState<RideMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("ride_messages" as any)
      .select("*")
      .eq("ride_ref_id", rideRefId)
      .eq("ride_source", rideSource)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as any);
    setLoading(false);
  }, [rideRefId, rideSource]);

  // Mark unread messages as read
  const markAsRead = useCallback(async () => {
    await supabase
      .from("ride_messages" as any)
      .update({ is_read: true } as any)
      .eq("ride_ref_id", rideRefId)
      .eq("ride_source", rideSource)
      .neq("sender_id", currentUserId)
      .eq("is_read", false);
  }, [rideRefId, rideSource, currentUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Mark as read on open and when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages, markAsRead]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`ride-chat-${rideRefId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ride_messages",
          filter: `ride_ref_id=eq.${rideRefId}`,
        },
        (payload) => {
          const newMsg = payload.new as RideMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideRefId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const msgText = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("ride_messages" as any).insert({
      ride_ref_id: rideRefId,
      ride_source: rideSource,
      sender_id: currentUserId,
      message_text: msgText,
    } as any);

    if (error) {
      console.error("Failed to send message:", error);
      setNewMessage(msgText);
    } else {
      // Send notification to the other parent
      try {
        await supabase.functions.invoke("create-notification", {
          body: {
            userId: otherParentId,
            type: "ride_message",
            message: `💬 ${currentUserName} sent a message about your ride on ${rideDate || "upcoming"}`,
          },
        });
      } catch (e) {
        console.warn("Failed to send chat notification:", e);
      }
      onNewMessage?.();
    }
    setSending(false);
  };

  const getSenderName = (senderId: string) => {
    if (senderId === currentUserId) return "You";
    return otherParentName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      {/* Messages area */}
      <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet. {!isStudent && "Start a conversation!"}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  {getSenderName(msg.sender_id)}
                </p>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
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

      {/* Input area - hidden for students */}
      {!isStudent && (
        <div className="border-t border-border p-2 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button size="sm" className="h-8 px-3" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}
