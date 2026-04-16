import React from 'react';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Home, School, Filter, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface MapFilterPanelProps {
  showHome: boolean;
  showSchool: boolean;
  onToggleHome: (checked: boolean) => void;
  onToggleSchool: (checked: boolean) => void;
}

const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
  showHome,
  showSchool,
  onToggleHome,
  onToggleSchool,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const allOn = showHome && showSchool;
  const allOff = !showHome && !showSchool;

  const handleShowAll = () => {
    onToggleHome(true);
    onToggleSchool(true);
  };

  const handleHideAll = () => {
    onToggleHome(false);
    onToggleSchool(false);
  };

  return (
    <Card className="bg-background/95 backdrop-blur-sm shadow-md border-border min-w-[160px]">
      <CardContent className="p-2 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-6 px-1 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            Map Pins
          </span>
          {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </Button>

        {!isCollapsed && (
          <div className="space-y-1.5 pt-1 border-t border-border">
            {/* Family Homes (blue) */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-home"
                checked={showHome}
                onCheckedChange={(checked) => onToggleHome(checked === true)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500" />
              <Label htmlFor="filter-home" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
                  <Home className="h-2 w-2 text-white" />
                </div>
                <span>Your Home</span>
              </Label>
            </div>

            {/* School (orange) */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-school"
                checked={showSchool}
                onCheckedChange={(checked) => onToggleSchool(checked === true)}
                className="h-3.5 w-3.5 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500" />
              <Label htmlFor="filter-school" className="flex items-center gap-1.5 text-xs cursor-pointer">
                <div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center">
                  <School className="h-2 w-2 text-white" />
                </div>
                <span>School</span>
              </Label>
            </div>

            <div className="flex gap-1.5 pt-1.5 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowAll}
                disabled={allOn}
                className="flex-1 h-6 text-[10px] px-1.5 gap-1">
                <Eye className="h-2.5 w-2.5" />
                Show All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleHideAll}
                disabled={allOff}
                className="flex-1 h-6 text-[10px] px-1.5 gap-1">
                <EyeOff className="h-2.5 w-2.5" />
                Hide All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>);
};

export default MapFilterPanel;
