import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserPlus,
  Phone,
  Car,
  Hand,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { SkeletonListItem } from "@/components/ui/skeleton-card";
import type { LinkedParent } from "@/hooks/useLinkedParentRides";

/* ─── Helpers ───────────────────────────────────────────────────── */

const getInitials = (parent: LinkedParent): string => {
  const first = parent.parent_first_name?.[0] ?? "";
  const last = parent.parent_last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "??";
};

const getFullName = (parent: LinkedParent): string =>
  [parent.parent_first_name, parent.parent_last_name].filter(Boolean).join(" ") || "Unknown Parent";

const getLinkedAgo = (parent: LinkedParent): string | null => {
  try {
    if (!parent.linked_at) return null;
    return `Linked ${formatDistanceToNow(new Date(parent.linked_at), { addSuffix: false })} ago`;
  } catch {
    return null;
  }
};

/* ─── Ride Summary Badges ───────────────────────────────────────── */

interface RideSummaryProps {
  offerCount?: number;
  requestCount?: number;
}

const RideSummary = ({ offerCount = 0, requestCount = 0 }: RideSummaryProps) => {
  if (offerCount === 0 && requestCount === 0) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      {offerCount > 0 && (
        <Badge variant="outline" className="text-xs gap-1 font-normal">
          <Car className="h-3 w-3" />
          {offerCount} offer{offerCount !== 1 ? "s" : ""}
        </Badge>
      )}
      {requestCount > 0 && (
        <Badge variant="outline" className="text-xs gap-1 font-normal">
          <Hand className="h-3 w-3" />
          {requestCount} request{requestCount !== 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
};

/* ─── Parent Card ───────────────────────────────────────────────── */

interface ParentCardProps {
  parent: LinkedParent;
  onViewRides?: (parentId: string) => void;
}

const ParentCard = ({ parent, onViewRides }: ParentCardProps) => {
  const fullName = getFullName(parent);
  const linkedAgo = useMemo(() => getLinkedAgo(parent), [parent]);

  return (
    <Card
      className="hover:shadow-md transition-shadow"
      aria-label={`Linked parent: ${fullName}`}
    >
      <CardContent className="py-4 space-y-3">
        {/* Header row: avatar + info + status */}
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold">
              {getInitials(parent)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fullName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {parent.parent_email}
            </p>
          </div>

          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0"
          >
            Linked
          </Badge>
        </div>

        {/* Ride summary */}
        <RideSummary
          offerCount={parent.offer_count}
          requestCount={parent.request_count}
        />

        {/* Footer: linked date + actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            {linkedAgo && (
              <span className="text-xs text-muted-foreground">{linkedAgo}</span>
            )}

            {parent.parent_phone && (
              
                href={`tel:${parent.parent_phone}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                aria-label={`Call ${fullName}`}
              >
                <Phone className="h-3 w-3" />
                Call
              </a>
            )}
          </div>

          {onViewRides && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={() => onViewRides(parent.parent_id)}
              aria-label={`View rides from ${fullName}`}
            >
              View Rides
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Main Component ────────────────────────────────────────────── */

interface LinkedParentsListProps {
  parents: LinkedParent[];
  loading: boolean;
  onViewParentRides?: (parentId: string) => void;
}

export function LinkedParentsList({
  parents,
  loading,
  onViewParentRides,
}: LinkedParentsListProps) {
  const navigate = useNavigate();

  /* ── Loading state ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────────────── */
  if (parents.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Parents Linked Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Link to your parent's account to see their carpool schedules and
            stay connected with family ride plans.
          </p>
          <Button
            onClick={() => navigate("/family-links")}
            size="lg"
            className="gap-2"
          >
            <UserPlus className="h-5 w-5" />
            Link to Parent Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Populated state ────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Count header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parents.length} parent{parents.length !== 1 ? "s" : ""} linked
        </p>
      </div>

      {/* Parent cards grid */}
      <div className="grid gap-4 sm:grid-cols-2" role="list">
        {parents.map((parent) => (
          <div key={parent.parent_id} role="listitem">
            <ParentCard
              parent={parent}
              onViewRides={onViewParentRides}
            />
          </div>
        ))}
      </div>

      {/* Add another */}
      <Button
        variant="outline"
        onClick={() => navigate("/family-links")}
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Add Another Parent
      </Button>
    </div>
  );
}

export default LinkedParentsList;