import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { supabase } from '../../../lib/auth/supabaseClient';
import type { SearchMatch } from './NavbarSearch';

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_MATCHES = 8;
export const SEARCH_MAX_QUERY_CHARS = 500;
const SEARCH_DEBOUNCE_MS = 300;

type UseNavbarSearchArgs = {
  showAuthedHeader: boolean;
  searchAnchorEl: HTMLElement | null;
  searchPopperRef: RefObject<HTMLDivElement | null>;
};

export const useNavbarSearch = ({
  showAuthedHeader,
  searchAnchorEl,
  searchPopperRef,
}: UseNavbarSearchArgs) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSearchDropdown = useCallback(() => {
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchAnchorEl?.contains(target) ||
        searchPopperRef.current?.contains(target)
      )
        return;
      closeSearchDropdown();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchOpen, searchAnchorEl, closeSearchDropdown, searchPopperRef]);

  useEffect(() => {
    if (!showAuthedHeader) {
      setSearchMatches([]);
      setSearchOpen(false);
      setSearchLoading(false);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }
    const term = searchQuery.trim().toLowerCase();
    if (term.length < SEARCH_MIN_LENGTH) {
      setSearchMatches([]);
      setSearchOpen(false);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      searchDebounceRef.current = null;
      setSearchLoading(true);
      setSearchOpen(true);
      let list: SearchMatch[] = [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .limit(200);
      if (!error && data) {
        list = data as SearchMatch[];
      }
      const filtered = list
        .filter((p) => {
          const h = (p.handle || '').toLowerCase();
          const n = (p.display_name || '').toLowerCase();
          return h.includes(term) || n.includes(term);
        })
        .slice(0, SEARCH_MAX_MATCHES);
      setSearchMatches(filtered);
      setSearchLoading(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, showAuthedHeader]);

  return {
    searchQuery,
    setSearchQuery,
    searchMatches,
    searchLoading,
    searchOpen,
    setSearchOpen,
    closeSearchDropdown,
  };
};
