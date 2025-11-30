import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MapLegendProps {
  parentsCount?: number;
  filteredCount?: number;
}

const MapLegend: React.FC<MapLegendProps> = ({ parentsCount = 0, filteredCount = 0 }) => {
  return (
    <Card className="bg-background/95 backdrop-blur-sm border-border shadow-lg">
      <CardContent className="p-3 space-y-2">
        <h3 className="font-semibold text-xs uppercase text-muted-foreground mb-2">
          Map Legend
        </h3>
        
        <div className="space-y-1.5">
          <LegendItem
            color="#3b82f6"
            label="Your Home"
            icon="🏠"
          />
          <LegendItem
            color="#22c55e"
            label={`Parents (${filteredCount} shown)`}
            icon="👤"
          />
          <LegendItem
            color="#d1d5db"
            label="Parents (outside radius)"
            icon="👤"
            dimmed
          />
          <LegendItem
            color="#f59e0b"
            label="Chadwick School"
            icon="🏫"
          />
          <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/50 mt-2">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
              <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 border border-white" />
            </div>
            <span className="font-medium">🔴</span>
            <span className="text-muted-foreground">Has Active Rides</span>
          </div>
        </div>

        {parentsCount > filteredCount && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            {parentsCount - filteredCount} hidden by filters
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface LegendItemProps {
  color: string;
  label: string;
  icon: string;
  dimmed?: boolean;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, icon, dimmed = false }) => {
  return (
    <div className={`flex items-center gap-2 text-xs ${dimmed ? 'opacity-50' : ''}`}>
      <div
        className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="font-medium">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
};

export default MapLegend;
