import type { User } from '@supabase/supabase-js';

const DEFAULT_ADMIN_EMAILS = ['camjofficial@gmail.com'];

function configuredAdminEmails(): string[] {
  const configured = import.meta.env.VITE_ADMIN_EMAILS ?? '';
  return configured
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminEmails(): string[] {
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...configuredAdminEmails()]));
}

export function isAdminUser(user: User | null): boolean {
  if (!user?.email) return false;
  const email = user.email.toLowerCase();
  const metadata = user.app_metadata as Record<string, unknown> | undefined;
  return getAdminEmails().includes(email) || metadata?.admin === true;
}
