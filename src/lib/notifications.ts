import { supabase } from '@/integrations/supabase/client';

export const createNotification = async (
  userId: string,
  type: string,
  message: string,
  linkId?: string
) => {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      message,
      link_id: linkId || null,
      is_read: false,
    });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
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
};
