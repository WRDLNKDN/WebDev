import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { toMessage } from '../../../lib/utils/errors';
import { supabase } from '../../../lib/auth/supabaseClient';
import type { DashboardProfile, NerdCreds } from '../../../types/profile';
import {
  AVATAR_GRADIENT,
  BORDER_COLOR,
  GLASS_MODAL,
  PURPLE_ACCENT,
} from './editProfileDialogStyles';
import { EditProfileDialogContent } from './EditProfileDialogContent';

type EditProfileDialogProps = {
  open: boolean;
  onClose: () => void;
  profile: DashboardProfile | null;
  hasWeirdling?: boolean;
  onUpdate: (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => Promise<void>;
  onUpload: (file: File) => Promise<string | undefined>;
};

const safeStr = (val: unknown, fallback = ''): string =>
  typeof val === 'string' ? val : fallback;

export const EditProfileDialog = ({
  open,
  onClose,
  profile,
  hasWeirdling: _hasWeirdling = false,
  onUpdate,
  onUpload,
}: EditProfileDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    handle: '',
    pronouns: '',
    status_message: '',
    bio: '',
    skills: '',
  });

  const [busy, setBusy] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open || !profile) return;
    const creds = (profile.nerd_creds as Record<string, unknown>) || {};
    setFormData({
      handle: safeStr(profile.handle),
      pronouns: safeStr(profile.pronouns),
      status_message: safeStr(creds.status_message),
      bio: safeStr(creds.bio),
      skills: safeStr(
        Array.isArray(creds.skills)
          ? (creds.skills as string[]).join(', ')
          : typeof creds.skills === 'string'
            ? creds.skills
            : '',
      ),
    });
    setUploadedAvatarUrl(null);
  }, [open, profile]);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const checkHandle = async (val: string) => {
    if (val.length < 3) {
      setHandleAvailable(null);
      return;
    }
    if (!profile) return;
    if (val === profile.handle) {
      setHandleAvailable(true);
      return;
    }
    setCheckingHandle(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('handle')
        .eq('handle', val)
        .maybeSingle();
      setHandleAvailable(!data);
    } finally {
      setCheckingHandle(false);
    }
  };

  const handleSave = async () => {
    if (handleAvailable === false || checkingHandle) return;
    try {
      setBusy(true);
      const skillsArr = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await onUpdate({
        handle: formData.handle,
        pronouns: formData.pronouns,
        nerd_creds: {
          status_message: formData.status_message,
          bio: formData.bio,
          skills: skillsArr.length ? skillsArr : undefined,
        },
      });
      setToastMessage('Profile updated successfully!');
      setShowToast(true);
      setTimeout(() => onClose(), 1200);
    } catch (error) {
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setToastMessage('File too large. Max 6MB.');
      setShowToast(true);
      e.target.value = '';
      return;
    }
    try {
      setBusy(true);
      const url = await onUpload(file);
      if (url) {
        setUploadedAvatarUrl(url);
        setToastMessage('Avatar updated.');
        setShowToast(true);
      }
    } catch (error) {
      setToastMessage(toMessage(error));
      setShowToast(true);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const previewURL = `http://localhost:5173/profile/${formData.handle}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: GLASS_MODAL }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
          borderBottom: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            background: AVATAR_GRADIENT,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          EDIT <span style={{ color: PURPLE_ACCENT }}>PROFILE</span>
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={busy}
          sx={{
            color: 'rgba(255,255,255,0.6)',
            '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <EditProfileDialogContent
        busy={busy}
        uploadedAvatarUrl={uploadedAvatarUrl}
        profileAvatar={profile?.avatar ?? null}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        formData={formData}
        setFormData={setFormData}
        checkHandle={checkHandle}
        checkingHandle={checkingHandle}
        handleAvailable={handleAvailable}
        previewURL={previewURL}
        handleChange={handleChange}
        handleSave={() => void handleSave()}
        onClose={onClose}
        showToast={showToast}
        toastMessage={toastMessage}
        setShowToast={setShowToast}
      />
    </Dialog>
  );
};
