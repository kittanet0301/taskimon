-- Deprecate insecure password reset flow that set passwords to birth dates.
-- Clients should use supabase.auth.resetPasswordForEmail() instead.

revoke all on function public.reset_password_by_birthdate(text) from public;
revoke all on function public.reset_password_by_birthdate(text) from anon;
revoke all on function public.reset_password_by_birthdate(text) from authenticated;

comment on function public.reset_password_by_birthdate(text) is
  'Deprecated. Use Supabase password recovery emails instead of resetting to birth dates.';
