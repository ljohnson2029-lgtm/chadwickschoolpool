import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, CheckCircle, AlertCircle, Clock, Car, ArrowRight } from 'lucide-react';
import { parseRideRequest, type ParsedRideRequest, QUICK_REPLIES } from '@/lib/naturalLanguageParser';
import { autoCompleteRideDetails, type GradeLevel } from '@/lib/smartSchedule';
import { useAuth } from '@/contexts/AuthContext';

interface SmartRideFormProps {
  userChildren: Array<{
    id: string;
    name: string;
    grade: GradeLevel;
  }>;
  userLocation?: { lat: number; lng: number };
  onSubmit: (rideData: {
    type: 'request' | 'offer';
    date: string;
    time: string;
    childId: string;
    notes?: string;
  }) => void;
  onCancel?: () => void;
}

export function SmartRideForm({ userChildren, userLocation, onSubmit, onCancel }: SmartRideFormProps) {
  const { } = useAuth();
  const [naturalInput, setNaturalInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedRideRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [smartSuggestion, setSmartSuggestion] = useState<{
    time: string;
    explanation: string;
  } | null>(null);

  // Process natural language input with debounce
  useEffect(() => {
    if (!naturalInput.trim()) {
      setParsedResult(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsProcessing(true);
      const childrenWithGrades = userChildren.map(c => ({
        name: c.name,
        grade: c.grade
      }));
      
      const result = parseRideRequest(naturalInput, childrenWithGrades, userLocation);
      setParsedResult(result);
      
      // Auto-select child if found
      if (result.childName) {
        const child = userChildren.find(c => c.name === result.childName);
        if (child) {
          setSelectedChildId(child.id);
          
          // Generate smart time suggestion
          if (userLocation && result.dayOfWeek !== undefined) {
            const today = new Date();
            const targetDay = result.dayOfWeek;
            const daysUntil = (targetDay - today.getDay() + 7) % 7;
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
            
            const suggestion = autoCompleteRideDetails(
              child.grade,
              targetDate,
              result.action === 'dropoff' ? 'dropoff' : 'pickup',
              userLocation
            );
            setSmartSuggestion({ time: suggestion.suggestedTime, explanation: suggestion.explanation });
          }
        }
      }
      
      setIsProcessing(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [naturalInput, userChildren, userLocation]);

  const handleSubmit = useCallback(() => {
    if (!parsedResult || !selectedChildId) return;
    
    const today = new Date();
    const targetDay = parsedResult.dayOfWeek ?? 1; // Default to Monday
    const daysUntil = (targetDay - today.getDay() + 7) % 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    
    const dateStr = targetDate.toISOString().split('T')[0];
    const timeStr = parsedResult.time || smartSuggestion?.time || '15:15';
    
    onSubmit({
      type: parsedResult.rideType,
      date: dateStr,
      time: timeStr,
      childId: selectedChildId,
      notes: naturalInput
    });
  }, [parsedResult, selectedChildId, smartSuggestion, naturalInput, onSubmit]);

  const canSubmit = parsedResult && 
    parsedResult.confidence >= 40 && 
    selectedChildId && 
    (parsedResult.time || smartSuggestion);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Smart Ride Creator
        </CardTitle>
        <CardDescription>
          Just type what you need in plain English. We'll figure out the details.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Natural Language Input */}
        <div className="space-y-2">
          <Label htmlFor="natural-input">
            What do you need?
          </Label>
          <div className="relative">
            <Input
              id="natural-input"
              placeholder="e.g., 'I need pickup for Tommy on Monday at 3:15' or 'Can drive to school Tuesday morning'"
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              className="pr-10 text-base"
            />
            {isProcessing && (
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary animate-pulse" />
            )}
          </div>
          
          {/* Quick examples */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Try:</span>
            <button
              onClick={() => setNaturalInput("I need pickup for " + (userChildren[0]?.name || "my child") + " on Monday at 3:15")}
              className="text-primary hover:underline"
            >
              "Pickup on Monday at 3:15"
            </button>
            <button
              onClick={() => setNaturalInput("Can drive to school every Wednesday morning")}
              className="text-primary hover:underline"
            >
              "Drive every Wednesday"
            </button>
          </div>
        </div>

        {/* Parsed Results */}
        {parsedResult && parsedResult.parsedFields.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">We understood:</span>
              <Badge 
                variant={parsedResult.confidence >= 70 ? 'default' : parsedResult.confidence >= 40 ? 'secondary' : 'destructive'}
              >
                {parsedResult.confidence}% confidence
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {parsedResult.parsedFields.map((field, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {field}
                </Badge>
              ))}
            </div>
            
            {/* Smart Suggestion */}
            {smartSuggestion && (
              <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Smart Suggestion: {smartSuggestion.time}</p>
                    <p className="text-xs text-muted-foreground">{smartSuggestion.explanation}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Missing Fields */}
            {parsedResult.missingFields.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-amber-600 mb-1">Need to clarify:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {parsedResult.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Child Selection (if not auto-detected) */}
        {(!parsedResult?.childName || userChildren.length > 1) && (
          <div className="space-y-2">
            <Label>Which child?</Label>
            <div className="flex flex-wrap gap-2">
              {userChildren.map((child) => (
                <Button
                  key={child.id}
                  type="button"
                  variant={selectedChildId === child.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChildId(child.id)}
                  className="flex items-center gap-2"
                >
                  {selectedChildId === child.id && <CheckCircle className="h-3 w-3" />}
                  {child.name}
                  <span className="text-xs opacity-70">(Grade {child.grade})</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {parsedResult?.rideType === 'request' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Messages</Label>
            <div className="flex flex-wrap gap-1">
              {QUICK_REPLIES.confirmation.slice(0, 2).map((reply) => (
                <Button
                  key={reply.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setNaturalInput(prev => prev + " " + reply.message)}
                >
                  {reply.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit}
            className="gap-2"
          >
            {parsedResult?.rideType === 'offer' ? (
              <>
                <Car className="h-4 w-4" />
                Post Ride Offer
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                Request Ride
              </>
            )}
          </Button>
        </div>

        {/* Show Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="text-xs text-muted-foreground space-y-1 p-2 bg-muted rounded">
            <p>💡 <strong>Tips for best results:</strong></p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Include your child's name</li>
              <li>Mention specific day (Monday, Tuesday, etc.)</li>
              <li>Add time ("at 3:15 PM")</li>
              <li>Say "offering" if you can drive others</li>
              <li>Say "need" or "looking for" if you need help</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
