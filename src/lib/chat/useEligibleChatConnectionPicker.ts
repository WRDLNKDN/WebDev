import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../auth/supabaseClient';
import {
  loadEligibleChatConnections,
  type EligibleChatConnection,
} from './loadEligibleChatConnections';

function filterEligibleChatConnections(
  connections: EligibleChatConnection[],
  searchQuery: string,
): EligibleChatConnection[] {
  if (!searchQuery.trim()) return connections;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  return connections.filter(
    (connection) =>
      (connection.display_name ?? '').toLowerCase().includes(normalizedQuery) ||
      (connection.handle ?? '').toLowerCase().includes(normalizedQuery) ||
      (connection.email ?? '').toLowerCase().includes(normalizedQuery),
  );
}

export function useEligibleChatConnectionPicker(open: boolean): {
  connections: EligibleChatConnection[];
  filteredConnections: EligibleChatConnection[];
  loadingConnections: boolean;
  loadError: string | null;
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  searchQuery: string;
  setLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
} {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [connections, setConnections] = useState<EligibleChatConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConnections = useMemo(
    () => filterEligibleChatConnections(connections, searchQuery),
    [connections, searchQuery],
  );

  useEffect(() => {
    if (!open) return;
    setSearchQuery('');
    setLoadError(null);
    let cancelled = false;
    setLoadingConnections(true);

    const loadConnections = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user || cancelled) {
          setConnections([]);
          return;
        }

        const eligibleConnections = await loadEligibleChatConnections(
          session.user.id,
        );
        if (cancelled) return;
        setConnections(eligibleConnections);
      } catch {
        if (!cancelled) {
          setLoadError('Could not load connections. Try again.');
          setConnections([]);
        }
      } finally {
        if (!cancelled) setLoadingConnections(false);
      }
    };

    void loadConnections();

    return () => {
      cancelled = true;
      setLoadingConnections(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open || connections.length === 0) return;
    const focusHandle = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(focusHandle);
  }, [connections.length, open]);

  return {
    connections,
    filteredConnections,
    loadingConnections,
    loadError,
    searchInputRef,
    searchQuery,
    setLoadError,
    setSearchQuery,
  };
}
