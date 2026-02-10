// src/pages/Feed.tsx
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { DirectoryCard } from '../components/directory/DirectoryCard';
import { getSupabaseAnonOnly, supabase } from '../lib/supabaseClient';
import { CARD_BG, PROFILE_BG } from '../theme/candyStyles';
import { safeStr } from '../utils/stringUtils';

type FeedProfile = {
  id: string;
  handle: string | null;
  pronouns: string | null;
  nerd_creds: unknown;
  socials: unknown;
};

const getTagline = (nerdCreds: unknown): string => {
  if (!nerdCreds || typeof nerdCreds !== 'object') return '';
  const obj = nerdCreds as Record<string, unknown>;
  return safeStr(obj.tagline) || safeStr(obj.additionalContext);
};

export const Feed = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [rows, setRows] = useState<FeedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Wait for session (OAuth callback can set it shortly after redirect)
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setSession(data.session);
        setSessionChecked(true);
        return;
      }
      // Give auth state time to settle after redirect (e.g. from callback)
      await new Promise((r) => setTimeout(r, 400));
      const { data: retry } = await supabase.auth.getSession();
      if (cancelled) return;
      if (retry.session) {
        setSession(retry.session);
      } else {
        navigate('/', { replace: true });
      }
      setSessionChecked(true);
    };

    void check();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (!cancelled && s) setSession(s);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const client = getSupabaseAnonOnly();
      try {
        const { data, error } = await client
          .from('profiles')
          .select('id, handle, pronouns, nerd_creds, socials')
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(15);

        if (cancelled) return;
        if (error) {
          const { data: fallback } = await client
            .from('profiles')
            .select('id, handle, pronouns, nerd_creds, socials')
            .order('updated_at', { ascending: false })
            .limit(15);
          if (!cancelled) setRows((fallback as FeedProfile[]) ?? []);
        } else {
          setRows((data as FeedProfile[]) ?? []);
        }
      } catch {
        if (!cancelled) {
          try {
            const { data: minimal } = await client
              .from('profiles')
              .select('id, handle, pronouns, nerd_creds')
              .limit(15);
            setRows((minimal as FeedProfile[]) ?? []);
          } catch {
            setRows([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!sessionChecked || !session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={48} aria-label="Loading feed" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: PROFILE_BG,
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed',
        pt: 12,
        pb: 8,
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: CARD_BG,
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'white', mb: 1 }}
            >
              Your feed
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Recent activity from the guild. Head to the directory to search,
              or your dashboard to edit your profile.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              useFlexGap
            >
              <Button
                component={RouterLink}
                to="/dashboard"
                variant="contained"
                startIcon={<DashboardIcon />}
                sx={{ flex: { xs: 'none', sm: 1 }, minWidth: 140 }}
              >
                Dashboard
              </Button>
              <Button
                component={RouterLink}
                to="/directory"
                variant="outlined"
                startIcon={<PersonSearchIcon />}
                sx={{
                  flex: { xs: 'none', sm: 1 },
                  minWidth: 140,
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                Directory
              </Button>
              <Button
                component={RouterLink}
                to="/weirdling/create"
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                sx={{
                  flex: { xs: 'none', sm: 1 },
                  minWidth: 140,
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                Create Weirdling
              </Button>
            </Stack>
          </Paper>

          <Box>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: 'white', mb: 2 }}
            >
              Recent from the guild
            </Typography>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={40} />
              </Box>
            ) : rows.length === 0 ? (
              <Paper
                sx={{
                  p: 6,
                  textAlign: 'center',
                  borderRadius: 3,
                  bgcolor: 'rgba(18,18,18,0.8)',
                  border: '2px dashed rgba(255,255,255,0.1)',
                }}
              >
                <Typography color="text.secondary">
                  No verified members yet. Be the first — finish your profile
                  and get approved, or browse the directory.
                </Typography>
                <Button
                  component={RouterLink}
                  to="/directory"
                  variant="outlined"
                  sx={{ mt: 2 }}
                >
                  Open directory
                </Button>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {rows.map((p) => (
                  <DirectoryCard
                    key={p.id}
                    id={p.id}
                    handle={p.handle}
                    pronouns={p.pronouns}
                    tagline={getTagline(p.nerd_creds)}
                    socials={Array.isArray(p.socials) ? p.socials : undefined}
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};
