import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useDebounce } from '@/hooks/use-debounce';

export type UsernameStatus =
  | 'idle'        // nothing typed yet
  | 'invalid'     // fails the 3-30 char [a-zA-Z0-9_] format
  | 'checking'    // RPC in flight
  | 'available'   // free to claim
  | 'taken'       // already used by someone else
  | 'error';      // network / RPC failure

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

/**
 * Real-time, debounced username uniqueness check.
 *
 * RLS only lets a user read their own profile row, so a plain SELECT can't
 * detect collisions. This calls the `check_username_available` SECURITY DEFINER
 * RPC (added in migration 20260628120000) instead.
 *
 * `initialUsername` is treated as already-owned by the current user so editing
 * back to it reports "available" rather than "taken".
 */
export function useUsernameAvailability(username: string, initialUsername?: string) {
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const trimmed = username.trim();
  const debounced = useDebounce(trimmed, 450);

  useEffect(() => {
    let cancelled = false;

    if (!debounced) {
      setStatus('idle');
      return;
    }
    if (initialUsername && debounced.toLowerCase() === initialUsername.toLowerCase()) {
      setStatus('available');
      return;
    }
    if (!USERNAME_RE.test(debounced)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    supabase
      .rpc('check_username_available', { p_username: debounced })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStatus('error');
          return;
        }
        setStatus(data ? 'available' : 'taken');
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, initialUsername]);

  // Show "checking" immediately while the debounce settles, so the UI doesn't
  // flash a stale state between keystrokes.
  const settling = trimmed !== debounced && trimmed.length > 0;

  return {
    status: settling && status !== 'invalid' ? 'checking' : status,
    isValidFormat: USERNAME_RE.test(trimmed),
  } as const;
}
