import { describe, expect, it } from 'vitest';
import { isAdminUser } from './adminAccess';

describe('admin access', () => {
  it('allows the owner email', () => {
    expect(isAdminUser({ email: 'camjofficial@gmail.com', app_metadata: {} } as never)).toBe(true);
  });

  it('allows explicit Supabase app metadata admins', () => {
    expect(isAdminUser({ email: 'ops@example.com', app_metadata: { admin: true } } as never)).toBe(true);
  });

  it('denies normal users', () => {
    expect(isAdminUser({ email: 'user@example.com', app_metadata: {} } as never)).toBe(false);
  });
});
