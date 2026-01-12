import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { GraduationCap, Users, Eye, Mail, Phone } from "lucide-react";
import ParentProfileSheet from "./ParentProfileSheet";

interface RideUserBadgeProps {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  accountType?: 'parent' | 'student';
  email?: string | null;
  phoneNumber?: string | null;
  shareEmail?: boolean;
  sharePhone?: boolean;
  isCurrentUser?: boolean;
  viewerIsStudent?: boolean;
  variant?: 'compact' | 'full';
  showViewButton?: boolean;
  distance?: number;
  onRequestRide?: (parentId: string, parentName: string) => void;
  onOfferRide?: (parentId: string, parentName: string) => void;
}

const RideUserBadge = ({
  userId,
  firstName,
  lastName,
  username,
  accountType = 'parent',
  email,
  phoneNumber,
  shareEmail = false,
  sharePhone = false,
  isCurrentUser = false,
  viewerIsStudent = false,
  variant = 'compact',
  showViewButton = true,
  distance = 0,
  onRequestRide,
  onOfferRide,
}: RideUserBadgeProps) => {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return username;
  };

  const handleViewProfile = () => {
    if (accountType === 'parent') {
      setSheetOpen(true);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  const handleRequestRide = (parentId: string, parentName: string) => {
    setSheetOpen(false);
    onRequestRide?.(parentId, parentName);
  };

  const handleOfferRide = (parentId: string, parentName: string) => {
    setSheetOpen(false);
    onOfferRide?.(parentId, parentName);
  };

  // Privacy: Students only see name and role, parents see contact info if shared
  const canSeeContactInfo = !viewerIsStudent && accountType === 'parent';

  if (variant === 'compact') {
    return (
      <>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                onClick={handleViewProfile}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback 
                    className={accountType === 'parent' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs'
                    }
                  >
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-sm">{getDisplayName()}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View {accountType === 'parent' ? 'parent' : 'student'} profile</p>
            </TooltipContent>
          </Tooltip>
          <Badge 
            variant={accountType === 'student' ? 'secondary' : 'default'}
            className={`text-xs gap-1 ${
              accountType === 'student' 
                ? 'bg-blue-500/10 text-blue-600' 
                : 'bg-green-500/10 text-green-600'
            }`}
          >
            {accountType === 'student' ? (
              <GraduationCap className="h-3 w-3" />
            ) : (
              <Users className="h-3 w-3" />
            )}
            {accountType === 'student' ? 'Student' : 'Parent'}
          </Badge>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">You</Badge>
          )}
        </div>
        
        {accountType === 'parent' && (
          <ParentProfileSheet
            open={sheetOpen}
            parentId={userId}
            distance={distance}
            onClose={() => setSheetOpen(false)}
            onRequestRide={handleRequestRide}
            onOfferRide={handleOfferRide}
          />
        )}
      </>
    );
  }

  // Full variant with contact info and view button
  return (
    <>
      <div className="flex items-start gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleViewProfile}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback 
                  className={accountType === 'parent' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View profile</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={handleViewProfile}
              className="font-semibold text-base hover:underline cursor-pointer"
            >
              {getDisplayName()}
            </button>
            <Badge 
              variant={accountType === 'student' ? 'secondary' : 'default'}
              className={`text-xs gap-1 ${
                accountType === 'student' 
                  ? 'bg-blue-500/10 text-blue-600' 
                  : 'bg-green-500/10 text-green-600'
              }`}
            >
              {accountType === 'student' ? (
                <GraduationCap className="h-3 w-3" />
              ) : (
                <Users className="h-3 w-3" />
              )}
              {accountType === 'student' ? 'Student' : 'Parent'}
            </Badge>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">@{username}</p>
          
          {/* Contact info - only visible to parents viewing other parents */}
          {canSeeContactInfo && (
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {shareEmail && email && (
                <a 
                  href={`mailto:${email}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Mail className="h-3 w-3" />
                  {email}
                </a>
              )}
              {sharePhone && phoneNumber && (
                <a 
                  href={`tel:${phoneNumber}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  {phoneNumber}
                </a>
              )}
            </div>
          )}
          
          {/* Student privacy notice */}
          {viewerIsStudent && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Contact info hidden (student view)
            </p>
          )}
        </div>
        
        {showViewButton && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewProfile}
            className="gap-1"
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
        )}
      </div>
      
      {accountType === 'parent' && (
        <ParentProfileSheet
          open={sheetOpen}
          parentId={userId}
          distance={distance}
          onClose={() => setSheetOpen(false)}
          onRequestRide={handleRequestRide}
          onOfferRide={handleOfferRide}
        />
      )}
    </>
  );
};

export default RideUserBadge;
