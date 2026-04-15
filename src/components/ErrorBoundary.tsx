import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary - Catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    logger.error('ErrorBoundary caught error:', error);
    logger.error('Component stack:', errorInfo.componentStack);
    
    this.setState({ error, errorInfo });
    
    // In production, you could send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">
                We apologize for the inconvenience. Our team has been notified of this issue.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-muted rounded p-3 text-xs font-mono overflow-auto max-h-32">
                  <p className="font-semibold text-destructive">{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-muted-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleReset} variant="default" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <div className="flex gap-2">
                  <Button onClick={this.handleReload} variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Smaller error boundary for individual sections
 * Shows inline error message instead of full page
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('SectionErrorBoundary caught error:', error);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-destructive">
                Failed to load this section
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Something went wrong displaying this content.
              </p>
              <Button 
                onClick={this.handleReset} 
                variant="ghost" 
                size="sm" 
                className="mt-2 h-7 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to use error boundaries programmatically
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    logger.error('Captured error:', error);
    if (errorInfo) {
      logger.error('Component stack:', errorInfo.componentStack);
    }
  }, []);
}
