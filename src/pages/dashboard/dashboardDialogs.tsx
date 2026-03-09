import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { AddProjectDialog } from '../../components/portfolio/dialogs/AddProjectDialog';
import { PortfolioPreviewModal } from '../../components/portfolio/dialogs/PortfolioPreviewModal';
import { EditProfileDialog } from '../../components/profile/EditProfileDialog';
import { EditLinksDialog } from '../../components/profile/links/EditLinksDialog';
import { ShareProfileDialog } from '../../components/profile/links/ShareProfileDialog';
import { buildShareProfileUrl } from '../../lib/profile/shareProfileUrl';
import type {
  DashboardProfile,
  NerdCreds,
  SocialLink,
} from '../../types/profile';
import type { NewProject, PortfolioItem } from '../../types/portfolio';

type ProfileUpdatePayload = Partial<DashboardProfile> & {
  nerd_creds?: Partial<NerdCreds>;
};

type DashboardDialogsProps = {
  regenerateConfirmOpen: boolean;
  regenerating: boolean;
  onCloseRegenerateConfirm: () => void;
  onConfirmRegenerate: () => Promise<void>;
  isEditOpen: boolean;
  onCloseEdit: () => void;
  profile: DashboardProfile | null;
  editFocusBio: boolean;
  avatarFallback?: string;
  currentResolvedAvatarUrl?: string;
  onUpdateProfile: (updates: ProfileUpdatePayload) => Promise<void>;
  onUploadAvatar: (file: File) => Promise<string | undefined>;
  onOpenLinksFromEdit: () => void;
  onAvatarChanged: () => void;
  isLinksOpen: boolean;
  onCloseLinks: () => void;
  socialsArray: SocialLink[];
  projects: PortfolioItem[];
  onLinksUpdate: (updates: { socials: SocialLink[] }) => Promise<void>;
  isProjectDialogOpen: boolean;
  onCloseProjectDialog: () => void;
  onProjectSubmit: (
    project: NewProject,
    file?: File,
    projectId?: string,
  ) => Promise<void>;
  editingProject: PortfolioItem | null;
  previewProject: PortfolioItem | null;
  onClosePreview: () => void;
  isShareDialogOpen: boolean;
  onCloseShareDialog: () => void;
  shareToken: string | null;
  shareTokenLoading: boolean;
  shareTokenError: string | null;
  onCopyShare: () => Promise<void>;
  onOpenRegenerateConfirm: () => void;
};

export const DashboardDialogs = ({
  regenerateConfirmOpen,
  regenerating,
  onCloseRegenerateConfirm,
  onConfirmRegenerate,
  isEditOpen,
  onCloseEdit,
  profile,
  editFocusBio,
  avatarFallback,
  currentResolvedAvatarUrl,
  onUpdateProfile,
  onUploadAvatar,
  onOpenLinksFromEdit,
  onAvatarChanged,
  isLinksOpen,
  onCloseLinks,
  socialsArray,
  projects,
  onLinksUpdate,
  isProjectDialogOpen,
  onCloseProjectDialog,
  onProjectSubmit,
  editingProject,
  previewProject,
  onClosePreview,
  isShareDialogOpen,
  onCloseShareDialog,
  shareToken,
  shareTokenLoading,
  shareTokenError,
  onCopyShare,
  onOpenRegenerateConfirm,
}: DashboardDialogsProps) => (
  <>
    <Dialog
      open={regenerateConfirmOpen}
      onClose={() => !regenerating && onCloseRegenerateConfirm()}
      aria-labelledby="regenerate-share-link-title"
      aria-describedby="regenerate-share-link-description"
    >
      <DialogTitle id="regenerate-share-link-title">
        Regenerate share link?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="regenerate-share-link-description">
          Regenerating will break previously shared links. Anyone with the old
          link will no longer be able to view your profile. You can share the
          new link afterward.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onCloseRegenerateConfirm}
          disabled={regenerating}
          color="inherit"
        >
          Cancel
        </Button>
        <Button
          onClick={() => void onConfirmRegenerate()}
          variant="contained"
          color="primary"
          disabled={regenerating}
        >
          {regenerating ? 'Regenerating…' : 'Regenerate link'}
        </Button>
      </DialogActions>
    </Dialog>

    <EditProfileDialog
      open={isEditOpen}
      onClose={onCloseEdit}
      profile={profile}
      focusBioOnOpen={editFocusBio}
      avatarFallback={avatarFallback}
      currentResolvedAvatarUrl={currentResolvedAvatarUrl}
      onUpdate={onUpdateProfile}
      onUpload={onUploadAvatar}
      onManageLinks={onOpenLinksFromEdit}
      onAvatarChanged={onAvatarChanged}
    />

    <EditLinksDialog
      open={isLinksOpen}
      onClose={onCloseLinks}
      currentLinks={socialsArray}
      existingProjectUrls={projects.map((project) => project.project_url)}
      onUpdate={onLinksUpdate}
    />

    <AddProjectDialog
      open={isProjectDialogOpen}
      onClose={onCloseProjectDialog}
      existingProjects={projects}
      existingLinkUrls={socialsArray.map((social) => social.url)}
      onSubmit={onProjectSubmit}
      initialProject={editingProject}
      projectId={editingProject?.id}
    />

    <PortfolioPreviewModal
      project={previewProject}
      open={Boolean(previewProject)}
      onClose={onClosePreview}
    />

    <ShareProfileDialog
      open={isShareDialogOpen}
      onClose={onCloseShareDialog}
      shareUrl={shareToken ? buildShareProfileUrl(shareToken) : null}
      shareTokenLoading={shareTokenLoading}
      shareTokenError={shareTokenError}
      onCopy={() => void onCopyShare()}
      onRegenerate={onOpenRegenerateConfirm}
      regenerateBusy={regenerating}
    />
  </>
);
