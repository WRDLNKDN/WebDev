// src/pages/MyRegistration.tsx
//
// "My Registration" page:
// - Signed-in users can create/update their own profile row in `public.profiles`.
// - Status/timestamps may be missing from *generated types* if they haven't been regenerated.
//   So we treat moderation/timestamp fields as OPTIONAL and guard usage.
// - Users must NOT be able to update status (moderation-controlled).

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/supabase';

type BaseProfileRow = Database['public']['Tables']['profiles']['Row'];
type BaseProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type BaseProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Your DB/migrations likely include these fields, but your generated types may not.
// Make them optional so the UI compiles either way.
type ModerationFields = Partial<{
  status: string;
  created_at: string;
  updated_at: string; // some schemas type this as string, some as string|null
  reviewed_at: string | null;
  reviewed_by: string | null;
}>;

type ProfileRow = BaseProfileRow & ModerationFields;

const toMessage = (e: unknown) => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Something went wrong';
};

const statusLabel = (status: string | undefined) => {
  switch (status) {
    case 'approved':
      return 'Approved (visible in directory)';
    case 'rejected':
      return 'Rejected (not visible publicly)';
    case 'disabled':
      return 'Disabled (not visible publicly)';
    case 'pending':
      return 'Pending review (not visible publicly yet)';
    default:
      // If status column isn't present in types/DB, just show a sane fallback.
      return 'Pending review (not visible publicly yet)';
  }
};

const formatDate = (value: unknown) => {
  // Handles: string | null | undefined safely
  if (typeof value !== 'string' || !value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
};

export const MyRegistration = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [row, setRow] = useState<ProfileRow | null>(null);

  // Phase 1 fields (expand later)
  const [handle, setHandle] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [geekCreds, setGeekCreds] = useState(''); // comma-separated

  const canSubmit = useMemo(() => handle.trim().length >= 3, [handle]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      if (!user) {
        setUserId(null);
        setRow(null);
        return;
      }

      setUserId(user.id);

      // Use select('*') so we don't get TS grief if your generated types don't match a custom select list.
      // Then treat moderation fields as optional.
      const { data, error: selErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (selErr) throw selErr;

      const typed = (data as ProfileRow | null) ?? null;
      setRow(typed);

      setHandle(typed?.handle ?? '');
      setPronouns((typed as any)?.pronouns ?? '');
      setGeekCreds(((typed as any)?.geek_creds ?? []).join(', '));
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error('You must be signed in to register.');

      const cleanedHandle = handle.trim();
      const creds = geekCreds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // DO NOT include status/review fields here.
      // Those are moderation-controlled and should be blocked by RLS/grants/triggers.
      const safeFields = {
        handle: cleanedHandle,
        pronouns: pronouns.trim() || null,
        geek_creds: creds.length ? creds : null,
      };

      if (!row) {
        const insertPayload: BaseProfileInsert = {
          id: user.id,
          handle: cleanedHandle,
          // These fields may or may not exist in your Insert type depending on generated schema
          ...(safeFields as unknown as Partial<BaseProfileInsert>),
        };

        const { data, error: insErr } = await supabase
          .from('profiles')
          .insert(insertPayload)
          .select('*')
          .single();

        if (insErr) throw insErr;

        setRow((data as ProfileRow) ?? null);
        setNotice('Registration submitted! Your profile is now pending review.');
      } else {
        const updatePayload: BaseProfileUpdate = safeFields as unknown as BaseProfileUpdate;

        const { data, error: updErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id)
          .select('*')
          .single();

        if (updErr) throw updErr;

        setRow((data as ProfileRow) ?? null);
        setNotice('Saved! Your updated info was submitted.');
      }
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography>Loading…</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            My registration
          </Typography>

          {!userId ? (
            <Alert severity="warning">
              You are not signed in. Sign in first to submit a registration.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {row
                  ? `Status: ${statusLabel(row.status)}`
                  : 'No registration found yet. Submit your profile to request approval.'}
              </Typography>

              <Divider />

              {error && <Alert severity="error">{error}</Alert>}
              {notice && <Alert severity="success">{notice}</Alert>}

              <Stack spacing={2}>
                <TextField
                  label="Handle"
                  placeholder="nickthedevopsguy"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  helperText="Required. At least 3 characters."
                  error={handle.trim().length > 0 && handle.trim().length < 3}
                  fullWidth
                />

                <TextField
                  label="Pronouns"
                  placeholder="they/them"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  fullWidth
                />

                <TextField
                  label="Geek creds"
                  placeholder="kubernetes, devops, memes"
                  value={geekCreds}
                  onChange={(e) => setGeekCreds(e.target.value)}
                  helperText="Comma-separated for now."
                  fullWidth
                />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => void onSave()}
                    disabled={!userId || saving || !canSubmit}
                  >
                    {row ? 'Save changes' : 'Submit registration'}
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => void load()}
                    disabled={saving}
                  >
                    Refresh
                  </Button>
                </Box>

                {/* Timestamps are optional depending on generated schema */}
                {row && (
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Created: {formatDate((row as any).created_at)} • Last updated:{' '}
                    {formatDate((row as any).updated_at)}
                  </Typography>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};

export default MyRegistration;