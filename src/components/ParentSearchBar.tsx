import { useState, useCallback, useEffect } from "react";
import { Search, Hand, Car, GraduationCap, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DirectRideModal from "@/components/DirectRideModal";

interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  children: { first_name: string; last_name: string; grade_level: string | null }[];
}

const ParentSearchBar = () => {
  const { profile } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [directRide, setDirectRide] = useState<{ recipientId: string; recipientName: string; type: "request" | "offer" } | null>(null);

  const isParent = profile?.account_type === "parent";

  const doSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-parents", {
        body: { query: searchQuery.trim() },
      });
      if (error) throw error;
      setResults(data?.results || []);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch(query);
    }
  };

  const getParentName = (r: SearchResult) =>
    [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username;

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for a parent or student by name"
          className="pl-9 pr-10"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Only parents who have created a Chadwick School Pool account will appear in search results
      </p>

      {/* Results */}
      {hasSearched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No matching parents found</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((r) => {
            const name = getParentName(r);
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-semibold text-foreground truncate">{name}</h4>
                        <Badge variant="secondary" className="text-xs">Parent</Badge>
                      </div>
                      {r.children.length > 0 && (
                        <div className="ml-6 space-y-0.5">
                          <p className="text-xs font-medium text-muted-foreground">Children:</p>
                          {r.children.map((child, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-sm">
                              <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{child.first_name} {child.last_name}</span>
                              {child.grade_level && (
                                <span className="text-muted-foreground text-xs">• {child.grade_level}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isParent && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setDirectRide({ recipientId: r.id, recipientName: name, type: "request" })}
                        >
                          <Hand className="h-3 w-3" />
                          Request Ride
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => setDirectRide({ recipientId: r.id, recipientName: name, type: "offer" })}
                        >
                          <Car className="h-3 w-3" />
                          Offer Ride
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Direct Ride Modal */}
      {directRide && (
        <DirectRideModal
          open
          onClose={() => setDirectRide(null)}
          recipientId={directRide.recipientId}
          recipientName={directRide.recipientName}
          type={directRide.type}
          onSuccess={() => setDirectRide(null)}
        />
      )}
    </div>
  );
};

export default ParentSearchBar;
