-- Allow authenticated users to update their own notification/marketing preferences.
-- RLS still scopes updates to auth.uid() = profiles.id via profiles_authenticated_update.
do $$
declare
  required_columns constant text[] := array[
    'push_enabled',
    'email_notifications_enabled',
    'marketing_email_enabled',
    'marketing_opt_in',
    'marketing_opt_in_timestamp',
    'marketing_source',
    'marketing_product_updates',
    'marketing_events',
    'marketing_push_enabled',
    'consent_updated_at'
  ];
  present_columns_count int;
begin
  select count(*)
  into present_columns_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = any (required_columns);

  if present_columns_count = array_length(required_columns, 1) then
    execute $grant$
      grant update (
        push_enabled,
        email_notifications_enabled,
        marketing_email_enabled,
        marketing_opt_in,
        marketing_opt_in_timestamp,
        marketing_source,
        marketing_product_updates,
        marketing_events,
        marketing_push_enabled,
        consent_updated_at
      ) on table public.profiles to authenticated
    $grant$;
  end if;
end $$;
