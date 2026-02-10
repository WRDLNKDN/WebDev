/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { NewProject, PortfolioItem } from '../types/portfolio';
import type { DashboardProfile, NerdCreds, SocialLink } from '../types/profile';
import type { Json } from '../types/supabase';

export function useProfile() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const { data: inserted, error: insertErr } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email,
              handle: attempts === 0 ? handle : `${handle}${attempts}`,
              display_name:
                session.user.user_metadata?.full_name ?? email.split('@')[0],
              status: 'pending',
            })
            .select('*')
            .single();
          if (!insertErr && inserted) {
            profileData = inserted as unknown as DashboardProfile;
            break;
          }
          if (insertErr?.code === '23505') {
            attempts += 1;
            continue;
          }
          break;
        }
        if (!profileData) {
          setLoading(false);
          setError('Could not create profile. Try again or contact support.');
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
      const safeSocials: SocialLink[] =
        Array.isArray(rawSocials) &&
        rawSocials.every(
          (s) =>
            s &&
            typeof s === 'object' &&
            'id' in s &&
            'url' in s &&
            'isVisible' in s,
        )
          ? (rawSocials as SocialLink[])
          : [];

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
      setError(err instanceof Error ? err.message : 'Failed to load data.');
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
      if (!session?.user) throw new Error('AUTH_FAILURE: No active session');

      // Preserve existing keys (Deep Merge)
      const currentCreds =
        (profile?.nerd_creds as Record<string, unknown>) || {};
      const newCreds = (updates.nerd_creds as Record<string, unknown>) || {};
      const mergedNerdCreds = { ...currentCreds, ...newCreds };

      // Strip nerd_creds to prevent double-mapping in the payload
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nerd_creds: _, ...topLevelUpdates } = updates;

      const payload = {
        ...topLevelUpdates,
        nerd_creds: mergedNerdCreds as unknown as Json,
        updated_at: new Date().toISOString(),
      };

      // 4. ASYNCHRONOUS EXECUTION (The Database Write)
      // Casting to 'any' here acts as a bridge while the schema synchronizes
      const { error: updateError } = await supabase
        .from('profiles')
        .update(payload as any)
        .eq('id', session.user.id);

      if (updateError) throw updateError;

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

  // LOGIC SECTOR: ASSETS & PROJECTS
  const addProject = async (newProject: NewProject, imageFile?: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No active session');

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

  const uploadAvatar = async (file: File) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user');

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

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
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('No user');

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
