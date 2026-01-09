-- Performance optimization indexes

-- profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(home_latitude, home_longitude) WHERE home_latitude IS NOT NULL AND home_longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_show_on_map ON public.profiles(show_on_map) WHERE show_on_map = true;

-- rides table indexes
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON public.rides(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_status_date ON public.rides(status, ride_date);
CREATE INDEX IF NOT EXISTS idx_rides_transaction_type_status ON public.rides(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_rides_active_future ON public.rides(ride_date, ride_time) WHERE status = 'active';

-- account_links table indexes
CREATE INDEX IF NOT EXISTS idx_account_links_student_id ON public.account_links(student_id);
CREATE INDEX IF NOT EXISTS idx_account_links_parent_id ON public.account_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_account_links_status ON public.account_links(status);
CREATE INDEX IF NOT EXISTS idx_account_links_student_status ON public.account_links(student_id, status);
CREATE INDEX IF NOT EXISTS idx_account_links_parent_status ON public.account_links(parent_id, status);

-- private_ride_requests table indexes
CREATE INDEX IF NOT EXISTS idx_private_requests_sender_id ON public.private_ride_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_requests_recipient_id ON public.private_ride_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_private_requests_status ON public.private_ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_private_requests_date ON public.private_ride_requests(ride_date);
CREATE INDEX IF NOT EXISTS idx_private_requests_sender_status ON public.private_ride_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_private_requests_recipient_status ON public.private_ride_requests(recipient_id, status);

-- ride_conversations table indexes
CREATE INDEX IF NOT EXISTS idx_ride_conversations_sender_id ON public.ride_conversations(sender_id);
CREATE INDEX IF NOT EXISTS idx_ride_conversations_recipient_id ON public.ride_conversations(recipient_id);
CREATE INDEX IF NOT EXISTS idx_ride_conversations_status ON public.ride_conversations(status);
CREATE INDEX IF NOT EXISTS idx_ride_conversations_ride_id ON public.ride_conversations(ride_id);

-- notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- user_roles table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- student_parent_links table indexes
CREATE INDEX IF NOT EXISTS idx_student_parent_links_student_id ON public.student_parent_links(student_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_links_parent_id ON public.student_parent_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_parent_links_status ON public.student_parent_links(status);