import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ParentOnlyRoute from "./components/ParentOnlyRoute";
import SplashScreen from "./components/SplashScreen";

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// Lazy load non-critical pages
const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Safety = lazy(() => import("./pages/Safety"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const FamilyCarpools = lazy(() => import("./pages/FamilyCarpools"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const AdminVerifiedEmails = lazy(() => import("./pages/AdminVerifiedEmails"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FamilyLinks = lazy(() => import("./pages/FamilyLinks"));
const MapDemo = lazy(() => import("./pages/MapDemo"));
const MyPrivateRequests = lazy(() => import("./pages/MyPrivateRequests"));
const Settings = lazy(() => import("./pages/Settings"));
const FindRides = lazy(() => import("./pages/FindRides"));
const PostRide = lazy(() => import("./pages/PostRide"));
const Conversations = lazy(() => import("./pages/Conversations"));
const MyRides = lazy(() => import("./pages/MyRides"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Help = lazy(() => import("./pages/Help"));
const Feedback = lazy(() => import("./pages/Feedback"));

// Loading component for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

// Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/carpools" element={<FamilyCarpools />} />
        <Route path="/carpools/create" element={<FamilyCarpools />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/setup" element={<ProfileSetup />} />
        <Route path="/family-carpools" element={<FamilyCarpools />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/admin/verified-emails" element={<AdminVerifiedEmails />} />
        <Route path="/family-links" element={<FamilyLinks />} />
        {/* Redirects from old routes */}
        <Route path="/linked-accounts" element={<FamilyLinks />} />
        <Route path="/student-linking" element={<FamilyLinks />} />
        <Route path="/parent-approvals" element={<FamilyLinks />} />
        <Route path="/map" element={<MapDemo />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/help" element={<Help />} />
        <Route path="/feedback" element={<Feedback />} />
        
        {/* Rides - accessible to all but with permission differences */}
        <Route path="/find-rides" element={<FindRides />} />
        <Route path="/post-ride" element={
          <ParentOnlyRoute><PostRide /></ParentOnlyRoute>
        } />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/my-rides" element={<MyRides />} />
        
        {/* Parent-only routes */}
        <Route path="/requests/private" element={
          <ParentOnlyRoute><MyPrivateRequests /></ParentOnlyRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;