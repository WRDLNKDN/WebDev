/**
 * AI Weirdling form for MVP Avatar System — Generate → Preview → Accept or Refine.
 * Maps Primary Color, Held Object, Hair Style, Hair Color, Animal/Persona to Edge Function API.
 */
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import { getPreviewRemaining } from '../../lib/api/weirdlingApi';
import { toMessage } from '../../lib/utils/errors';
import type { WeirdlingResponse } from './weirdlingTypes';

const BORDER_COLOR = 'rgba(156,187,217,0.18)';

export interface AiWeirdlingFormProps {
  disabled?: boolean;
  onAccept?: () => void;
  onAvatarChanged?: () => void;
}

const INITIAL_FORM = {
  primaryColor: '',
  heldObject: '',
  hairStyle: '',
  hairColor: '',
  persona: '',
};

export const AiWeirdlingForm = ({
  disabled = false,
  onAccept,
  onAvatarChanged,
}: AiWeirdlingFormProps) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [preview, setPreview] = useState<{
    avatarUrl: string | null;
    response: WeirdlingResponse;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<{
    remaining: number;
    limit: number;
  } | null>(null);

  const fetchRemaining = useCallback(async () => {
    try {
      const r = await getPreviewRemaining();
      setRemaining(r);
    } catch {
      setRemaining({ remaining: 0, limit: 5 });
    }
  }, []);

  useEffect(() => {
    void fetchRemaining();
  }, [fetchRemaining]);

  const generateWeirdlingImage = useCallback(async () => {
    if (!form.persona.trim()) {
      throw new Error('Animal / Persona is required.');
    }

    // Note: interests field doesn't exist in this form, but we can add it later if needed
    const interestsArray: string[] = [];

    const requestBody = {
      primaryColor: form.primaryColor.trim() || undefined,
      heldObject: form.heldObject.trim() || undefined,
      hairStyle: form.hairStyle.trim() || undefined,
      hairColor: form.hairColor.trim() || undefined,
      persona: form.persona.trim(),
      interests: interestsArray.length > 0 ? interestsArray : undefined,
      userName: undefined, // Optional, can be added later if needed
    };

    // Debug logging to help diagnose issues
    console.log(
      '[AiWeirdlingForm] Sending request to Edge Function:',
      requestBody,
    );

    const { data, error: invokeError } = await supabase.functions.invoke(
      'generate-weirdling',
      {
        body: requestBody,
      },
    );

    // Debug logging
    if (data) {
      console.log('[AiWeirdlingForm] Received response:', {
        status: data.status,
        active_recipe: data.active_recipe,
        debug_prompt_snippet: data.debug_prompt_snippet,
        hasOutput: Boolean(data.prediction?.output?.[0]),
      });
    }

    if (invokeError) throw invokeError;
    if (!data || data.status !== 'success') {
      throw new Error(data?.error || 'Generation failed');
    }

    return data as WeirdlingResponse;
  }, [form]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await generateWeirdlingImage();
      const avatarUrl = response.prediction?.output?.[0] || null;

      setPreview({
        avatarUrl,
        response,
      });
      await fetchRemaining();
    } catch (err) {
      setError(toMessage(err));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [generateWeirdlingImage, fetchRemaining]);

  const handleRefine = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await generateWeirdlingImage();
      const avatarUrl = response.prediction?.output?.[0] || null;

      setPreview({
        avatarUrl,
        response,
      });
      await fetchRemaining();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [generateWeirdlingImage, fetchRemaining]);

  const handleAccept = useCallback(async () => {
    if (!preview?.avatarUrl) return;
    setError(null);
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('You need to sign in to save your avatar.');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar: preview.avatarUrl,
          avatar_type: 'ai',
          use_weirdling_avatar: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setPreview(null);
      onAccept?.();
      onAvatarChanged?.();
      await fetchRemaining();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setSaving(false);
    }
  }, [preview?.avatarUrl, onAccept, onAvatarChanged, fetchRemaining]);

  const canGenerate =
    !disabled && !loading && (remaining === null || remaining.remaining > 0);

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: 'rgba(0,0,0,0.15)',
        border: `1px solid ${BORDER_COLOR}`,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ color: 'rgba(255,255,255,0.9)', mb: 1.5 }}
      >
        AI Weirdling
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <TextField
          size="small"
          label="Primary Color"
          value={form.primaryColor}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, primaryColor: e.target.value }))
          }
          placeholder="e.g. Neon Green"
          disabled={disabled}
          fullWidth
          inputProps={{ 'aria-label': 'Primary color' }}
          sx={{
            '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        />
        <TextField
          size="small"
          label="Held Object"
          value={form.heldObject}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, heldObject: e.target.value }))
          }
          placeholder="e.g. Briefcase"
          disabled={disabled}
          fullWidth
          inputProps={{ 'aria-label': 'Held object' }}
          sx={{
            '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        />
        <TextField
          size="small"
          label="Hair Style"
          value={form.hairStyle}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hairStyle: e.target.value }))
          }
          disabled={disabled}
          fullWidth
          inputProps={{ 'aria-label': 'Hair style' }}
          sx={{
            '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        />
        <TextField
          size="small"
          label="Hair Color"
          value={form.hairColor}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, hairColor: e.target.value }))
          }
          disabled={disabled}
          fullWidth
          inputProps={{ 'aria-label': 'Hair color' }}
          sx={{
            '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
        />
        <TextField
          size="small"
          label="Animal / Persona"
          value={form.persona}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, persona: e.target.value }))
          }
          placeholder="e.g. bearded wizard"
          disabled={disabled}
          fullWidth
          sx={{
            gridColumn: { xs: '1', sm: '1 / -1' },
            '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' },
          }}
          inputProps={{ 'aria-label': 'Animal or persona' }}
        />
      </Box>
      {remaining !== null && (
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mb: 1 }}
        >
          {remaining.remaining} of {remaining.limit} previews left today
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: preview ? 2 : 0,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={() => void handleGenerate()}
          disabled={!canGenerate}
          aria-label="Generate AI Weirdling preview"
        >
          {loading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Generate'
          )}
        </Button>
        {preview && (
          <>
            <Button
              variant="outlined"
              size="small"
              onClick={() => void handleRefine()}
              disabled={!canGenerate}
              aria-label="Refine preview"
            >
              Refine
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => void handleAccept()}
              disabled={disabled || saving}
              aria-label="Accept and set as avatar"
            >
              {saving ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Accept'
              )}
            </Button>
          </>
        )}
      </Box>
      {error && (
        <Typography
          variant="body2"
          sx={{ color: 'error.main', mt: 1 }}
          role="alert"
        >
          {error}
        </Typography>
      )}
      {preview?.avatarUrl && (
        <Box
          sx={{
            mt: 1,
            width: 120,
            height: 120,
            borderRadius: 2,
            overflow: 'hidden',
            border: `2px solid ${BORDER_COLOR}`,
          }}
        >
          <Box
            component="img"
            src={preview.avatarUrl}
            alt=""
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </Box>
      )}
    </Box>
  );
};
