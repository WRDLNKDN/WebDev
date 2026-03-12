import AddIcon from '@mui/icons-material/Add';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ResumeCard } from '../../components/portfolio/cards/ResumeCard';
import { PortfolioHighlightsCarousel } from '../../components/portfolio/layout/PortfolioHighlightsCarousel';
import { PortfolioSortableList } from '../../components/portfolio/layout/PortfolioSortableList';
import { GLASS_CARD } from '../../theme/candyStyles';
import { RESUME_ITEM_ID, type PortfolioItem } from '../../types/portfolio';

type Props = {
  loading: boolean;
  projects: PortfolioItem[];
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  resumeThumbnailUrl?: string | null;
  resumeThumbnailStatus?: 'pending' | 'complete' | 'failed' | null;
  resumeThumbnailError?: string | null;
  resumeDisplayIndex?: number;
  addMenuAnchor: HTMLElement | null;
  resumeFileInputRef: React.RefObject<HTMLInputElement | null>;
  updating: boolean;
  onOpenAddMenu: (anchor: HTMLElement) => void;
  onCloseAddMenu: () => void;
  onOpenLinks: () => void;
  onOpenResumePicker: () => void;
  onOpenNewProjectDialog: () => void;
  onResumeInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onResumeUpload: (file: File) => Promise<void>;
  onRetryThumbnail: () => Promise<void>;
  onDeleteResume: () => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onToggleHighlight: (id: string, highlighted: boolean) => Promise<void>;
  onEditProject: (project: PortfolioItem) => void;
  onOpenPreview: (project: PortfolioItem) => void;
};

const menuPaperSx = {
  mt: 1.5,
  minWidth: 200,
  borderRadius: 2,
  bgcolor: 'rgba(30,30,30,0.98)',
  border: '1px solid rgba(156,187,217,0.26)',
};

const addButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  color: 'white',
  background: 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
  border: 'none',
  minHeight: 34,
  py: 0.5,
  px: 1.5,
  fontSize: '0.8125rem',
  '&:hover': { background: 'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)' },
};

export const DashboardPortfolioSection = ({
  loading,
  projects,
  resumeUrl,
  resumeFileName,
  resumeThumbnailUrl,
  resumeThumbnailStatus,
  resumeThumbnailError,
  resumeDisplayIndex,
  addMenuAnchor,
  resumeFileInputRef,
  updating,
  onOpenAddMenu,
  onCloseAddMenu,
  onOpenLinks,
  onOpenResumePicker,
  onOpenNewProjectDialog,
  onResumeInputChange,
  onResumeUpload,
  onRetryThumbnail,
  onDeleteResume,
  onReorder,
  onDeleteProject,
  onToggleHighlight,
  onEditProject,
  onOpenPreview,
}: Props) => {
  const isEmpty = !resumeUrl && projects.length === 0;

  return (
    <Paper
      data-testid="portfolio-section"
      elevation={0}
      sx={{
        ...GLASS_CARD,
        p: { xs: 2, md: 3 },
        overflowX: 'hidden',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Typography
          variant="overline"
          sx={{
            display: 'block',
            mb: 2,
            letterSpacing: 2,
            color: 'text.secondary',
            fontWeight: 600,
          }}
        >
          PORTFOLIO
        </Typography>
        <input
          ref={resumeFileInputRef}
          type="file"
          hidden
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={onResumeInputChange}
        />

        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Start by adding links, a resume, or a project to build your public
            portfolio showcase.
          </Typography>
        ) : null}

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 2, justifyContent: 'flex-start' }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
            onClick={(e) => onOpenAddMenu(e.currentTarget)}
            disabled={loading}
            aria-label="Add links, resume, or project"
            aria-haspopup="true"
            aria-expanded={Boolean(addMenuAnchor)}
            sx={addButtonSx}
          >
            Add
          </Button>
          <Menu
            anchorEl={addMenuAnchor}
            open={Boolean(addMenuAnchor)}
            onClose={onCloseAddMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{ paper: { sx: menuPaperSx } }}
          >
            <MenuItem onClick={onOpenLinks} sx={{ py: 1.25 }}>
              + Add Links
            </MenuItem>
            {!resumeUrl ? (
              <MenuItem onClick={onOpenResumePicker} sx={{ py: 1.25 }}>
                + Add Resume
              </MenuItem>
            ) : null}
            <MenuItem onClick={onOpenNewProjectDialog} sx={{ py: 1.25 }}>
              + Add Project
            </MenuItem>
          </Menu>
        </Stack>

        <PortfolioHighlightsCarousel
          projects={projects}
          onOpenPreview={onOpenPreview}
        />

        {!isEmpty ? (
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 1, sm: 1.25, md: 1.5 },
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(280px, 1fr))',
                lg: 'repeat(4, minmax(240px, 1fr))',
              },
              justifyItems: 'stretch',
              alignItems: 'start',
            }}
          >
            <PortfolioSortableList
              orderedIds={(() => {
                const projectIds = projects.map((project) => project.id);
                if (!resumeUrl) return projectIds;
                const resumeIndex = Math.min(
                  Math.max(0, resumeDisplayIndex ?? 0),
                  projectIds.length,
                );
                return [
                  ...projectIds.slice(0, resumeIndex),
                  RESUME_ITEM_ID,
                  ...projectIds.slice(resumeIndex),
                ];
              })()}
              projects={projects}
              renderResumeCard={
                resumeUrl
                  ? (dragHandle) => (
                      <ResumeCard
                        url={resumeUrl}
                        fileName={resumeFileName ?? null}
                        thumbnailUrl={resumeThumbnailUrl ?? null}
                        thumbnailStatus={resumeThumbnailStatus ?? null}
                        thumbnailError={resumeThumbnailError ?? null}
                        onUpload={onResumeUpload}
                        onRetryThumbnail={() => void onRetryThumbnail()}
                        retryThumbnailBusy={updating}
                        onDelete={() => void onDeleteResume()}
                        deleteBusy={updating}
                        isOwner
                        dragHandle={dragHandle}
                      />
                    )
                  : undefined
              }
              isOwner
              onReorder={(ids) => void onReorder(ids)}
              onDelete={(id) => void onDeleteProject(id)}
              onToggleHighlight={(id, highlighted) =>
                void onToggleHighlight(id, highlighted)
              }
              onEdit={onEditProject}
              onOpenPreview={onOpenPreview}
            />
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
};
