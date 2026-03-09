import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { BlockConfirmDialog } from '../../components/chat/dialogs/BlockConfirmDialog';
import type {
  ConnectionState,
  DirectoryMember,
  DirectorySort,
} from '../../lib/api/directoryApi';
import {
  acceptRequest,
  connectRequest,
  declineRequest,
  disconnect,
  fetchDirectory,
} from '../../lib/api/directoryApi';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { DirectoryFilters } from './directoryFilters';
import { DirectoryResults } from './directoryResults';

const PAGE_SIZE = 25;
const DIRECTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const DIRECTORY_CACHE_KEY_PREFIX = 'directory_cache_v1';

type DirectoryCachePayload = {
  rows: DirectoryMember[];
  hasMore: boolean;
  cachedAt: number;
};

export const Directory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const primaryIndustry = searchParams.get('primary_industry') ?? '';
  const secondaryIndustry = searchParams.get('secondary_industry') ?? '';
  const location = searchParams.get('location') ?? '';
  const skillsParam = searchParams.get('skills') ?? '';
  const connectionStatus = searchParams.get('connection_status') ?? '';
  const sort = searchParams.get('sort') ?? 'recently_active';

  const [showSecondaryIndustryFilter, setShowSecondaryIndustryFilter] =
    useState(false);
  const [rows, setRows] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [blockTarget, setBlockTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [locationInput, setLocationInput] = useState(location);
  const hasInitialDataRef = useRef(false);

  const skills = useMemo(
    () => (skillsParam ? skillsParam.split(',').filter(Boolean) : []),
    [skillsParam],
  );

  const queryCacheKey = useMemo(
    () =>
      JSON.stringify({
        q: q.trim(),
        primaryIndustry,
        secondaryIndustry,
        location,
        skills,
        connectionStatus,
        sort,
      }),
    [
      q,
      primaryIndustry,
      secondaryIndustry,
      location,
      skills,
      connectionStatus,
      sort,
    ],
  );

  const directoryCacheKey = useMemo(
    () =>
      session?.user?.id
        ? `${DIRECTORY_CACHE_KEY_PREFIX}:${session.user.id}:${queryCacheKey}`
        : null,
    [session?.user?.id, queryCacheKey],
  );

  const updateUrl = useCallback(
    (updates: Record<string, string>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([k, v]) =>
          v ? next.set(k, v) : next.delete(k),
        );
        return next;
      });
    },
    [setSearchParams],
  );

  const load = useCallback(
    async (append = false, appendOffset?: number) => {
      if (!session?.user?.id) return;
      const offset = append ? (appendOffset ?? 0) : 0;
      const showInitialLoader = !append && !hasInitialDataRef.current;
      if (!append && showInitialLoader) setLoading(true);
      else setLoadingMore(true);

      setError(null);
      try {
        const { data, hasMore: more } = await fetchDirectory(supabase, {
          q: q.trim() || undefined,
          primary_industry: primaryIndustry || undefined,
          secondary_industry: secondaryIndustry || undefined,
          location: location || undefined,
          skills: skills.length ? skills : undefined,
          connection_status: (connectionStatus as ConnectionState) || undefined,
          sort: (sort || 'recently_active') as DirectorySort,
          offset,
          limit: PAGE_SIZE,
        });
        if (append) setRows((prev) => [...prev, ...data]);
        else {
          setRows(data);
          hasInitialDataRef.current = true;
        }
        setHasMore(more);
      } catch (cause) {
        const msg = toMessage(cause);
        const isSearchContext = q.trim().length > 0;
        const isGenericError =
          msg.includes('Something went wrong') ||
          msg.includes('try again in a moment');
        setError(
          isSearchContext && isGenericError
            ? 'No member found with that name. Please try a different search or try again.'
            : msg,
        );
      } finally {
        if (showInitialLoader) setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      session?.user?.id,
      q,
      primaryIndustry,
      secondaryIndustry,
      location,
      skills,
      connectionStatus,
      sort,
    ],
  );

  useEffect(() => {
    if (secondaryIndustry) setShowSecondaryIndustryFilter(true);
  }, [secondaryIndustry]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(data.session as unknown as { user: { id: string } });
    })();
  }, []);

  useEffect(() => {
    hasInitialDataRef.current = false;
  }, [directoryCacheKey]);

  useEffect(() => {
    if (!directoryCacheKey) return;
    try {
      const raw = sessionStorage.getItem(directoryCacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DirectoryCachePayload;
      if (
        !parsed ||
        !Array.isArray(parsed.rows) ||
        typeof parsed.hasMore !== 'boolean' ||
        typeof parsed.cachedAt !== 'number'
      )
        return;
      if (Date.now() - parsed.cachedAt > DIRECTORY_CACHE_TTL_MS) return;
      queueMicrotask(() => {
        setRows(parsed.rows);
        setHasMore(parsed.hasMore);
        hasInitialDataRef.current = true;
        setLoading(false);
      });
    } catch {
      /* ignore */
    }
  }, [directoryCacheKey]);

  useEffect(() => {
    if (!directoryCacheKey) return;
    try {
      sessionStorage.setItem(
        directoryCacheKey,
        JSON.stringify({ rows, hasMore, cachedAt: Date.now() }),
      );
    } catch {
      /* ignore */
    }
  }, [directoryCacheKey, rows, hasMore]);

  useEffect(() => {
    if (session?.user?.id) void load(false);
  }, [session?.user?.id, load]);

  useEffect(() => {
    setLocationInput(location);
  }, [location]);

  const runAction = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      await load(false);
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const hasActiveFilters = Boolean(
    q.trim() ||
      primaryIndustry ||
      secondaryIndustry ||
      location ||
      connectionStatus ||
      skills.length,
  );

  if (!session && !loading) {
    return (
      <Box
        data-testid="directory-page"
        sx={{
          flex: 1,
          pt: 8,
          pb: 8,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Stack
          alignItems="center"
          spacing={2}
          data-testid="directory-sign-in-prompt"
        >
          <Typography variant="h5">Sign in to browse the Directory</Typography>
          <Button component={RouterLink} to="/" variant="contained">
            Sign in
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      data-testid="directory-page"
      sx={{
        flex: 1,
        minWidth: 0,
        overflowX: 'hidden',
        pt: { xs: 1.5, md: 3 },
        pb: { xs: 4, md: 8 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.25, sm: 2, md: 3 } }}>
        <DirectoryFilters
          q={q}
          primaryIndustry={primaryIndustry}
          secondaryIndustry={secondaryIndustry}
          locationInput={locationInput}
          setLocationInput={setLocationInput}
          skills={skills}
          connectionStatus={connectionStatus}
          sort={sort}
          showSecondaryIndustryFilter={showSecondaryIndustryFilter}
          setShowSecondaryIndustryFilter={setShowSecondaryIndustryFilter}
          hasActiveFilters={hasActiveFilters}
          updateUrl={updateUrl}
        />

        <DirectoryResults
          rows={rows}
          loading={loading}
          error={error}
          setError={setError}
          hasActiveFilters={hasActiveFilters}
          hasMore={hasMore}
          loadingMore={loadingMore}
          busy={busy}
          onLoadMore={() => void load(true, rows.length)}
          onClearFilters={() => {
            updateUrl({
              q: '',
              primary_industry: '',
              secondary_industry: '',
              location: '',
              connection_status: '',
              skills: '',
            });
            setShowSecondaryIndustryFilter(false);
          }}
          onConnect={(id) => runAction(() => connectRequest(supabase, id))}
          onAccept={(id) => runAction(() => acceptRequest(supabase, id))}
          onDecline={(id) => runAction(() => declineRequest(supabase, id))}
          onDisconnect={(member) =>
            setDisconnectTarget({
              id: member.id,
              name: member.display_name || member.handle || 'this member',
            })
          }
          onBlock={(member) =>
            setBlockTarget({
              id: member.id,
              name: member.display_name || member.handle || 'this member',
            })
          }
          onSkillClick={(skill) =>
            updateUrl({
              skills: skills.includes(skill)
                ? skills.join(',')
                : [...skills, skill].join(','),
            })
          }
        />
      </Container>

      <Dialog
        open={Boolean(disconnectTarget)}
        onClose={() => setDisconnectTarget(null)}
      >
        <DialogTitle>Disconnect from {disconnectTarget?.name}</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove your connection. You can reconnect later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() =>
              void runAction(async () => {
                if (!disconnectTarget) return;
                await disconnect(supabase, disconnectTarget.id);
                setDisconnectTarget(null);
              })
            }
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <BlockConfirmDialog
        open={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        onConfirm={async () => {
          if (!blockTarget || !session?.user?.id) return;
          setBusy(true);
          try {
            await supabase.from('chat_blocks').insert({
              blocker_id: session.user.id,
              blocked_user_id: blockTarget.id,
            });
            await disconnect(supabase, blockTarget.id);
            setRows((prev) => prev.filter((r) => r.id !== blockTarget.id));
            setBlockTarget(null);
          } catch (cause) {
            setError(toMessage(cause));
          } finally {
            setBusy(false);
          }
        }}
        displayName={blockTarget?.name}
      />
    </Box>
  );
};
