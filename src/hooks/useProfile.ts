import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { detectPlatformFromUrl } from '../lib/utils/linkPlatform';
import { processAvatarForUpload } from '../lib/utils/avatarResize';
import { toMessage } from '../lib/utils/errors';
import type { NewProject, PortfolioItem } from '../types/portfolio';
import type { DashboardProfile, NerdCreds, SocialLink } from '../types/profile';
import type { Json } from '../types/supabase';

export function useProfile() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeSocials = (rawSocials: unknown): SocialLink[] => {
    if (Array.isArray(rawSocials)) {
      return rawSocials
        .filter(
          (s) =>
            s &&
            typeof s === 'object' &&
            'id' in s &&
            'url' in s &&
            typeof (s as { url: unknown }).url === 'string',
        )
        .map((s, index) => ({
          ...(s as SocialLink),
          platform:
            typeof (s as { platform?: unknown }).platform === 'string' &&
            (s as { platform?: string }).platform.trim()
              ? (s as { platform: string }).platform
              : detectPlatformFromUrl((s as { url: string }).url),
          isVisible: (s as { isVisible?: boolean }).isVisible !== false,
          order:
            typeof (s as { order?: number }).order === 'number'
              ? (s as { order: number }).order
              : index,
        }));
    }

    // Legacy shape support: { discord?: string, reddit?: string, github?: string }
    if (rawSocials && typeof rawSocials === 'object') {
      const legacy = rawSocials as Record<string, unknown>;
      const map: Array<{
        key: string;
        label: string;
        category: 'Social' | 'Professional';
      }> = [
        { key: 'discord', label: 'Discord', category: 'Social' },
        { key: 'reddit', label: 'Reddit', category: 'Social' },
        { key: 'github', label: 'GitHub', category: 'Professional' },
      ];
      return map
        .map((item, index) => {
          const value = legacy[item.key];
          if (typeof value !== 'string' || !value.trim()) return null;
          return {
            id: `legacy-${item.key}`,
            category: item.category,
            platform: item.label,
            url: value.trim(),
            label: item.label,
            isVisible: true,
            order: index,
          } as SocialLink;
        })
        .filter((link): link is SocialLink => Boolean(link));
    }

    return [];
  };

  // LOGIC SECTOR: FETCH DATA
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user) {
        setLoading(false);
        return;
      }

      // 1. Fetch Profile (maybeSingle: no row = null, don't throw)
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      let profileData = data as DashboardProfile | null;

      // If no profile row exists, create one so Edit Profile / Settings can work
      if (!profileData) {
        const email = session.user.email ?? '';
        const baseHandle =
          email.split('@')[0]?.toLowerCase().replace(/\W/g, '') || 'user';
        const handle = baseHandle;
        let attempts = 0;
        while (attempts < 10) {
          const payload = {
            id: session.user.id,
            email,
            handle: attempts === 0 ? handle : `${handle}${attempts}`,
            display_name:
              session.user.user_metadata?.full_name ?? email.split('@')[0],
            status: 'approved',
          };
          const { data: upserted, error: upsertErr } = await supabase
            .from('profiles')
            .upsert(payload, {
              onConflict: 'id',
              ignoreDuplicates: true,
            })
            .select('*')
            .maybeSingle();
          if (!upsertErr && upserted) {
            profileData = upserted as unknown as DashboardProfile;
            break;
          }
          if (upsertErr?.code === '23505') {
            // Handle conflict: another request created it. Refetch.
            const { data: existing } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            if (existing) {
              profileData = existing as unknown as DashboardProfile;
              break;
            }
            attempts += 1;
            continue;
          }
          if (upsertErr) break;
          // ignoreDuplicates: refetch in case row was created by another request
          const { data: existing } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          if (existing) {
            profileData = existing as unknown as DashboardProfile;
            break;
          }
          attempts += 1;
        }
        if (!profileData) {
          setLoading(false);
          setError(
            "We couldn't create your profile. Please try again, or contact support if this keeps happening.",
          );
          return;
        }
      }

      // Safe Data Hydration
      const rawCreds = profileData.nerd_creds;
      const safeNerdCreds: NerdCreds =
        rawCreds && typeof rawCreds === 'object'
          ? (rawCreds as unknown as NerdCreds)
          : ({} as NerdCreds);

      // Normalize socials: DB may have legacy { discord, reddit, github } or SocialLink[]
      const rawSocials = profileData.socials;
      const safeSocials = normalizeSocials(rawSocials);

      setProfile({
        ...profileData,
        nerd_creds: safeNerdCreds,
        socials: safeSocials,
      } as DashboardProfile);

      // 2. Fetch Projects (optional: table may not exist yet)
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('portfolio_items')
          .select('*')
          .eq('owner_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!projectsError)
          setProjects((projectsData || []) as PortfolioItem[]);
        else setProjects([]);
      } catch {
        setProjects([]);
      }
    } catch (err: unknown) {
      console.error('SYSTEM_LOG: Data Load Error:', err);
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGIC SECTOR: ASYNCHRONOUS UPDATES
  const updateProfile = async (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to update your profile.');
      }

      // Preserve existing keys (Deep Merge); status_message removed from UI
      const currentCreds =
        (profile?.nerd_creds as Record<string, unknown>) || {};
      const newCreds = (updates.nerd_creds as Record<string, unknown>) || {};
      const merged = { ...currentCreds, ...newCreds };
      delete merged.status_message;
      const mergedNerdCreds = merged;

      // Strip nerd_creds to prevent double-mapping in the payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nerd_creds: _, ...topLevelUpdates } = updates;

      // Only send columns we're allowed to update; include nerd_creds only when
      // we're updating it (so links-only update doesn't overwrite nerd_creds)
      const payload: Record<string, unknown> = { ...topLevelUpdates };
      if (updates.nerd_creds !== undefined) {
        payload.nerd_creds = mergedNerdCreds as unknown as Json;
      }

      // 4. ASYNCHRONOUS EXECUTION (The Database Write)
      // Cast to Record for .update() — Supabase types may lag behind schema changes
      const { data: updatedRow, error: updateError } = await supabase
        .from('profiles')
        .update(payload as Record<string, unknown>)
        .eq('id', session.user.id)
        .select('id')
        .maybeSingle();

      if (updateError) {
        const code = (updateError as { code?: string }).code;
        const msg = String(
          (updateError as { message?: string }).message || '',
        ).toLowerCase();
        const is409 =
          code === '409' || msg.includes('409') || msg.includes('conflict');
        if (is409) {
          await fetchData();
          throw new Error(
            'Profile was updated elsewhere. Please try saving again.',
          );
        }
        if (msg.includes('rls') || msg.includes('row-level security')) {
          throw new Error(
            "You don't have permission to update your profile. Try signing in again.",
          );
        }
        if (msg.includes('duplicate') || msg.includes('unique')) {
          throw new Error(
            'That handle may already be taken. Try a different one.',
          );
        }
        throw new Error(
          (updateError as { message?: string }).message ||
            "We couldn't save your profile. Please try again.",
        );
      }
      if (!updatedRow) {
        throw new Error(
          "We couldn't save your profile changes right now. Please refresh and try again.",
        );
      }

      // Optimistic State Sync
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          ...topLevelUpdates,
          nerd_creds: mergedNerdCreds,
        } as DashboardProfile;
      });
    } catch (err: unknown) {
      console.error('SYSTEM_LOG: Profile Update Error:', err);
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  // Ensure profile row exists (portfolio_items.owner_id references profiles.id)
  const ensureProfileExists = async (
    userId: string,
    email: string,
    displayName: string,
  ) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (existing) return;
    const baseHandle =
      email.split('@')[0]?.toLowerCase().replace(/\W/g, '') || 'user';
    for (let attempts = 0; attempts < 10; attempts++) {
      const handle = attempts === 0 ? baseHandle : `${baseHandle}${attempts}`;
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email,
          handle,
          display_name: displayName,
          status: 'approved',
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      if (!upsertErr) {
        const { data: refetched } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (refetched) return;
      }
      if (upsertErr?.code === '23505') {
        const { data: refetched } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (refetched) return;
      }
      if (upsertErr && upsertErr.code !== '23505') break;
    }
    throw new Error('Could not create profile. Please try again.');
  };

  const isExternalProjectUrl = (url: string) =>
    /^https?:\/\//i.test(url.trim());

  // LOGIC SECTOR: ASSETS & PROJECTS
  const addProject = async (newProject: NewProject, imageFile?: File) => {
    try {
      const url = newProject.project_url?.trim() ?? '';
      if (!url) throw new Error('View project URL is required');
      if (!isExternalProjectUrl(url)) {
        throw new Error(
          'Project URL must be an external URL (e.g. https://...).',
        );
      }
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to add a project.');
      }

      await ensureProfileExists(
        session.user.id,
        session.user.email ?? '',
        session.user.user_metadata?.full_name ??
          session.user.email?.split('@')[0] ??
          'User',
      );

      let finalImageUrl = newProject.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `project-${Date.now()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-images').getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const { data, error: insertError } = await supabase
        .from('portfolio_items')
        .insert({
          owner_id: session.user.id,
          title: newProject.title,
          description: newProject.description,
          project_url: newProject.project_url.trim(),
          image_url: finalImageUrl,
          tech_stack: newProject.tech_stack,
        })
        .select()
        .single();

      if (insertError) throw new Error(toMessage(insertError));

      setProjects((prev) => [data as PortfolioItem, ...prev]);
    } catch (err) {
      console.error('Add Project Error:', err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to delete a project.');
      }

      const { error: deleteError } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', projectId)
        .eq('owner_id', session.user.id);

      if (deleteError) throw deleteError;

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error('Delete Project Error:', err);
      throw new Error(toMessage(err));
    }
  };

  const updateProject = async (
    projectId: string,
    updates: NewProject,
    imageFile?: File,
  ) => {
    try {
      const url = updates.project_url?.trim() ?? '';
      if (!url) throw new Error('View project URL is required');
      if (!isExternalProjectUrl(url)) {
        throw new Error(
          'Project URL must be an external URL (e.g. https://...).',
        );
      }
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to update a project.');
      }

      let finalImageUrl = updates.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `project-${Date.now()}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('project-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-images').getPublicUrl(filePath);

        finalImageUrl = publicUrl;
      }

      const { data, error: updateError } = await supabase
        .from('portfolio_items')
        .update({
          title: updates.title,
          description: updates.description,
          project_url: updates.project_url.trim(),
          image_url: finalImageUrl,
          tech_stack: updates.tech_stack,
        })
        .eq('id', projectId)
        .eq('owner_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? (data as PortfolioItem) : p)),
      );
    } catch (err) {
      console.error('Update Project Error:', err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to upload an avatar.');
      }

      const { blob } = await processAvatarForUpload(file);

      const ext =
        blob.type === 'image/png'
          ? 'png'
          : (file.name.split('.').pop() ?? 'jpg');
      const fileName = `${session.user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: blob.type });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await updateProfile({ avatar: publicUrl });
      return publicUrl;
    } catch (err) {
      console.error(err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const uploadResume = async (file: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to upload a resume.');
      }

      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
      if (ext !== '.pdf' && ext !== '.docx') {
        throw new Error(
          'Resume must be a PDF or Word document (.pdf or .docx only)',
        );
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/resume.${fileExt}`;

      const { error } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('resumes').getPublicUrl(fileName);

      await updateProfile({ resume_url: publicUrl });

      return publicUrl;
    } catch (err) {
      console.error(err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Refetch when auth session becomes available (e.g. restored from storage after mount)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) void fetchData();
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setProjects([]);
      }
    });
    return () => subscription.unsubscribe();
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
    updateProject,
    deleteProject,
    uploadResume,
  };
}
