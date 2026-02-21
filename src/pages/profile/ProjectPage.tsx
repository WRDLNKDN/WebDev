import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
import { AddProjectDialog } from '../../components/portfolio/AddProjectDialog';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/auth/supabaseClient';
import type { NewProject, PortfolioItem } from '../../types/portfolio';

function isExternalUrl(url: string): boolean {
  const t = url.trim();
  return t.startsWith('http://') || t.startsWith('https://');
}

export const ProjectPage = () => {
  const { id } = useParams<{ id: string }>();
  const { updateProject } = useProfile();

  const [project, setProject] = useState<PortfolioItem | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

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
    file?: File,
    projectId?: string,
  ) => {
    if (!projectId) return;
    await updateProject(projectId, updates, file);
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
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Project not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This project may have been removed or the link might be wrong.
        </Typography>
        <Button component={RouterLink} to="/dashboard" variant="contained">
          Back to Dashboard
        </Button>
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
          bgcolor: 'rgba(30,30,30,0.7)',
          border: '1px solid rgba(255,255,255,0.1)',
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
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                width: { xs: '100%', sm: 'auto' },
              }}
            >
              Edit
            </Button>
          )}
        </Box>

        {project.image_url && (
          <Box
            component="img"
            src={project.image_url}
            alt={project.title}
            sx={{
              width: '100%',
              maxHeight: 360,
              objectFit: 'cover',
              borderRadius: 2,
              mb: 3,
            }}
          />
        )}

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {project.description ?? ''}
        </Typography>

        {projectUrl && (
          <Box>
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
      />
    </Container>
  );
};

export default ProjectPage;
