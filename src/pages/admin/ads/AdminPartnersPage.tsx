import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import {
  uploadAdImage,
  validateAdImageFile,
} from '../../../lib/api/adminAdvertisersApi';
import { supabase } from '../../../lib/auth/supabaseClient';
import { toMessage } from '../../../lib/utils/errors';
import {
  emptyForm,
  formFromRow,
  PartnerEditorDialog,
  PartnersError,
  PartnersHeader,
  PartnersTable,
  type FormState,
  type PartnerRow,
} from './adminPartnersUi';

export const AdminPartnersPage = () => {
  const [rows, setRows] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('community_partners')
        .select('*')
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (fetchError) throw fetchError;
      setRows((data ?? []) as PartnerRow[]);
    } catch (e: unknown) {
      setError(toMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateAdImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = '';
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingImage(true);
    setError(null);
    try {
      const publicUrl = await uploadAdImage(file);
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setForm((prev) => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setError(toMessage(err));
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        company_name: form.company_name.trim(),
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        url: form.url.trim(),
        logo_url: form.logo_url.trim() || null,
        image_url: form.image_url.trim() || null,
        active: form.active,
        featured: form.featured,
        sort_order: form.sort_order,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('community_partners')
          .update(payload)
          .eq('id', editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('community_partners')
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
    if (!confirm('Delete this partner? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('community_partners')
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

  return (
    <Box>
      <PartnersHeader
        onAdd={() => {
          setEditingId(null);
          setForm(emptyForm);
          setDialogOpen(true);
        }}
      />

      <PartnersError error={error} onClose={() => setError(null)} />

      <PartnersTable
        loading={loading}
        rows={rows}
        onEdit={(row) => {
          setEditingId(row.id);
          setForm(formFromRow(row));
          setDialogOpen(true);
        }}
        onDelete={(id) => void handleDelete(id)}
      />

      <PartnerEditorDialog
        open={dialogOpen}
        closeDialog={closeDialog}
        form={form}
        setForm={setForm}
        fileInputRef={fileInputRef}
        handleImageUpload={handleImageUpload}
        uploadingImage={uploadingImage}
        previewUrl={previewUrl}
        saving={saving}
        handleSave={() => void handleSave()}
      />
    </Box>
  );
};

export default AdminPartnersPage;
