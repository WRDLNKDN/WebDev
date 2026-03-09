import {
  ErrorOutline as ErrorIcon,
  AutoAwesome as MagicIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Fade,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useRef, useState } from 'react';

// PATH FIX: We go up two levels to find the client in src/
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';
import { WeirdlingLoadingBar } from './WeirdlingLoadingBar';
import { WeirdlingResultCard } from './WeirdlingResultCard';
import type { WeirdlingResponse } from './weirdlingTypes';

// --- TYPES ---
interface WeirdlingGeneratorProps {
  session: Session | null;
  onWeirdlingGenerated?: () => void;
}

// ARROW FUNCTION FIX: Satisfies 'react/function-component-definition'
const WeirdlingGenerator = ({
  session,
  onWeirdlingGenerated,
}: WeirdlingGeneratorProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const resultRef = useRef<HTMLDivElement>(null);

  // --- STATE ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WeirdlingResponse | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  // --- INPUT STATE ---
  const [formData, setFormData] = useState({
    primaryColor: 'Hot Pink',
    heldObject: 'briefcase',
    hairStyle: 'rainbow',
    hairColor: 'neon',
    persona: 'bearded wizard box',
    interests: 'System Audits, Coding, The 90s',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- ACTIONS ---
  const generateWeirdling = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedName(null);
    setSaveStatus('idle');

    try {
      if (!formData.persona.trim())
        throw new Error('Persona Base is required.');

      const interestsArray = formData.interests.split(',').map((s) => s.trim());

      const { data, error: invokeError } = await supabase.functions.invoke(
        'generate-weirdling',
        {
          body: {
            ...formData,
            interests: interestsArray,
            userName: session?.user?.user_metadata?.full_name || 'Osgood',
          },
        },
      );

      if (invokeError) throw invokeError;

      // TYPE ASSERTION: We know the shape of the response
      setResult(data as WeirdlingResponse);

      setTimeout(() => {
        resultRef.current?.focus();
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    } catch (err: unknown) {
      console.error('Weirdling Error:', err);
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedName || !session?.user?.id) return;
    setSaveStatus('saving');

    try {
      const avatarUrl = result.prediction.output[0];

      const updates = {
        id: session.user.id,
        avatar_url: avatarUrl,
        avatar_type: 'ai',
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id);
      if (updateError) throw updateError;

      setSaveStatus('saved');
      if (onWeirdlingGenerated) onWeirdlingGenerated();
    } catch (err: unknown) {
      console.error('Save Error:', err);
      setError("We couldn't save your Weirdling right now. Please try again.");
      setSaveStatus('idle');
    }
  };

  // --- RENDER ---
  return (
    <Stack spacing={4} sx={{ maxWidth: '600px', mx: 'auto', width: '100%' }}>
      <Stack spacing={1} component="header">
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            textAlign: isMobile ? 'center' : 'left',
          }}
        >
          Project WRDLNKDN
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ textAlign: isMobile ? 'center' : 'left' }}
        >
          Protocol: Osgood-Rupert | Status:{' '}
          <strong style={{ color: '#66bb6a' }}>ONLINE</strong>
        </Typography>
      </Stack>

      <Card
        component="section"
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
        }}
      >
        <CardContent>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                label="Primary Color"
                name="primaryColor"
                value={formData.primaryColor}
                onChange={handleChange}
                fullWidth
                placeholder="e.g. Neon Green"
              />
              <TextField
                label="Held Object"
                name="heldObject"
                value={formData.heldObject}
                onChange={handleChange}
                fullWidth
                placeholder="e.g. Briefcase"
                helperText="Type 'None' to remove"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Hair Style"
                name="hairStyle"
                value={formData.hairStyle}
                onChange={handleChange}
                fullWidth
              />
              <TextField
                label="Hair Color"
                name="hairColor"
                value={formData.hairColor}
                onChange={handleChange}
                fullWidth
              />
            </Stack>
            <TextField
              required
              label="Persona Base"
              name="persona"
              value={formData.persona}
              onChange={handleChange}
              fullWidth
              helperText="The base shape (e.g. 'box', 'cat', 'wizard')"
            />
            <TextField
              label="Baggage (Interests)"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
              helperText="Comma separated tags that define your vibe."
              slotProps={{ htmlInput: { 'aria-label': 'Baggage Interests' } }}
            />

            {error && (
              <Fade in>
                <Alert
                  severity="error"
                  icon={<ErrorIcon fontSize="inherit" />}
                  sx={{ width: '100%' }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            <Button
              variant="contained"
              size="large"
              onClick={generateWeirdling}
              disabled={loading || saveStatus === 'saving'}
              startIcon={!loading && <MagicIcon />}
              sx={{
                mt: 1,
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '0.5px',
              }}
            >
              {loading ? 'CALCULATING PHYSICS...' : 'INITIALIZE WEIRDLING'}
            </Button>
          </Stack>
        </CardContent>

        {loading && <WeirdlingLoadingBar />}
      </Card>

      <Box
        ref={resultRef}
        tabIndex={-1}
        sx={{ outline: 'none' }}
        aria-live="polite"
      >
        {result && (
          <WeirdlingResultCard
            result={result}
            selectedName={selectedName}
            saveStatus={saveStatus}
            successBorderColor={theme.palette.success.main}
            onSelectName={setSelectedName}
            onSave={handleSave}
          />
        )}
      </Box>
    </Stack>
  );
};

export default WeirdlingGenerator;
