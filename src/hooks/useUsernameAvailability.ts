import { useEffect, useState } from 'react';
import { db, storage } from '@/db/firebase';
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
    const q = query(
      collection(db, 'profiles'),
      where('username', '==', debounced),
      limit(1)
    );

    getDocs(q)
      .then((snapshot) => {
        if (cancelled) return;
        setStatus(snapshot.empty ? 'available' : 'taken');
      })
      .catch((error) => {
        console.error(error);
        if (cancelled) return;
        setStatus('error');
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
