import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/auth/supabaseClient';
import { toMessage } from '../lib/utils/errors';
import {
  type NewProject,
  type PortfolioItem,
  type ProjectUploadFiles,
  RESUME_ITEM_ID,
} from '../types/portfolio';
import type { DashboardProfile, NerdCreds } from '../types/profile';
import { fetchProfileData, updateProfileData } from './profile/useProfileData';
import {
  addProjectItem,
  deleteProjectItem,
  reorderProjectItems,
} from './profile/useProfileProjects';
import {
  toggleProjectHighlightItem,
  updateProjectItem,
} from './profile/useProfileProjectMutations';
import {
  deleteResumeAsset,
  normalizeThrownError,
  retryResumeThumbnailAsset,
  uploadAvatarAsset,
  uploadResumeAsset,
  uploadResumeThumbnailImageAsset,
} from './profile/useProfileAssets';

export function useProfile() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    await fetchProfileData({ setLoading, setError, setProfile, setProjects });
  }, []);

  const updateProfile = async (
    updates: Partial<DashboardProfile> & { nerd_creds?: Partial<NerdCreds> },
  ) => {
    try {
      setUpdating(true);
      await updateProfileData({ profile, updates, fetchData, setProfile });
    } catch (cause) {
      console.error('SYSTEM_LOG: Profile Update Error:', cause);
      throw cause;
    } finally {
      setUpdating(false);
    }
  };

  const addProject = async (
    newProject: NewProject,
    files?: ProjectUploadFiles,
  ) => {
    try {
      setUpdating(true);
      await addProjectItem({ newProject, files, projects, setProjects });
    } catch (cause) {
      console.error('Add Project Error:', cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      setUpdating(true);
      await deleteProjectItem({ projectId, setProjects });
    } catch (cause) {
      console.error('Delete Project Error:', cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  const reorderProjects = async (orderedIds: string[]) => {
    try {
      setUpdating(true);
      await reorderProjectItems({ orderedIds, setProjects });
    } finally {
      setUpdating(false);
    }
  };

  const reorderPortfolioItems = async (orderedIds: string[]) => {
    const resumeIndex = orderedIds.indexOf(RESUME_ITEM_ID);
    const projectIds = orderedIds.filter((id) => id !== RESUME_ITEM_ID);
    if (projectIds.length > 0) await reorderProjects(projectIds);

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
      await toggleProjectHighlightItem({
        projectId,
        isHighlighted,
        setProjects,
      });
    } catch (cause) {
      console.error('Toggle Project Highlight Error:', cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  const updateProject = async (
    projectId: string,
    updates: NewProject,
    files?: ProjectUploadFiles,
  ) => {
    try {
      setUpdating(true);
      await updateProjectItem({ projectId, updates, files, setProjects });
    } catch (cause) {
      console.error('Update Project Error:', cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    try {
      setUpdating(true);
      return await uploadAvatarAsset({ file, updateProfile });
    } catch (cause) {
      console.error(cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  const uploadResume = async (file: File) => {
    try {
      setUpdating(true);
      return await uploadResumeAsset({
        file,
        updateProfile,
        fetchData,
        profile,
      });
    } catch (cause) {
      console.error(cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  const deleteResume = async () => {
    try {
      setUpdating(true);
      await deleteResumeAsset({ profile, updateProfile });
    } catch (cause) {
      console.error(cause);
      throw new Error('Unable to delete resume. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const retryResumeThumbnail = async () => {
    try {
      setUpdating(true);
      await retryResumeThumbnailAsset({ profile, fetchData });
    } catch (cause) {
      console.error(cause);
      throw new Error(normalizeThrownError(cause));
    } finally {
      setUpdating(false);
    }
  };

  const uploadResumeThumbnailImage = async (file: File) => {
    try {
      setUpdating(true);
      await uploadResumeThumbnailImageAsset({
        file,
        updateProfile,
        profile,
      });
    } catch (cause) {
      console.error(cause);
      throw new Error(toMessage(cause));
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
    uploadResumeThumbnailImage,
    deleteResume,
    retryResumeThumbnail,
  };
}
