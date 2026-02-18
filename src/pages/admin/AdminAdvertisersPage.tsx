import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { FeedAdvertiser } from '../../components/feed/FeedAdCard';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';

type AdvertiserRow = FeedAdvertiser & {
  created_at: string;
  updated_at: string;
};

type LinkItem = { label: string; url: string };

type FormState = {
  company_name: string;
  title: string;
  description: string;
  url: string;
  logo_url: string;
  links: LinkItem[];
  active: boolean;
  sort_order: number;
};

const emptyForm: FormState = {
  company_name: '',
  title: '',
  description: '',
  url: '',
  logo_url: '',
  links: [],
  active: true,
  sort_order: 0,
};

function parseLinks(raw: unknown): LinkItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x: unknown): x is { label?: string; url?: string } =>
        x != null && typeof x === 'object',
    )
    .map((x) => ({
      label: String(x.label ?? '').trim(),
      url: String(x.url ?? '').trim(),
    }))
    .filter((x) => x.label || x.url);
}

function formFromRow(row: AdvertiserRow | null): FormState {
  if (!row) return emptyForm;
  const links = parseLinks(row.links);
  return {
    company_name: row.company_name,
    title: row.title,
    description: row.description,
    url: row.url,
    logo_url: row.logo_url ?? '',
    links,
    active: row.active,
    sort_order: row.sort_order,
  };
}

export const AdminAdvertisersPage = () => {
  const [rows, setRows] = useState<AdvertiserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('feed_advertisers')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setRows((data ?? []) as AdvertiserRow[]);
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: AdvertiserRow) => {
    setEditingId(row.id);
    setForm(formFromRow(row));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const links = form.links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.label || l.url);
    setSaving(true);
    setError(null);
    try {
      const payload = {
        company_name: form.company_name.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim(),
        logo_url: form.logo_url.trim() || null,
        links,
        active: form.active,
        sort_order: form.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('feed_advertisers')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('feed_advertisers')
          .insert(payload);
        if (insertError) throw insertError;
      }
      closeDialog();
      await load();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this advertiser? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('feed_advertisers')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      await load();
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (row: AdvertiserRow) => {
    try {
      const { error: updateError } = await supabase
        .from('feed_advertisers')
        .update({
          active: !row.active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (updateError) throw updateError;
      await load();
    } catch (e: unknown) {
      setError(toMessage(e));
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Feed Advertisers
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Manage ads shown every 6th post in the Feed. Add, edit, or deactivate
          advertisers.
        </Typography>
      </Box>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openAdd}
        sx={{ mb: 2 }}
      >
        Add Advertiser
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={24} />
          <Typography variant="body2">Loading advertisers…</Typography>
        </Box>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
          No advertisers yet. Add one to get started.
        </Typography>
      ) : (
        <Table
          size="small"
          sx={{ '& td, & th': { borderColor: 'rgba(255,255,255,0.12)' } }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Order</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.company_name}</TableCell>
                <TableCell>{row.title}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 200,
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
                    onClick={() => void toggleActive(row)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell align="right">{row.sort_order}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => openEdit(row)}
                    aria-label="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => void handleDelete(row.id)}
                    aria-label="Delete"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Advertiser' : 'Add Advertiser'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Company Name"
              value={form.company_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, company_name: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              fullWidth
              multiline
              rows={2}
              required
            />
            <TextField
              label="URL"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              fullWidth
              required
              placeholder="https://example.com"
            />
            <TextField
              label="Logo URL (optional)"
              value={form.logo_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, logo_url: e.target.value }))
              }
              fullWidth
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Links (optional)
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1 }}
              >
                Add links shown at the bottom of the ad (e.g. Downloads, API).
              </Typography>
              {form.links.map((link, i) => (
                <Stack
                  key={i}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ mb: 1 }}
                  alignItems="flex-start"
                >
                  <TextField
                    label="Label"
                    size="small"
                    value={link.label}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        links: f.links.map((l, j) =>
                          j === i ? { ...l, label: e.target.value } : l,
                        ),
                      }))
                    }
                    placeholder="e.g. Downloads"
                    sx={{ flex: 1, minWidth: 120 }}
                  />
                  <TextField
                    label="URL"
                    size="small"
                    type="url"
                    value={link.url}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        links: f.links.map((l, j) =>
                          j === i ? { ...l, url: e.target.value } : l,
                        ),
                      }))
                    }
                    placeholder="https://..."
                    sx={{ flex: 2, minWidth: 140 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        links: f.links.filter((_, j) => j !== i),
                      }))
                    }
                    aria-label="Remove link"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    links: [...f.links, { label: '', url: '' }],
                  }))
                }
              >
                Add link
              </Button>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sort_order: parseInt(e.target.value, 10) || 0,
                  }))
                }
                inputProps={{ min: 0 }}
                sx={{ width: 120 }}
              />
              <Button
                variant={form.active ? 'contained' : 'outlined'}
                color={form.active ? 'success' : 'inherit'}
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              >
                {form.active ? 'Active' : 'Inactive'}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={
              saving ||
              !form.company_name.trim() ||
              !form.title.trim() ||
              !form.description.trim() ||
              !form.url.trim()
            }
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
