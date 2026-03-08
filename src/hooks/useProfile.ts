import { useCallback, useEffect, useState } from 'react';
import {
  getCategoryForPlatform,
  isValidLinkCategory,
} from '../constants/platforms';
import { supabase } from '../lib/auth/supabaseClient';
import { authedFetch } from '../lib/api/authFetch';
import {
  detectPlatformFromUrl,
  findDuplicateNormalizedUrl,
  normalizeUrlForDedup,
} from '../lib/utils/linkPlatform';
import { processAvatarForUpload } from '../lib/utils/avatarResize';
import { getLinkType, normalizeGoogleUrl } from '../lib/portfolio/linkUtils';
import { getPortfolioUrlSafetyError } from '../lib/portfolio/linkValidation';
import {
  getPortfolioThumbnailStoragePathFromPublicUrl,
  getProjectImageStoragePathFromPublicUrl,
} from '../lib/portfolio/projectStorage';
import { getResumeStoragePathFromPublicUrl } from '../lib/portfolio/resumeStorage';
import { messageFromApiResponse, toMessage } from '../lib/utils/errors';
import {
  type NewProject,
  type PortfolioItem,
  RESUME_ITEM_ID,
} from '../types/portfolio';
import type { DashboardProfile, NerdCreds, SocialLink } from '../types/profile';
import type { Json } from '../types/supabase';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

/** Timeout for resume thumbnail generation request; after this we stop waiting and show error/retry. */
const RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS = 120_000;

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
        .map((s, index) => {
          const rawUrl = (s as { url: string }).url;
          const url = normalizeUrlForDedup(rawUrl) || rawUrl.trim();
          const platform = (() => {
            const candidate = (s as { platform?: unknown }).platform;
            return typeof candidate === 'string' && candidate.trim()
              ? candidate
              : detectPlatformFromUrl(url);
          })();
          const storedCategory = (s as { category?: unknown }).category;
          const category = isValidLinkCategory(storedCategory)
            ? storedCategory
            : getCategoryForPlatform(platform);
          return {
            ...(s as SocialLink),
            platform,
            category,
            isVisible: (s as { isVisible?: boolean }).isVisible !== false,
            order:
              typeof (s as { order?: number }).order === 'number'
                ? (s as { order: number }).order
                : index,
          };
        });
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
          .order('sort_order', { ascending: true })
          .order('id', { ascending: true });

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

      // Persist socials with category and platform; enforce URL uniqueness (API layer)
      let normalizedSocials: SocialLink[] | undefined;
      if (Array.isArray(payload.socials)) {
        const socials = payload.socials as SocialLink[];
        const duplicateUrl = findDuplicateNormalizedUrl(
          socials.map((link) => link.url),
        );
        if (duplicateUrl) {
          throw new Error(
            'Duplicate URLs are not allowed. Each link must have a unique URL.',
          );
        }
        normalizedSocials = socials.map((link) => {
          const normalizedUrl =
            normalizeUrlForDedup(link.url) || link.url.trim();
          const platform =
            link.platform?.trim() || detectPlatformFromUrl(normalizedUrl);
          const category = isValidLinkCategory(link.category)
            ? link.category
            : getCategoryForPlatform(platform);
          return { ...link, url: normalizedUrl, platform, category };
        });
        payload.socials = normalizedSocials as unknown as Json;
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

      // Optimistic State Sync — use normalized socials when present so UI matches DB
      setProfile((prev) => {
        if (!prev) return null;
        const next: DashboardProfile = {
          ...prev,
          ...topLevelUpdates,
          nerd_creds: mergedNerdCreds,
        } as DashboardProfile;
        if (normalizedSocials !== undefined) {
          next.socials = normalizedSocials;
        }
        return next;
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

      const projectUrlTrimmed = newProject.project_url.trim();
      const projectUrlSafetyError =
        getPortfolioUrlSafetyError(projectUrlTrimmed);
      if (projectUrlSafetyError) {
        throw new Error(projectUrlSafetyError);
      }
      const linkType = getLinkType(projectUrlTrimmed);
      const normalizedUrl =
        linkType === 'google_doc' ||
        linkType === 'google_sheet' ||
        linkType === 'google_slides'
          ? normalizeGoogleUrl(projectUrlTrimmed)
          : projectUrlTrimmed;
      const embedUrl =
        linkType === 'google_doc' ||
        linkType === 'google_sheet' ||
        linkType === 'google_slides'
          ? normalizedUrl !== projectUrlTrimmed
            ? normalizedUrl
            : null
          : null;
      const hasManualImage = Boolean(finalImageUrl);
      const thumbnailStatus = hasManualImage ? null : 'pending';

      const maxOrder = projects.length
        ? Math.max(
            ...projects.map((p) =>
              typeof p.sort_order === 'number' ? p.sort_order : 0,
            ),
          ) + 1
        : 0;

      const { data, error: insertError } = await supabase
        .from('portfolio_items')
        .insert({
          owner_id: session.user.id,
          title: newProject.title,
          description: newProject.description,
          project_url: projectUrlTrimmed,
          image_url: finalImageUrl,
          tech_stack: newProject.tech_stack,
          is_highlighted: Boolean(newProject.is_highlighted),
          sort_order: maxOrder,
          normalized_url: normalizedUrl,
          embed_url: embedUrl ?? undefined,
          resolved_type: linkType,
          thumbnail_status: thumbnailStatus,
        })
        .select()
        .single();

      if (insertError) throw new Error(toMessage(insertError));

      setProjects((prev) =>
        [...prev, data as PortfolioItem].sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      );
    } catch (err) {
      console.error('Add Project Error:', err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to delete a project.');
      }

      const { data: projectRow, error: projectFetchError } = await supabase
        .from('portfolio_items')
        .select('id, owner_id, image_url, thumbnail_url')
        .eq('id', projectId)
        .eq('owner_id', session.user.id)
        .maybeSingle();
      if (projectFetchError) throw projectFetchError;
      if (!projectRow) throw new Error('Artifact not found.');

      const imageStoragePath = getProjectImageStoragePathFromPublicUrl(
        typeof projectRow.image_url === 'string' ? projectRow.image_url : '',
      );
      const thumbnailStoragePath =
        getPortfolioThumbnailStoragePathFromPublicUrl(
          typeof projectRow.thumbnail_url === 'string'
            ? projectRow.thumbnail_url
            : '',
        );

      if (imageStoragePath) {
        const { error: removeImageError } = await supabase.storage
          .from('project-images')
          .remove([imageStoragePath]);
        if (removeImageError) throw removeImageError;
      }

      if (thumbnailStoragePath) {
        const { error: removeThumbError } = await supabase.storage
          .from('portfolio-thumbnails')
          .remove([thumbnailStoragePath]);
        if (removeThumbError) throw removeThumbError;
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
    } finally {
      setUpdating(false);
    }
  };

  const reorderProjects = async (orderedIds: string[]) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('You need to sign in to reorder projects.');
    }
    if (orderedIds.length < 2) return;

    let previousProjects: PortfolioItem[] = [];
    try {
      setUpdating(true);
      setProjects((prev) => {
        previousProjects = prev;
        const byId = new Map(prev.map((p) => [p.id, p]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((p): p is PortfolioItem => Boolean(p));
        const missing = prev.filter((p) => !orderedIds.includes(p.id));
        const next = [...reordered, ...missing].map((p, i) => ({
          ...p,
          sort_order: i,
        }));
        return next;
      });

      await Promise.all(
        orderedIds.map(async (id, index) => {
          const { error } = await supabase
            .from('portfolio_items')
            .update({ sort_order: index })
            .eq('id', id)
            .eq('owner_id', session.user.id);
          if (error) throw error;
        }),
      );
    } catch (err) {
      console.error('Reorder Projects Error:', err);
      if (previousProjects.length > 0) setProjects(previousProjects);
      throw new Error('Could not save artifact order. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  /** Reorder resume + projects together. orderedIds must include RESUME_ITEM_ID when profile has a resume. */
  const reorderPortfolioItems = async (orderedIds: string[]) => {
    const resumeIndex = orderedIds.indexOf(RESUME_ITEM_ID);
    const projectIds = orderedIds.filter((id) => id !== RESUME_ITEM_ID);
    if (projectIds.length > 0) {
      await reorderProjects(projectIds);
    }
    if (resumeIndex >= 0 && profile) {
      const creds = profile.nerd_creds ?? {};
      await updateProfile({
        nerd_creds: { ...creds, resume_display_index: resumeIndex },
      });
    }
  };

  const toggleProjectHighlight = async (
    projectId: string,
    isHighlighted: boolean,
  ) => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to update project highlights.');
      }

      const { data, error: updateError } = await supabase
        .from('portfolio_items')
        .update({
          is_highlighted: isHighlighted,
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
      console.error('Toggle Project Highlight Error:', err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
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

      const projectUrlTrimmed = updates.project_url.trim();
      const projectUrlSafetyError =
        getPortfolioUrlSafetyError(projectUrlTrimmed);
      if (projectUrlSafetyError) {
        throw new Error(projectUrlSafetyError);
      }
      const linkType = getLinkType(projectUrlTrimmed);
      const normalizedUrl =
        linkType === 'google_doc' ||
        linkType === 'google_sheet' ||
        linkType === 'google_slides'
          ? normalizeGoogleUrl(projectUrlTrimmed)
          : projectUrlTrimmed;
      const embedUrl =
        linkType === 'google_doc' ||
        linkType === 'google_sheet' ||
        linkType === 'google_slides'
          ? normalizedUrl !== projectUrlTrimmed
            ? normalizedUrl
            : null
          : null;
      const hasManualImage = Boolean(finalImageUrl);
      const thumbnailStatus = hasManualImage ? null : 'pending';

      const { data, error: updateError } = await supabase
        .from('portfolio_items')
        .update({
          title: updates.title,
          description: updates.description,
          project_url: projectUrlTrimmed,
          image_url: finalImageUrl,
          tech_stack: updates.tech_stack,
          is_highlighted: Boolean(updates.is_highlighted),
          normalized_url: normalizedUrl,
          embed_url: embedUrl ?? undefined,
          resolved_type: linkType,
          thumbnail_status: thumbnailStatus,
          thumbnail_url: null,
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
      if (ext !== '.pdf' && ext !== '.doc' && ext !== '.docx') {
        throw new Error(
          'Resume must be a PDF or Word document (.pdf, .doc, or .docx only)',
        );
      }

      const normalizedExt = ext.slice(1);
      const fileName = `${session.user.id}/resume.${normalizedExt}`;
      const originalResumeFileName =
        typeof file.name === 'string' && file.name.trim()
          ? file.name.trim()
          : `Resume.${normalizedExt}`;
      const contentType =
        ext === '.pdf'
          ? 'application/pdf'
          : ext === '.doc'
            ? 'application/msword'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      const { error } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true, contentType });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from('resumes').getPublicUrl(fileName);

      await updateProfile({
        resume_url: publicUrl,
        nerd_creds: {
          resume_file_name: originalResumeFileName,
          resume_thumbnail_url: undefined,
          resume_thumbnail_error: null,
          resume_thumbnail_updated_at: undefined,
          resume_thumbnail_source_extension: undefined,
          ...(ext === '.doc' || ext === '.docx'
            ? { resume_thumbnail_status: 'pending' }
            : { resume_thumbnail_status: undefined }),
        },
      });

      if (ext === '.doc' || ext === '.docx') {
        const thumbController = new AbortController();
        const thumbTimeout = setTimeout(
          () => thumbController.abort(),
          RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
        );
        try {
          const thumbResponse = await authedFetch(
            `${API_BASE}/api/resumes/generate-thumbnail`,
            {
              method: 'POST',
              body: JSON.stringify({ storagePath: fileName }),
              signal: thumbController.signal,
            },
            {
              includeJsonContentType: true,
              credentials: API_BASE ? 'omit' : 'include',
            },
          );
          clearTimeout(thumbTimeout);

          const thumbPayload = (await thumbResponse.json()) as
            | {
                ok?: boolean;
                data?: { status?: string; thumbnailUrl?: string };
                error?: string;
                message?: string;
              }
            | undefined;

          if (!thumbResponse.ok) {
            throw new Error(
              messageFromApiResponse(
                thumbResponse.status,
                thumbPayload?.error,
                thumbPayload?.message,
              ),
            );
          }
        } catch (thumbnailError) {
          clearTimeout(thumbTimeout);
          console.warn('Resume thumbnail generation failed:', thumbnailError);
          // Backend may have set nerd_creds to failed; sync so UI shows failed state and Retry, not stuck pending
          await fetchData();
          if (
            thumbnailError instanceof Error &&
            thumbnailError.name === 'AbortError'
          ) {
            throw new Error(
              'Preview generation timed out. You can try again from the resume card.',
            );
          }
        }
      }

      return publicUrl;
    } catch (err) {
      console.error(err);
      throw new Error(toMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  /** Remove resume from storage and clear profile. Fails with deterministic message on error. */
  const deleteResume = async () => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('You need to sign in to delete your resume.');
      }
      const resumeUrl =
        typeof profile?.resume_url === 'string' ? profile.resume_url : '';
      if (!resumeUrl) {
        throw new Error('No resume found to delete.');
      }
      // Storage path: "userId/resume.ext" (see uploadResume)
      const storagePath = getResumeStoragePathFromPublicUrl(resumeUrl);
      if (storagePath) {
        const { error } = await supabase.storage
          .from('resumes')
          .remove([storagePath]);
        if (error) throw error;
      }
      const currentCreds = profile?.nerd_creds ?? {};
      await updateProfile({
        resume_url: null,
        nerd_creds: {
          ...currentCreds,
          resume_file_name: null,
          resume_thumbnail_url: undefined,
          resume_thumbnail_status: undefined,
          resume_thumbnail_error: null,
          resume_thumbnail_updated_at: undefined,
          resume_thumbnail_source_extension: undefined,
        },
      });
    } catch (err) {
      console.error(err);
      throw new Error('Unable to delete resume. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const retryResumeThumbnail = async () => {
    try {
      setUpdating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error(
          'You need to sign in to retry resume preview generation.',
        );
      }
      const resumeUrl =
        typeof profile?.resume_url === 'string' ? profile.resume_url : '';
      if (!resumeUrl) throw new Error('No resume found to generate a preview.');

      const ext = '.' + (resumeUrl.split('.').pop()?.toLowerCase() ?? '');
      const supportedForPreview = ['.pdf', '.doc', '.docx'];
      if (!supportedForPreview.includes(ext)) {
        throw new Error(
          'Retry preview is only available for PDF and Word documents.',
        );
      }

      const parsedStoragePath = getResumeStoragePathFromPublicUrl(resumeUrl);
      const storagePath =
        parsedStoragePath && parsedStoragePath.startsWith(`${session.user.id}/`)
          ? parsedStoragePath
          : `${session.user.id}/resume.${ext.slice(1)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        RESUME_THUMBNAIL_REQUEST_TIMEOUT_MS,
      );
      let res: Response;
      let payload: { error?: string; message?: string } | undefined;
      try {
        res = await authedFetch(
          `${API_BASE}/api/resumes/generate-thumbnail`,
          {
            method: 'POST',
            body: JSON.stringify({ storagePath }),
            signal: controller.signal,
          },
          {
            includeJsonContentType: true,
            credentials: API_BASE ? 'omit' : 'include',
          },
        );
        payload = (await res.json()) as
          | { error?: string; message?: string }
          | undefined;
      } finally {
        clearTimeout(timeoutId);
      }

      // Always sync with backend (it sets complete or failed); avoids stuck "Generating preview..."
      await fetchData();

      if (!res!.ok) {
        throw new Error(
          messageFromApiResponse(res!.status, payload?.error, payload?.message),
        );
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.name === 'AbortError') {
        await fetchData();
        throw new Error(
          'Preview generation timed out. You can try again from the resume card.',
        );
      }
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
    toggleProjectHighlight,
    deleteProject,
    reorderProjects,
    reorderPortfolioItems,
    uploadResume,
    deleteResume,
    retryResumeThumbnail,
  };
}
