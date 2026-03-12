import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';
import { AD_IMAGE_ALLOWED_LABEL } from '../../../lib/api/adminAdvertisersApi';
import { shouldCloseDialogFromReason } from '../../../lib/ui/dialogFormUtils';
import { MAX_LINKS, type FormState } from './adminAdvertisersTypes';

type Props = {
  open: boolean;
  editingId: string | null;
  form: FormState;
  saving: boolean;
  uploadingImage: boolean;
  previewUrl: string | null;
  onClose: () => void;
  onFormChange: (updater: (prev: FormState) => FormState) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  onSave: () => void;
};

const ImageUploadField = ({
  editingId,
  form,
  previewUrl,
  uploadingImage,
  saving,
  onImageUpload,
  onImageRemove,
}: Pick<
  Props,
  | 'editingId'
  | 'form'
  | 'previewUrl'
  | 'uploadingImage'
  | 'saving'
  | 'onImageUpload'
  | 'onImageRemove'
>) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onImageUpload}
        style={{ display: 'none' }}
      />
      <Box
        onClick={() => fileInputRef.current?.click()}
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: uploadingImage ? 'wait' : 'pointer',
          bgcolor:
            previewUrl || form.image_url ? 'action.hover' : 'transparent',
          ...(!uploadingImage && {
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }),
        }}
      >
        {previewUrl || form.image_url ? (
          <Box>
            <Box
              component="img"
              src={previewUrl ?? form.image_url}
              alt="Ad banner"
              sx={{
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 1,
                mb: 1,
                objectFit: 'contain',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {uploadingImage ? 'Uploading…' : 'Click to replace image'}
            </Typography>
          </Box>
        ) : uploadingImage ? (
          <Stack alignItems="center" spacing={1}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Uploading…
            </Typography>
          </Stack>
        ) : (
          <>
            <CloudUploadIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
            />
            <Typography variant="body1" fontWeight={500}>
              Upload Image
            </Typography>
            <Typography variant="caption" color="text.secondary">
              1200x400 recommended (max 50MB, {AD_IMAGE_ALLOWED_LABEL})
            </Typography>
          </>
        )}
      </Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mt: 1 }}
      >
        <Typography variant="caption" color="text.secondary">
          {editingId
            ? 'Image changes save immediately when upload completes.'
            : 'Upload an image, then save the ad.'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage || saving}
          >
            Replace image
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={onImageRemove}
            disabled={
              uploadingImage || saving || (!previewUrl && !form.image_url)
            }
          >
            Remove image
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

const LinkEditor = ({
  form,
  onFormChange,
}: Pick<Props, 'form' | 'onFormChange'>) => (
  <Box>
    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
      Call-To-Action Links
    </Typography>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ mb: 1, display: 'block' }}
    >
      Add up to 4 links (e.g. Learn more, Contact, Docs).
    </Typography>
    {form.links.map((link, index) => (
      <Stack
        key={index}
        direction="row"
        spacing={1}
        sx={{ mb: 1 }}
        alignItems="center"
      >
        <TextField
          label="Label"
          size="small"
          value={link.label}
          onChange={(event) =>
            onFormChange((current) => ({
              ...current,
              links: current.links.map((item, i) =>
                i === index ? { ...item, label: event.target.value } : item,
              ),
            }))
          }
          placeholder="e.g. Downloads"
          sx={{ flex: 1, minWidth: 100 }}
        />
        <TextField
          label="URL"
          size="small"
          type="url"
          value={link.url}
          onChange={(event) =>
            onFormChange((current) => ({
              ...current,
              links: current.links.map((item, i) =>
                i === index ? { ...item, url: event.target.value } : item,
              ),
            }))
          }
          placeholder="https://…"
          sx={{ flex: 2, minWidth: 140 }}
        />
        <IconButton
          size="small"
          onClick={() =>
            onFormChange((current) => ({
              ...current,
              links: current.links.filter((_, i) => i !== index),
            }))
          }
          aria-label="Remove link"
          sx={{
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'white',
            '&:hover': { bgcolor: 'error.main', color: 'white' },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Stack>
    ))}
    {form.links.length < MAX_LINKS ? (
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() =>
          onFormChange((current) => ({
            ...current,
            links: [...current.links, { label: '', url: '' }],
          }))
        }
      >
        Add Another Link
      </Button>
    ) : null}
  </Box>
);

export const AdminAdvertiserDialog = ({
  open,
  editingId,
  form,
  saving,
  uploadingImage,
  previewUrl,
  onClose,
  onFormChange,
  onImageUpload,
  onImageRemove,
  onSave,
}: Props) => {
  const isSubmitDisabled =
    saving ||
    uploadingImage ||
    !form.company_name.trim() ||
    !form.title.trim() ||
    !form.url.trim();

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (shouldCloseDialogFromReason(reason)) onClose();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: 'background.paper' } }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: 1,
          }}
        >
          Advertiser Ad Editor
          <IconButton
            size="small"
            onClick={onClose}
            aria-label="Close"
            sx={{ ml: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <ImageUploadField
              editingId={editingId}
              form={form}
              previewUrl={previewUrl}
              uploadingImage={uploadingImage}
              saving={saving}
              onImageUpload={onImageUpload}
              onImageRemove={onImageRemove}
            />
            <TextField
              label="Company"
              value={form.company_name}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, company_name: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Title *"
              value={form.title}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
              required
              placeholder="e.g. Sponsor spotlight"
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, description: e.target.value }))
              }
              fullWidth
              multiline
              rows={4}
              placeholder="Describe your product or service…"
            />
            <TextField
              label="Main URL"
              value={form.url}
              onChange={(e) =>
                onFormChange((f) => ({ ...f, url: e.target.value }))
              }
              fullWidth
              required
              placeholder="https://example.com"
            />
            <LinkEditor form={form} onFormChange={onFormChange} />
            <Stack direction="row" spacing={3} alignItems="center">
              <TextField
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(event) =>
                  onFormChange((f) => ({
                    ...f,
                    sort_order: parseInt(event.target.value, 10) || 0,
                  }))
                }
                inputProps={{ min: 0 }}
                sx={{ width: 100 }}
              />
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={form.active}
                  onChange={(_, checked) =>
                    onFormChange((f) => ({ ...f, active: checked }))
                  }
                  color="primary"
                />
                <Typography variant="body2">Active</Typography>
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mr: 'auto', display: { xs: 'none', sm: 'block' } }}
          >
            Press Enter to save.
          </Typography>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitDisabled}>
            {saving ? (
              <CircularProgress size={20} />
            ) : uploadingImage ? (
              'Uploading image…'
            ) : (
              'Save Ad'
            )}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
