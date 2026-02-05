 import { useNavigate, useLocation } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { MessageSquarePlus } from 'lucide-react';
 import { useAuth } from '@/contexts/AuthContext';
 import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
 } from '@/components/ui/tooltip';
 
 const FloatingFeedbackButton = () => {
   const navigate = useNavigate();
   const location = useLocation();
   const { user } = useAuth();
 
   // Don't show on feedback page or if not logged in
   if (!user || location.pathname === '/feedback') return null;
 
   return (
     <div className="fixed bottom-24 md:bottom-6 right-4 z-40">
       <Tooltip>
         <TooltipTrigger asChild>
           <Button
             onClick={() => navigate('/feedback')}
             size="icon"
             className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:scale-105 transition-all"
           >
             <MessageSquarePlus className="h-5 w-5" />
             <span className="sr-only">Give Feedback</span>
           </Button>
         </TooltipTrigger>
         <TooltipContent side="left">
           <p>Give Feedback</p>
         </TooltipContent>
       </Tooltip>
     </div>
   );
 };
 
 export default FloatingFeedbackButton;