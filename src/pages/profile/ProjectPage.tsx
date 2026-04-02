import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { AssetInlinePreview } from '../../components/media/AssetThumbnail';
import { AddProjectDialog } from '../../components/portfolio/dialogs/AddProjectDialog';
import { PortfolioPreviewModal } from '../../components/portfolio/dialogs/PortfolioPreviewModal';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/auth/supabaseClient';
import { getProjectPreviewFallbackLabel } from '../../lib/portfolio/projectPreview';
import { createNormalizedPortfolioAsset } from '../../lib/media/assets';
import type {
  NewProject,
  PortfolioItem,
  ProjectUploadFiles,
} from '../../types/portfolio';

function isExternalUrl(url: string): boolean {
  const t = url.trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

export const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, updateProject, projects } = useProfile();

  const [project, setProject] = useState<PortfolioItem | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id || id.trim() === '') {
        setLoading(false);
        setProject(null);
        return;
      }
      try {
        const [
          { data: projectData, error: projectError },
          {
            data: { session: s },
          },
        ] = await Promise.all([
          supabase
            .from('portfolio_items')
            .select('*')
            .eq('id', id.trim())
            .maybeSingle(),
          supabase.auth.getSession(),
        ]);

        if (cancelled) return;

        if (projectError) {
          console.error('ProjectPage load error:', projectError);
          setProject(null);
          setLoading(false);
          return;
        }
        if (!projectData) {
          setProject(null);
          setLoading(false);
          return;
        }

        setProject(projectData as PortfolioItem);
        setSession(s ?? null);
      } catch (err) {
        if (!cancelled) {
          console.error('ProjectPage load error:', err);
          setProject(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleUpdate = async (
    updates: NewProject,
    files?: ProjectUploadFiles,
    projectId?: string,
  ) => {
    if (!projectId) return;
    await updateProject(projectId, updates, files);
    setEditOpen(false);
    // Refresh project
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('id', projectId)
      .single();
    if (data) setProject(data as PortfolioItem);
  };

  const isOwner = Boolean(
    session?.user?.id && project && project.owner_id === session.user.id,
  );
  const projectUrl = project?.project_url?.trim() ?? '';
  const previewAsset = project ? createNormalizedPortfolioAsset(project) : null;
  const previewFallbackLabel = project
    ? getProjectPreviewFallbackLabel(project)
    : 'Project preview';

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress aria-label="Loading project" />
      </Box>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 5 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            border: '1px solid rgba(156,187,217,0.22)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            404
          </Typography>
          <Typography variant="h5" gutterBottom>
            Project not found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            This project may have been removed or the link might be wrong.
          </Typography>
          <Button component={RouterLink} to="/dashboard" variant="contained">
            Back to Dashboard
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 3,
          border: '1px solid rgba(156,187,217,0.22)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: { xs: 1.5, sm: 2 },
            mb: 3,
          }}
        >
          <Typography variant="h4" fontWeight={700}>
            {project.title}
          </Typography>
          {isOwner && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setEditOpen(true)}
              sx={{
                borderColor: 'rgba(141,188,229,0.50)',
                color: 'white',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Edit
            </Button>
          )}
        </Box>

        <Box
          sx={{
            width: '100%',
            mb: 3,
          }}
        >
          {previewAsset ? (
            <Box
              role="button"
              tabIndex={0}
              aria-label="Open project preview"
              onClick={() => setPreviewOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setPreviewOpen(true);
                }
              }}
              sx={{
                cursor: 'zoom-in',
              }}
            >
              <AssetInlinePreview
                asset={previewAsset}
                alt={project.title || previewFallbackLabel}
                surface="portfolio"
                sx={{
                  borderRadius: 2,
                  borderColor: 'rgba(156,187,217,0.18)',
                  bgcolor: 'rgba(56,132,210,0.08)',
                }}
              />
            </Box>
          ) : (
            <Typography color="text.secondary">
              {previewFallbackLabel}
            </Typography>
          )}
        </Box>

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {project.description ?? ''}
        </Typography>

        {projectUrl && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<VisibilityIcon />}
              onClick={() => setPreviewOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Preview
            </Button>
            {isExternalUrl(projectUrl) ? (
              <Button
                href={projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                endIcon={<OpenInNewIcon />}
                sx={{ textTransform: 'none' }}
              >
                View project
              </Button>
            ) : (
              <Button
                component={RouterLink}
                to={projectUrl}
                variant="contained"
                sx={{ textTransform: 'none' }}
              >
                View project
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ mt: 4 }}>
          <Button
            component={RouterLink}
            to="/dashboard"
            variant="text"
            sx={{ color: 'text.secondary' }}
          >
            ← Back to Dashboard
          </Button>
        </Box>
      </Paper>

      <AddProjectDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        initialProject={project}
        projectId={project.id}
        existingProjects={isOwner ? projects : []}
        existingLinkUrls={
          isOwner
            ? (profile?.socials ?? []).map((link: { url: string }) => link.url)
            : []
        }
      />
      <PortfolioPreviewModal
        project={project}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </Container>
  );
};

export default ProjectPage;
