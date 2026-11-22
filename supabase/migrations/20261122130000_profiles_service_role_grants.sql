-- New Supabase projects don't grant table privileges to service_role by default, so the API
-- routes' admin client (premium checks, start-trial) failed with "profile read failed" on a
-- fresh project. Grant exactly what the server needs (no delete), and drop table privileges the
-- client roles never need. RLS still governs what anon/authenticated can see and change.
grant select, insert, update on public.profiles to service_role;
revoke truncate, references, trigger on public.profiles from anon, authenticated;
