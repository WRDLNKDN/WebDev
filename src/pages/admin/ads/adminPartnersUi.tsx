import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { RefObject } from 'react';
import { AD_IMAGE_ALLOWED_LABEL } from '../../../lib/api/adminAdvertisersApi';
import { shouldCloseDialogFromReason } from '../../../lib/ui/dialogFormUtils';
import { compactGlassDangerIconButtonSx } from '../../../theme/iconActionStyles';

export type PartnerRow = {
  id: string;
  company_name: string;
  title: string | null;
  description: string | null;
  url: string;
  logo_url: string | null;
  image_url: string | null;
  active: boolean;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type FormState = {
  company_name: string;
  title: string;
  description: string;
  url: string;
  logo_url: string;
  image_url: string;
  active: boolean;
  featured: boolean;
  sort_order: number;
};

export const emptyForm: FormState = {
  company_name: '',
  title: '',
  description: '',
  url: '',
  logo_url: '',
  image_url: '',
  active: true,
  featured: false,
  sort_order: 0,
};

export const formFromRow = (row: PartnerRow | null): FormState =>
  row
    ? {
        company_name: row.company_name,
        title: row.title ?? '',
        description: row.description ?? '',
        url: row.url,
        logo_url: row.logo_url ?? '',
        image_url: row.image_url ?? '',
        active: row.active,
        featured: row.featured,
        sort_order: row.sort_order,
      }
    : emptyForm;

export const PartnersHeader = ({ onAdd }: { onAdd: () => void }) => (
  <>
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Community Partners
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        Manage public partner listings independently from feed ads.
      </Typography>
    </Box>
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onAdd}
      sx={{ mb: 2 }}
    >
      Add Partner
    </Button>
  </>
);

export const PartnersError = ({
  error,
  onClose,
}: {
  error: string | null;
  onClose: () => void;
}) =>
  error ? (
    <Alert severity="error" sx={{ mb: 2 }} onClose={onClose}>
      {error}
    </Alert>
  ) : null;

type TableProps = {
  loading: boolean;
  rows: PartnerRow[];
  onEdit: (row: PartnerRow) => void;
  onDelete: (id: string) => void;
};

export const PartnersTable = ({
  loading,
  rows,
  onEdit,
  onDelete,
}: TableProps) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
        <CircularProgress size={24} />
        <Typography variant="body2">Loading partners…</Typography>
      </Box>
    );
  }
  if (rows.length === 0)
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
        No partners yet. Add one to get started.
      </Typography>
    );

  return (
    <Table
      size="small"
      sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.12)' } }}
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 56 }}>Image</TableCell>
          <TableCell>Company</TableCell>
          <TableCell>Title</TableCell>
          <TableCell>URL</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Featured</TableCell>
          <TableCell align="right">Order</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell sx={{ width: 56, py: 0.5 }}>
              {row.image_url ? (
                <Box
                  component="img"
                  src={row.image_url}
                  alt=""
                  sx={{
                    width: 48,
                    height: 32,
                    objectFit: 'cover',
                    borderRadius: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 48,
                    height: 32,
                    borderRadius: 0.5,
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                </Box>
              )}
            </TableCell>
            <TableCell>{row.company_name}</TableCell>
            <TableCell>{row.title ?? '—'}</TableCell>
            <TableCell>
              <Typography
                variant="body2"
                sx={{
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={row.url}
              >
                {row.url}
              </Typography>
            </TableCell>
            <TableCell>
              <Chip
                label={row.active ? 'Active' : 'Inactive'}
                size="small"
                color={row.active ? 'success' : 'default'}
                variant="outlined"
              />
            </TableCell>
            <TableCell>
              <Chip
                label={row.featured ? 'Featured' : 'Standard'}
                size="small"
                color={row.featured ? 'primary' : 'default'}
                variant="outlined"
              />
            </TableCell>
            <TableCell align="right">{row.sort_order}</TableCell>
            <TableCell align="right">
              <IconButton
                size="small"
                onClick={() => onEdit(row)}
                aria-label="Edit"
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onDelete(row.id)}
                aria-label="Delete"
                sx={{
                  ...compactGlassDangerIconButtonSx,
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

type DialogProps = {
  open: boolean;
  closeDialog: () => void;
  form: FormState;
  setForm: (updater: (prev: FormState) => FormState) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingImage: boolean;
  previewUrl: string | null;
  saving: boolean;
  handleSave: () => void;
};

export const PartnerEditorDialog = ({
  open,
  closeDialog,
  form,
  setForm,
  fileInputRef,
  handleImageUpload,
  uploadingImage,
  previewUrl,
  saving,
  handleSave,
}: DialogProps) => {
  const isSubmitDisabled =
    saving || !form.company_name.trim() || !form.url.trim();

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (shouldCloseDialogFromReason(reason)) closeDialog();
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: 'background.paper' } }}
    >
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
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
          Partner Editor
          <IconButton
            size="small"
            onClick={closeDialog}
            aria-label="Close"
            sx={{ ml: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
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
                    previewUrl || form.image_url
                      ? 'action.hover'
                      : 'transparent',
                  ...(!uploadingImage && {
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }),
                }}
              >
                {previewUrl || form.image_url ? (
                  <Box>
                    <Box
                      component="img"
                      src={previewUrl ?? form.image_url ?? ''}
                      alt="Partner image"
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
                      Upload Partner Image
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      1200x400 hero or square logo (max 50MB,{' '}
                      {AD_IMAGE_ALLOWED_LABEL})
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            <TextField
              label="Company *"
              value={form.company_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, company_name: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              label="Partner URL *"
              value={form.url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, url: e.target.value }))
              }
              fullWidth
              required
              placeholder="https://example.com"
            />
            <TextField
              label="Logo URL (optional)"
              value={form.logo_url}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, logo_url: e.target.value }))
              }
              fullWidth
            />

            <Stack direction="row" spacing={3} alignItems="center">
              <TextField
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value, 10) || 0,
                  }))
                }
                inputProps={{ min: 0 }}
                sx={{ width: 120 }}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={form.active}
                  onChange={(_, checked) =>
                    setForm((prev) => ({ ...prev, active: checked }))
                  }
                />
                <Typography variant="body2">Active</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={form.featured}
                  onChange={(_, checked) =>
                    setForm((prev) => ({ ...prev, featured: checked }))
                  }
                />
                <Typography variant="body2">Featured</Typography>
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
          <Button onClick={closeDialog}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitDisabled}>
            {saving ? <CircularProgress size={20} /> : 'Save Partner'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
