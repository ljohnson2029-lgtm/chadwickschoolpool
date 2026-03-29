import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Calendar, GraduationCap, Sparkles,
  MessageCircle, Users, ChevronRight, Zap, TrendingUp, Bot,
} from "lucide-react";

interface Suggestion {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  distance_miles: number;
  grade_matches: string[];
  schedule_overlap_days: string[];
  ride_count: number;
  score: number;
  confidence: string;
  reasons: string[];
  ai_summary: string | null;
}

const SuggestedPartners = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAddress, setNoAddress] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("suggest-carpool-partners");
        if (error) throw error;
        if (data?.reason === "no_address") {
          setNoAddress(true);
          setSuggestions([]);
        } else {
          setSuggestions(data?.suggestions || []);
          setAiPowered(data?.ai_powered || false);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, [user]);

  const getInitials = (first: string, last: string, username: string) => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  const getName = (s: Suggestion) =>
    [s.first_name, s.last_name].filter(Boolean).join(" ") || s.username;

  const getReasonIcon = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes("mile") || r.includes("away") || r.includes("nearby") || r.includes("close")) return <MapPin className="h-3 w-3" />;
    if (r.includes("schedule") || r.includes("day") || r.includes("mon") || r.includes("tue") || r.includes("wed") || r.includes("thu") || r.includes("fri")) return <Calendar className="h-3 w-3" />;
    if (r.includes("grade") || r.includes("kid") || r.includes("child") || r.includes("th ") || r.includes("nd ") || r.includes("rd ") || r.includes("st ")) return <GraduationCap className="h-3 w-3" />;
    if (r.includes("active") || r.includes("reliable") || r.includes("carpool")) return <TrendingUp className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  const getConfidenceStyle = (confidence: string) => {
    if (confidence === "great") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
    if (confidence === "good") return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
  };

  const getConfidenceLabel = (confidence: string) => {
    if (confidence === "great") return "Great Match";
    if (confidence === "good") return "Good Match";
    return "Potential Match";
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="min-w-[280px] h-[200px] rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (noAddress) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-5 text-center space-y-2">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Add your home address in{" "}
            <button className="text-primary underline" onClick={() => navigate("/profile")}>
              Profile Settings
            </button>{" "}
            to get personalized carpool suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Suggested for You</h2>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          {aiPowered ? <Bot className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
          {aiPowered ? "AI-Ranked" : "Smart Match"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        {aiPowered
          ? "AI-curated matches based on proximity, schedule, and grade level"
          : "Families matched by proximity, schedule, and grade level"}
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {suggestions.map(s => (
          <Card
            key={s.id}
            className="min-w-[280px] sm:min-w-0 flex-shrink-0 snap-start rounded-xl border hover:shadow-md transition-all"
          >
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {getInitials(s.first_name, s.last_name, s.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{getName(s)}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Parent</span>
                    </div>
                  </div>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0.5 ${getConfidenceStyle(s.confidence)} border-0`}>
                  {getConfidenceLabel(s.confidence)}
                </Badge>
              </div>

              {/* AI Summary */}
              {s.ai_summary && (
                <p className="text-xs text-foreground/80 italic bg-muted/50 rounded-md px-2.5 py-1.5 leading-relaxed">
                  "{s.ai_summary}"
                </p>
              )}

              {/* Reasons */}
              <div className="space-y-1">
                {s.reasons.slice(0, 3).map((reason, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-primary/70">{getReasonIcon(reason)}</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8 gap-1.5"
                onClick={() => navigate(`/series?startWith=${s.id}`)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Start Series
                <ChevronRight className="h-3 w-3 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SuggestedPartners;
