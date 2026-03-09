import { Alert, Box } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import {
  uploadAdImage,
  validateAdImageFile,
} from '../../../lib/api/adminAdvertisersApi';
import {
  buildAdvertiserInsertPayload,
  buildAdvertiserUpdatePayload,
} from '../../../lib/admin/advertiserPayload';
import { supabase } from '../../../lib/auth/supabaseClient';
import { toMessage } from '../../../lib/utils/errors';
import { AdminAdvertiserDialog } from './AdminAdvertiserDialog';
import { AdminAdvertisersHeader } from './AdminAdvertisersHeader';
import { AdminAdvertisersStateView } from './AdminAdvertisersStateView';
import {
  ADVERTISERS_UPDATED_EVENT_KEY,
  buildAdStats,
  emptyForm,
  formFromRow,
  type AdEventRow,
  type AdStats,
  type AdvertiserRow,
  type FormState,
  type MetricsWindowDays,
} from './adminAdvertisersTypes';

const notifyAdvertiserUpdate = () => {
  try {
    localStorage.setItem(ADVERTISERS_UPDATED_EVENT_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures.
  }
};

export const AdminAdvertisersPage = () => {
  const [rows, setRows] = useState<AdvertiserRow[]>([]);
  const [statsByAdvertiserId, setStatsByAdvertiserId] = useState<
    Record<string, AdStats>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingLogoUrl, setEditingLogoUrl] = useState<string | null>(null);
  const [metricsWindowDays, setMetricsWindowDays] =
    useState<MetricsWindowDays>(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date(
        Date.now() - metricsWindowDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      const [adsRes, eventsRes] = await Promise.all([
        supabase
          .from('feed_advertisers')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('feed_ad_events')
          .select('advertiser_id,event_name')
          .gte('created_at', since)
          .limit(20000),
      ]);

      if (adsRes.error) throw adsRes.error;
      if (eventsRes.error) throw eventsRes.error;
      setRows((adsRes.data ?? []) as AdvertiserRow[]);
      setStatsByAdvertiserId(
        buildAdStats((eventsRes.data ?? []) as AdEventRow[]),
      );
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [metricsWindowDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const releasePreviewUrl = useCallback(() => {
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }, [previewUrl]);

  const openAdd = () => {
    releasePreviewUrl();
    setEditingId(null);
    setEditingLogoUrl(null);
    setForm(emptyForm);
    setError(null);
    setSuccess(null);
    setDialogOpen(true);
  };

  const openEdit = (row: AdvertiserRow) => {
    releasePreviewUrl();
    setEditingId(row.id);
    setEditingLogoUrl(row.logo_url ?? null);
    setForm(formFromRow(row));
    setError(null);
    setSuccess(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setEditingLogoUrl(null);
    setForm(emptyForm);
    releasePreviewUrl();
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateAdImageFile(file);
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingImage(true);
    setError(null);
    setSuccess(null);
    try {
      const publicUrl = await uploadAdImage(file);
      if (editingId) {
        const { error: updateError } = await supabase
          .from('feed_advertisers')
          .update({
            image_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (updateError) throw updateError;
        notifyAdvertiserUpdate();
        await load();
      }

      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setForm((current) => ({ ...current, image_url: publicUrl }));
      setSuccess(
        editingId
          ? 'Image updated.'
          : 'Image uploaded. Save the ad to apply this change.',
      );
    } catch (cause) {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setError(toMessage(cause));
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const handleRemoveImage = async () => {
    setError(null);
    setSuccess(null);
    releasePreviewUrl();

    if (!editingId) {
      setForm((current) => ({ ...current, image_url: '' }));
      setSuccess('Image removed.');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('feed_advertisers')
        .update({ image_url: null, updated_at: new Date().toISOString() })
        .eq('id', editingId);
      if (updateError) throw updateError;

      setForm((current) => ({ ...current, image_url: '' }));
      setSuccess('Image removed.');
      notifyAdvertiserUpdate();
      await load();
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (uploadingImage) {
      setError('Please wait for the image upload to finish before saving.');
      return;
    }

    const links = form.links
      .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.label || link.url);

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = { ...form, links };
      if (editingId) {
        const { error: updateError } = await supabase
          .from('feed_advertisers')
          .update(buildAdvertiserUpdatePayload(payload, editingLogoUrl))
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('feed_advertisers')
          .insert(buildAdvertiserInsertPayload(payload));
        if (insertError) throw insertError;
      }

      notifyAdvertiserUpdate();
      setSuccess(editingId ? 'Advertiser updated.' : 'Advertiser added.');
      closeDialog();
      await load();
    } catch (cause) {
      setError(toMessage(cause));
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
      notifyAdvertiserUpdate();
      await load();
    } catch (cause) {
      setError(toMessage(cause));
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (row: AdvertiserRow) => {
    try {
      const { error: updateError } = await supabase
        .from('feed_advertisers')
        .update({ active: !row.active, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) throw updateError;
      notifyAdvertiserUpdate();
      await load();
    } catch (cause) {
      setError(toMessage(cause));
    }
  };

  return (
    <Box>
      <AdminAdvertisersHeader
        metricsWindowDays={metricsWindowDays}
        onMetricsChange={setMetricsWindowDays}
        onAdd={openAdd}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      ) : null}

      <AdminAdvertisersStateView
        loading={loading}
        rows={rows}
        statsByAdvertiserId={statsByAdvertiserId}
        metricsWindowDays={metricsWindowDays}
        onEdit={openEdit}
        onDelete={(id) => void handleDelete(id)}
        onToggleActive={(row) => void toggleActive(row)}
      />

      <AdminAdvertiserDialog
        open={dialogOpen}
        editingId={editingId}
        form={form}
        saving={saving}
        uploadingImage={uploadingImage}
        previewUrl={previewUrl}
        onClose={closeDialog}
        onFormChange={(updater) => setForm((current) => updater(current))}
        onImageUpload={(event) => void handleImageUpload(event)}
        onImageRemove={() => void handleRemoveImage()}
        onSave={() => void handleSave()}
      />
    </Box>
  );
};
