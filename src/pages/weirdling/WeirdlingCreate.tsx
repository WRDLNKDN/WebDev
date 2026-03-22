import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  generateWeirdling,
  saveWeirdlingByJobId,
  saveWeirdlingPreview,
} from '../../lib/api/weirdlingApi';
import { supabase } from '../../lib/auth/supabaseClient';
import { toMessage } from '../../lib/utils/errors';
import type {
  WeirdlingPreview,
  WeirdlingWizardInputs,
} from '../../types/weirdling';
import {
  WeirdlingChoiceScreen,
  WeirdlingLoading,
  WeirdlingPickScreen,
  WeirdlingPreviewScreen,
} from './weirdlingCreateUi';
import { STEPS, WeirdlingGenerateScreen } from './weirdlingCreateGenerate';

/** Path A: pick from preset. Path B: create your own (generate). */
type WeirdlingPath = 'choice' | 'pick' | 'generate';

export interface WeirdlingCreateProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export const WeirdlingCreate = ({
  onClose,
  onSuccess,
}: WeirdlingCreateProps = {}) => {
  const navigate = useNavigate();
  const isDialog = onClose != null || onSuccess != null;
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const [path, setPath] = useState<WeirdlingPath>('choice');
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<WeirdlingWizardInputs>({
    displayNameOrHandle: '',
    roleVibe: '',
    industryOrInterests: [],
    tone: 0.5,
    boundaries: '',
    bioSeed: '',
    includeImage: true,
    imageSource: 'preset',
    selectedImageIndex: 1,
  });
  const [industryText, setIndustryText] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(1);
  const [preview, setPreview] = useState<WeirdlingPreview | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session ?? null);
      setSessionChecked(true);
    };

    void init();
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt, nextSession) => {
        if (!cancelled) setSession(nextSession ?? null);
      },
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (session) return;
    if (onClose) onClose();
    else navigate('/', { replace: true });
  }, [sessionChecked, session, navigate, onClose]);

  useEffect(() => {
    if (step === 1) setIndustryText(inputs.industryOrInterests.join(', '));
  }, [step, inputs.industryOrInterests]);

  const setInput = (key: keyof WeirdlingWizardInputs, value: unknown) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const syncIndustryFromText = () => {
    const parsed = industryText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    setInputs((prev) => ({ ...prev, industryOrInterests: parsed }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateWeirdling(inputs, jobId ?? undefined);
      const usePresetImage =
        inputs.includeImage &&
        inputs.imageSource === 'preset' &&
        inputs.selectedImageIndex != null;

      let previewWithImage = usePresetImage
        ? {
            ...result.preview,
            avatarUrl: `/assets/og_weirdlings/weirdling_${inputs.selectedImageIndex}.png`,
          }
        : result.preview;

      if (
        inputs.includeImage &&
        inputs.imageSource === 'generate' &&
        result.preview.handle
      ) {
        const seed = `${result.preview.handle}|${result.preview.roleVibe}`;
        // Lazy load dicebear only when needed (not on critical path)
        const { createAvatar } = await import('@dicebear/core');
        const bottts = await import('@dicebear/bottts');
        const dataUri = createAvatar(bottts, { seed }).toDataUri();
        previewWithImage = { ...previewWithImage, avatarUrl: dataUri };
      }

      setPreview(previewWithImage);
      setJobId(result.jobId);
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreview = async () => {
    if (!preview) return;

    setLoading(true);
    setError(null);
    try {
      const hasGeneratedImage = preview.avatarUrl?.startsWith('data:');
      if (hasGeneratedImage || !jobId) {
        await saveWeirdlingPreview(preview);
      } else {
        await saveWeirdlingByJobId(jobId);
      }

      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePick = async () => {
    const name = displayName.trim() || 'My Weirdling';
    const handle =
      name.toLowerCase().replace(/\W+/g, '_').slice(0, 32) || 'weirdling';

    const previewPayload: WeirdlingPreview = {
      displayName: name,
      handle,
      roleVibe: 'Builder',
      industryTags: [],
      tone: 0.5,
      tagline: 'Picked from the set',
      boundaries: '',
      avatarUrl: `/assets/og_weirdlings/weirdling_${selectedImageIndex}.png`,
      promptVersion: 'pick',
      modelVersion: 'preset',
    };

    setLoading(true);
    setError(null);
    try {
      await saveWeirdlingPreview(previewPayload);
      if (onSuccess) onSuccess();
      else navigate('/dashboard');
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
    else navigate('/dashboard');
  };

  if (!sessionChecked || !session) {
    return <WeirdlingLoading isDialog={isDialog} />;
  }

  if (preview) {
    const imageSrc =
      preview.avatarUrl ??
      `/assets/og_weirdlings/weirdling_${inputs.selectedImageIndex ?? 1}.png`;

    return (
      <WeirdlingPreviewScreen
        preview={preview}
        imageSrc={imageSrc}
        error={error}
        loading={loading}
        isDialog={isDialog}
        onSave={() => void handleSavePreview()}
        onCancel={handleCancel}
      />
    );
  }

  if (path === 'choice') {
    return (
      <WeirdlingChoiceScreen
        error={error}
        isDialog={isDialog}
        onPick={() => setPath('pick')}
        onGenerate={() => {
          setPath('generate');
          setInputs((prev) => ({
            ...prev,
            imageSource: 'generate',
            includeImage: true,
          }));
        }}
      />
    );
  }

  if (path === 'pick') {
    return (
      <WeirdlingPickScreen
        error={error}
        isDialog={isDialog}
        displayName={displayName}
        selectedImageIndex={selectedImageIndex}
        loading={loading}
        onDisplayNameChange={setDisplayName}
        onSelectImage={setSelectedImageIndex}
        onBack={() => setPath('choice')}
        onSave={() => void handleSavePick()}
      />
    );
  }

  return (
    <WeirdlingGenerateScreen
      error={error}
      isDialog={isDialog}
      step={step}
      inputs={inputs}
      industryText={industryText}
      loading={loading}
      onFieldChange={setInput}
      onIndustryTextChange={setIndustryText}
      onIndustryBlur={syncIndustryFromText}
      onBackStep={() => setStep((current) => current - 1)}
      onBackToChoice={() => setPath('choice')}
      onNextStep={() => {
        if (step === 1) syncIndustryFromText();
        if (step < STEPS.length - 1) setStep((current) => current + 1);
      }}
      onGenerate={() => void handleGenerate()}
    />
  );
};

export default WeirdlingCreate;
