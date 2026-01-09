import { supabase } from '@/integrations/supabase/client';

export const createNotification = async (
  userId: string,
  type: string,
  message: string,
  linkId?: string
) => {
  // Use edge function to create notifications securely
  // This allows authenticated users to create notifications for other users
  // without exposing an overly permissive RLS policy
  const { data: sessionData } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-notification`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session?.access_token || ''}`,
      },
      body: JSON.stringify({
        userId,
        type,
        message,
        linkId: linkId || null,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('Error creating notification:', errorData);
    throw new Error(errorData.error || 'Failed to create notification');
  }
};

export const NotificationMessages = {
  // Student notifications
  linkRequestSent: (parentEmail: string) => 
    `✓ Link request sent to ${parentEmail}`,
  
  linkApproved: (parentName: string) => 
    `✅ ${parentName} approved your link! You can now view their carpools.`,
  
  linkDenied: (parentName: string) => 
    `❌ ${parentName} denied your link request`,
  
  unlinkedByParent: (parentName: string) => 
    `⚠️ ${parentName} removed you from their account`,

  // Parent notifications
  linkRequest: (studentName: string, studentEmail: string) => 
    `🔗 ${studentName} (${studentEmail}) wants to link to your account`,
  
  studentUnlinked: (studentName: string) => 
    `ℹ️ ${studentName} has unlinked from your account`,

  // Co-parent notifications
  coParentRequest: (requesterName: string) => 
    `👥 ${requesterName} wants to link as a co-parent`,
  
  coParentApproved: (approverName: string) => 
    `✅ ${approverName} approved your co-parent request`,
  
  coParentDenied: (denier: string) => 
    `❌ ${denier} denied your co-parent request`,
};
