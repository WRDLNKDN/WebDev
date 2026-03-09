import { Box, Container, Snackbar } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildShareProfileUrl } from '../../lib/profile/shareProfileUrl';
import { toMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/auth/supabaseClient';
import { DashboardDialogs } from './dashboardDialogs';
import { DashboardIdentitySection } from './dashboardIdentitySection';
import { DashboardPortfolioSection } from './dashboardPortfolioSection';
import { useDashboardController } from './useDashboardController';

export const Dashboard = () => {
  const navigate = useNavigate();
  const ctrl = useDashboardController();
  const { session, profileState, derived, avatar, state } = ctrl;

  if (!session) return null;

  const handleResumeUpload = async (file: File) => {
    try {
      await profileState.uploadResume(file);
      await profileState.refresh();
    } catch (cause) {
      state.setSnack(toMessage(cause));
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        pt: { xs: 2, md: 4 },
        pb: { xs: 'calc(32px + env(safe-area-inset-bottom))', md: 8 },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
        <DashboardIdentitySection
          displayName={derived.displayName}
          tagline={profileState.profile?.tagline ?? undefined}
          bio={derived.bio}
          bioIsPlaceholder={!derived.hasDescription}
          avatarUrl={avatar.avatarUrl}
          socialsArray={derived.socialsArray}
          loading={profileState.loading}
          selectedSkills={derived.selectedSkills}
          selectedIndustries={derived.selectedIndustries}
          nicheField={derived.nicheField}
          profileMenuAnchor={state.profileMenuAnchor}
          onOpenProfileMenu={state.setProfileMenuAnchor}
          onCloseProfileMenu={() => state.setProfileMenuAnchor(null)}
          onOpenSettings={() => navigate('/dashboard/settings')}
          onOpenLinks={() => {
            state.setProfileMenuAnchor(null);
            state.setIsLinksOpen(true);
          }}
          onOpenEditProfile={() => {
            state.setProfileMenuAnchor(null);
            state.setIsEditOpen(true);
          }}
          onOpenShare={() => {
            state.setProfileMenuAnchor(null);
            state.setIsShareDialogOpen(true);
          }}
          onViewProfile={
            profileState.profile?.handle
              ? `/p/h~${encodeURIComponent(profileState.profile.handle)}`
              : undefined
          }
          onAddBio={() => {
            state.setProfileMenuAnchor(null);
            state.setEditFocusBio(true);
            state.setIsEditOpen(true);
          }}
          onRemoveLink={async (linkId) => {
            const next = derived.socialsArray.filter(
              (link) => link.id !== linkId,
            );
            state.setSavedLinksOverride(next);
            state.lastLinksRef.current = next;
            try {
              await profileState.updateProfile({ socials: next });
              await profileState.refresh();
            } catch (cause) {
              state.setSnack(toMessage(cause));
            }
          }}
        />

        <DashboardPortfolioSection
          loading={profileState.loading}
          projects={profileState.projects}
          resumeUrl={profileState.profile?.resume_url}
          resumeFileName={
            typeof derived.safeNerdCreds.resume_file_name === 'string'
              ? derived.safeNerdCreds.resume_file_name
              : null
          }
          resumeThumbnailUrl={
            typeof derived.safeNerdCreds.resume_thumbnail_url === 'string'
              ? derived.safeNerdCreds.resume_thumbnail_url
              : null
          }
          resumeThumbnailStatus={
            derived.safeNerdCreds.resume_thumbnail_status === 'pending' ||
            derived.safeNerdCreds.resume_thumbnail_status === 'complete' ||
            derived.safeNerdCreds.resume_thumbnail_status === 'failed'
              ? derived.safeNerdCreds.resume_thumbnail_status
              : null
          }
          resumeThumbnailError={
            typeof derived.safeNerdCreds.resume_thumbnail_error === 'string'
              ? derived.safeNerdCreds.resume_thumbnail_error
              : null
          }
          resumeDisplayIndex={derived.safeNerdCreds.resume_display_index ?? 0}
          addMenuAnchor={state.addMenuAnchor}
          resumeFileInputRef={state.resumeFileInputRef}
          updating={profileState.updating}
          onOpenAddMenu={state.setAddMenuAnchor}
          onCloseAddMenu={() => state.setAddMenuAnchor(null)}
          onOpenLinks={() => {
            state.setAddMenuAnchor(null);
            state.setIsLinksOpen(true);
          }}
          onOpenResumePicker={() => {
            state.setAddMenuAnchor(null);
            const input = state.resumeFileInputRef.current;
            if (!input) return;
            input.value = '';
            input.click();
          }}
          onOpenNewProjectDialog={() => {
            state.setAddMenuAnchor(null);
            state.setEditingProject(null);
            state.setIsProjectDialogOpen(true);
          }}
          onResumeInputChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (file) void handleResumeUpload(file);
            event.target.value = '';
          }}
          onResumeUpload={handleResumeUpload}
          onRetryThumbnail={async () => {
            try {
              await profileState.retryResumeThumbnail();
            } catch (cause) {
              state.setSnack(toMessage(cause));
            }
          }}
          onDeleteResume={async () => {
            try {
              await profileState.deleteResume();
              await profileState.refresh();
            } catch (cause) {
              state.setSnack(toMessage(cause));
            }
          }}
          onReorder={async (orderedIds) => {
            try {
              await profileState.reorderPortfolioItems(orderedIds);
            } catch (cause) {
              state.setSnack(toMessage(cause));
            }
          }}
          onDeleteProject={async (id) => {
            try {
              await profileState.deleteProject(id);
            } catch (cause) {
              state.setSnack(toMessage(cause));
            }
          }}
          onToggleHighlight={async (id, highlighted) => {
            try {
              await profileState.toggleProjectHighlight(id, highlighted);
            } catch (cause) {
              state.setSnack(toMessage(cause));
            }
          }}
          onEditProject={(project) => {
            state.setEditingProject(project);
            state.setIsProjectDialogOpen(true);
          }}
          onOpenPreview={state.setPreviewProject}
        />
      </Container>

      <DashboardDialogs
        regenerateConfirmOpen={state.regenerateConfirmOpen}
        regenerating={state.regenerating}
        onCloseRegenerateConfirm={() => state.setRegenerateConfirmOpen(false)}
        onConfirmRegenerate={async () => {
          state.setRegenerating(true);
          try {
            const { data, error } = await supabase.rpc(
              'regenerate_profile_share_token',
            );
            if (error) {
              state.setSnack(toMessage(error));
              return;
            }
            state.setShareToken(typeof data === 'string' ? data : null);
            state.setRegenerateConfirmOpen(false);
            state.setSnack(
              'New link generated. Previous link no longer works.',
            );
          } catch (cause) {
            state.setSnack(toMessage(cause));
          } finally {
            state.setRegenerating(false);
          }
        }}
        isEditOpen={state.isEditOpen}
        onCloseEdit={() => {
          state.setIsEditOpen(false);
          state.setEditFocusBio(false);
          void profileState.refresh();
          void avatar.refreshAvatar();
        }}
        profile={profileState.profile}
        editFocusBio={state.editFocusBio}
        avatarFallback={
          session.user.user_metadata?.avatar_url as string | undefined
        }
        currentResolvedAvatarUrl={avatar.resolvedAvatarUrl ?? undefined}
        onUpdateProfile={profileState.updateProfile}
        onUploadAvatar={profileState.uploadAvatar}
        onOpenLinksFromEdit={() => {
          state.setEditFocusBio(false);
          state.setIsEditOpen(false);
          state.setIsLinksOpen(true);
        }}
        onAvatarChanged={() => {
          void profileState.refresh();
          void avatar.refreshAvatar();
        }}
        isLinksOpen={state.isLinksOpen}
        onCloseLinks={() => state.setIsLinksOpen(false)}
        socialsArray={derived.socialsArray}
        projects={profileState.projects}
        onLinksUpdate={async (updates) => {
          if (Array.isArray(updates.socials)) {
            state.lastLinksRef.current = updates.socials;
            state.setSavedLinksOverride(updates.socials);
          }
          await profileState.updateProfile(updates);
          await new Promise((resolve) => setTimeout(resolve, 350));
          await profileState.refresh();
        }}
        isProjectDialogOpen={state.isProjectDialogOpen}
        onCloseProjectDialog={() => {
          state.setIsProjectDialogOpen(false);
          state.setEditingProject(null);
        }}
        onProjectSubmit={async (project, file, projectId) => {
          if (projectId) {
            await profileState.updateProject(projectId, project, file);
            return;
          }
          await profileState.addProject(project, file);
        }}
        editingProject={state.editingProject}
        previewProject={state.previewProject}
        onClosePreview={() => state.setPreviewProject(null)}
        isShareDialogOpen={state.isShareDialogOpen}
        onCloseShareDialog={() => state.setIsShareDialogOpen(false)}
        shareToken={state.shareToken}
        shareTokenLoading={state.shareTokenLoading}
        shareTokenError={state.shareTokenError}
        onCopyShare={async () => {
          if (!state.shareToken) return;
          try {
            await navigator.clipboard.writeText(
              buildShareProfileUrl(state.shareToken),
            );
            state.setSnack('Link copied to clipboard.');
          } catch {
            state.setSnack('Could not copy link.');
          }
        }}
        onOpenRegenerateConfirm={() => state.setRegenerateConfirmOpen(true)}
      />

      <Snackbar
        open={Boolean(state.snack)}
        autoHideDuration={6000}
        onClose={() => state.setSnack(null)}
        message={state.snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 'env(safe-area-inset-bottom)', md: 0 } }}
      />
    </Box>
  );
};
