CREATE OR REPLACE FUNCTION public.social_is_conversation_member(target_conversation uuid, target_user uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select coalesce(target_user=auth.uid(),false) and exists(select 1 from public.social_conversation_members where conversation_id=target_conversation and user_id=target_user);
$function$


CREATE OR REPLACE FUNCTION public.social_is_room_member(target_room uuid, target_user uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select coalesce(target_user=auth.uid(),false) and exists(select 1 from public.social_room_members where room_id=target_room and user_id=target_user);
$function$

