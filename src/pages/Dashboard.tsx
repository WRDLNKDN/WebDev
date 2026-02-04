import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, Button, Container } from '@mui/material';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// MODULAR COMPONENTS
import { AddProjectCard } from '../components/portfolio/AddProjectCard';
import { AddProjectDialog } from '../components/portfolio/AddProjectDialog';
import { PortfolioFrame } from '../components/portfolio/PortfolioFrame';
import { ProjectCard } from '../components/portfolio/ProjectCard';
import { ResumeCard } from '../components/portfolio/ResumeCard';
import { EditProfileDialog } from '../components/profile/EditProfileDialog';
import { IdentityHeader } from '../components/profile/IdentityHeader';

// LOGIC & TYPES
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabaseClient';
import type { NerdCreds } from '../types/profile';
import { safeStr } from '../utils/stringUtils';

// ASSETS
const SYNERGY_BG = 'url("/assets/profile-bg.png")';

export const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);

  // AUTH GUARD
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/');
      } else {
        setSession(data.session);
      }
    });
  }, [navigate]);

  const {
    profile,
    projects,
    loading,
    updateProfile,
    uploadAvatar,
    addProject,
    uploadResume,
  } = useProfile();

  if (!session) return null;

  // DATA INGESTION
  const rawName = profile?.display_name || session.user.user_metadata.full_name;
  const displayName = safeStr(rawName, 'Verified Generalist');
  const tagline = safeStr(
    profile?.tagline,
    'Full Stack Developer | System Architect',
  );
  const avatarUrl = safeStr(
    profile?.avatar || session.user.user_metadata.avatar_url,
  );

  // TYPE-SAFE NERD CREDS
  const safeNerdCreds =
    profile?.nerd_creds && typeof profile.nerd_creds === 'object'
      ? (profile.nerd_creds as unknown as NerdCreds)
      : ({} as NerdCreds);

  const statusEmoji = safeStr(safeNerdCreds.status_emoji, '⚡');
  const statusMessage = safeStr(
    safeNerdCreds.status_message,
    'Charging: Focused on MVP',
  );
  const bio = safeStr(
    safeNerdCreds.bio,
    '"Building the Human OS. Prioritizing authenticity over engagement metrics."',
  );

  return (
    <Box
      sx={{
        backgroundImage: SYNERGY_BG,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        pt: 4,
        pb: 8,
        minHeight: '100vh',
      }}
    >
      <Container maxWidth="lg">
        {/* 1. IDENTITY SECTOR */}
        <IdentityHeader
          displayName={displayName}
          tagline={tagline}
          bio={bio}
          avatarUrl={avatarUrl}
          statusEmoji={statusEmoji}
          statusMessage={statusMessage}
          actions={
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditOpen(true)}
                disabled={loading}
                sx={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
              >
                Edit Profile
              </Button>
              <Button
                variant="text"
                startIcon={<SettingsIcon />}
                sx={{ color: 'text.secondary' }}
              >
                Settings
              </Button>
            </>
          }
        />

        {/* 2. PORTFOLIO SECTOR */}
        <PortfolioFrame title="Portfolio Frame">
          {/* INITIALIZE ACTION */}
          <AddProjectCard onClick={() => setIsAddProjectOpen(true)} />

          {/* VERIFIED DOCUMENT ACTION */}
          <ResumeCard
            url={profile?.resume_url}
            onUpload={uploadResume}
            isOwner
          />

          {/* ASYCHRONOUS PROJECT LIST */}
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </PortfolioFrame>
      </Container>

      {/* OVERLAY DIALOGS */}
      {profile && (
        <EditProfileDialog
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          profile={profile}
          onUpdate={updateProfile}
          onUpload={uploadAvatar}
        />
      )}

      <AddProjectDialog
        open={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSubmit={addProject}
      />
    </Box>
  );
};
