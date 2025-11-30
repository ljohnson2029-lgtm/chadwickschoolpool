import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Features from "./pages/Features";
import Safety from "./pages/Safety";
import HowItWorks from "./pages/HowItWorks";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import FamilyCarpools from "./pages/FamilyCarpools";
import EmailVerification from "./pages/EmailVerification";
import AdminVerifiedEmails from "./pages/AdminVerifiedEmails";
import NotFound from "./pages/NotFound";
import FamilyLinks from "./pages/FamilyLinks";
import MapDemo from "./pages/MapDemo";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/setup" element={<ProfileSetup />} />
            <Route path="/family-carpools" element={<FamilyCarpools />} />
            <Route path="/dashboard" element={<FamilyCarpools />} />
            <Route path="/verify-email" element={<EmailVerification />} />
            <Route path="/admin/verified-emails" element={<AdminVerifiedEmails />} />
            <Route path="/family-links" element={<FamilyLinks />} />
            {/* Redirects from old routes */}
            <Route path="/linked-accounts" element={<FamilyLinks />} />
            <Route path="/student-linking" element={<FamilyLinks />} />
            <Route path="/parent-approvals" element={<FamilyLinks />} />
            <Route path="/map" element={<MapDemo />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
