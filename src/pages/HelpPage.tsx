import ChatIcon from '@mui/icons-material/Chat';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const CONTACT_EMAIL = 'info@wrdlnkdn.com';
const PROFILE_BASE = 'https://wrdlnkdn.com/profile/';

const HELP_TYPES = [
  'Account and sign-in',
  'Profile and settings',
  'Feed and posting',
  'Connections and messaging',
  'Directory and search',
  'Groups and events',
  'Bug report',
  'Safety, moderation, or policy',
  'Billing, donations, or merch',
  'Partnership or sponsorship',
  'Feature request',
  'Other',
] as const;

type HelpType = (typeof HELP_TYPES)[number];

/**
 * Help / Contact us page – prefills for signed-in users, Help Type dropdown,
 * Chat CTA, response disclaimer, mailto with success/error handling.
 */
export const HelpPage = () => {
  const [session, setSession] = useState<{
    user: { id: string; email?: string };
    user_metadata?: { full_name?: string };
  } | null>(null);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [helpType, setHelpType] = useState<HelpType | ''>('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const s = data.session;
      if (s?.user) {
        setSession({
          user: { id: s.user.id, email: s.user.email ?? undefined },
          user_metadata: s.user.user_metadata as { full_name?: string },
        });
        const displayName =
          (s.user.user_metadata?.full_name as string) ??
          (s.user.user_metadata?.name as string) ??
          s.user.email?.split('@')[0] ??
          '';
        const emailVal = s.user.email ?? '';
        setName(displayName);
        setEmail(emailVal);

        const { data: profile } = await supabase
          .from('profiles')
          .select('handle')
          .eq('id', s.user.id)
          .maybeSingle();
        if (!cancelled && profile?.handle) setProfileHandle(profile.handle);
      }
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      if (cancelled) return;
      if (!newSession?.user) {
        setSession(null);
        setProfileHandle(null);
        setName('');
        setEmail('');
        return;
      }
      setSession({
        user: {
          id: newSession.user.id,
          email: newSession.user.email ?? undefined,
        },
        user_metadata: newSession.user.user_metadata as { full_name?: string },
      });
      const displayName =
        (newSession.user.user_metadata?.full_name as string) ??
        (newSession.user.user_metadata?.name as string) ??
        newSession.user.email?.split('@')[0] ??
        '';
      setName(displayName);
      setEmail(newSession.user.email ?? '');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpType) return;
    setSubmitting(true);

    const subject = encodeURIComponent(
      `[${helpType}] Contact from ${name || 'Unknown'}`,
    );
    const bodyParts = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Help Type: ${helpType}`,
      ...(profileHandle ? [`Profile: ${PROFILE_BASE}${profileHandle}`] : []),
      '',
      'Message:',
      message,
    ];
    const body = encodeURIComponent(bodyParts.join('\n'));
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    window.location.href = mailto;
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <Box sx={{ py: 6 }}>
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
              Message sent
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your email draft has been opened in your email provider. If it
              didn&apos;t open, please send your message directly to{' '}
              <Link href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</Link>.
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 6 }}>
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Contact us
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Have a question or need help? Send us a message.
          </Typography>

          {/* Chat CTA */}
          {session && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1, fontWeight: 500 }}
              >
                Need a faster answer? Try Chat first.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ChatIcon />}
                component={RouterLink}
                to="/chat"
                sx={{ textTransform: 'none' }}
              >
                Go to Chat
              </Button>
            </Box>
          )}

          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
            />
            {session && profileHandle && (
              <Typography variant="body2" color="text.secondary">
                Profile:{' '}
                <Link
                  href={`${PROFILE_BASE}${profileHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {PROFILE_BASE}
                  {profileHandle}
                </Link>
              </Typography>
            )}
            <FormControl fullWidth required>
              <InputLabel id="help-type-label">Help type</InputLabel>
              <Select
                labelId="help-type-label"
                value={helpType}
                onChange={(e) => setHelpType(e.target.value as HelpType)}
                label="Help type"
              >
                {HELP_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              variant="outlined"
            />

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block' }}
            >
              We will do our best to respond quickly, but response times are not
              guaranteed.
            </Typography>

            <Button
              type="submit"
              variant="contained"
              disabled={!helpType || submitting}
              sx={{ alignSelf: 'flex-start' }}
            >
              {submitting ? 'Sending…' : 'Send message'}
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
