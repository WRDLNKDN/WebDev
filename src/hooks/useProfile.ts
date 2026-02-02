/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { NewProject, PortfolioItem } from '../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../types/profile';
import type { Json } from '../types/supabase';

export function useProfile() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ☢️ NUCLEAR OPTION: Cast client to 'any' to bypass strict schema checks
  const client = supabase as any;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      // Safe Cast
      const safeNerdCreds =
        profileData.nerd_creds && typeof profileData.nerd_creds === 'object'
          ? (profileData.nerd_creds as unknown as NerdCreds)
          : {};

      setProfile({
        ...profileData,
        nerd_creds: safeNerdCreds,
      } as DashboardProfile);

      // 2. Fetch Projects (TypeScript can't block this now)
      const { data: projectsData, error: projectsError } = await client
        .from('portfolio_items')
        .select('*')
        .eq('owner_id', session.user.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      setProjects((projectsData || []) as PortfolioItem[]);
    } catch (err) {
      console.error('Data Load Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [client]);

  const addProject = async (newProject: NewProject, imageFile?: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) throw new Error('No active session');

      let finalImageUrl = newProject.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `project-${Date.now()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError } = await client.storage
          .from('project-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = client.storage.from('project-images').getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const { data, error: insertError } = await client
        .from('portfolio_items')
        .insert({
          owner_id: session.user.id,
          title: newProject.title,
          description: newProject.description,
          project_url: newProject.project_url,
          image_url: finalImageUrl,
          tech_stack: newProject.tech_stack,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setProjects((prev) => [data as PortfolioItem, ...prev]);
    } catch (err) {
      console.error('Add Project Error:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const updateProfile = async (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => {
    try {
      setUpdating(true);

      // 1. SESSION VERIFICATION
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) throw new Error('AUTH_FAILURE: No active session');

      // 2. DATA MERGE (JSONB Deep Merge Strategy)
      // We preserve existing keys to avoid wiping out unseen metadata
      const currentCreds =
        (profile?.nerd_creds as Record<string, unknown>) || {};
      const newCreds = (updates.nerd_creds as Record<string, unknown>) || {};
      const mergedNerdCreds = { ...currentCreds, ...newCreds };

      // 3. PAYLOAD ASSEMBLY
      // Strip nerd_creds from the top-level updates to prevent double-mapping
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nerd_creds: _ignored, ...topLevelUpdates } = updates;

      const payload = {
        ...topLevelUpdates,
        nerd_creds: mergedNerdCreds as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      // 4. ASYNCHRONOUS EXECUTION (The Database Write)
      const { error: updateError } = await client
        .from('profiles')
        .update(payload)
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // 5. OPTIMISTIC STATE SYNC
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...topLevelUpdates,
          nerd_creds: mergedNerdCreds,
        } as DashboardProfile;
      });
    } catch (err) {
      console.error('SYSTEM_LOG: Profile Update Error:', err);
      throw err;
    } finally {
      setUpdating(false); // Reset activation state
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) throw new Error('No user');

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const { error } = await client.storage
        .from('avatars')
        .upload(fileName, file);
      if (error) throw error;
      const {
        data: { publicUrl },
      } = client.storage.from('avatars').getPublicUrl(fileName);

      await updateProfile({ avatar: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const uploadResume = async (file: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await client.auth.getSession();
      if (!session?.user) throw new Error('No user');

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/resume.${fileExt}`;

      const { error } = await client.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = client.storage.from('resumes').getPublicUrl(fileName);

      await updateProfile({ resume_url: publicUrl } as any);

      return publicUrl;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    profile,
    projects,
    loading,
    updating,
    error,
    refresh: fetchData,
    updateProfile,
    uploadAvatar,
    addProject,
    uploadResume,
  };
}
