
CREATE OR REPLACE FUNCTION public.get_top_connections(current_user_id UUID, result_limit INT DEFAULT 5)
RETURNS TABLE(
  connected_user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  account_type TEXT,
  message_count BIGINT,
  shared_rides BIGINT,
  connection_score BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_counts AS (
    -- Count ride_conversations exchanged with each user
    SELECT
      CASE WHEN rc.sender_id = current_user_id THEN rc.recipient_id ELSE rc.sender_id END AS other_user,
      COUNT(*) AS msgs,
      COUNT(DISTINCT rc.ride_id) AS conv_rides
    FROM public.ride_conversations rc
    WHERE rc.sender_id = current_user_id OR rc.recipient_id = current_user_id
    GROUP BY other_user
  ),
  private_counts AS (
    -- Count accepted private ride requests shared
    SELECT
      CASE WHEN pr.sender_id = current_user_id THEN pr.recipient_id ELSE pr.sender_id END AS other_user,
      COUNT(*) AS priv_rides
    FROM public.private_ride_requests pr
    WHERE (pr.sender_id = current_user_id OR pr.recipient_id = current_user_id)
      AND pr.status IN ('accepted', 'completed')
    GROUP BY other_user
  ),
  combined AS (
    SELECT
      COALESCE(cc.other_user, pc.other_user) AS other_user,
      COALESCE(cc.msgs, 0) AS msgs,
      (COALESCE(cc.conv_rides, 0) + COALESCE(pc.priv_rides, 0)) AS rides,
      (COALESCE(cc.msgs, 0) + (COALESCE(cc.conv_rides, 0) + COALESCE(pc.priv_rides, 0)) * 5) AS score
    FROM conversation_counts cc
    FULL OUTER JOIN private_counts pc ON cc.other_user = pc.other_user
  )
  SELECT
    combined.other_user AS connected_user_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.username) AS full_name,
    p.avatar_url,
    p.account_type,
    combined.msgs AS message_count,
    combined.rides AS shared_rides,
    combined.score AS connection_score
  FROM combined
  JOIN public.profiles p ON p.id = combined.other_user
  WHERE combined.score > 0
  ORDER BY combined.score DESC
  LIMIT result_limit;
END;
$$;
