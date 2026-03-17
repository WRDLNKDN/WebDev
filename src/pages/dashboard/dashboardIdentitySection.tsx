/**
 * Legacy Dashboard identity section. Not used; Dashboard.tsx renders IdentityHeader
 * directly with layoutVariant="three-column", IndustryGroupBlock in rightColumn, and
 * DashboardLinksSection below. See docs/PROFILE_LAYOUT.md. Do not use for new layout.
 */
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Box, Button, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { IdentityHeader } from '../../components/profile/identity/IdentityHeader';
import { ProfileLinksWidget } from '../../components/profile/links/ProfileLinksWidget';
import { parseNicheValues } from '../../lib/profile/nicheValues';
import { hasVisibleSocialLinks } from '../../lib/profile/visibleSocialLinks';
import type { SocialLink } from '../../types/profile';

type Props = {
  displayName: string;
  tagline?: string;
  bio: string;
  bioIsPlaceholder: boolean;
  avatarUrl: string;
  socialsArray: SocialLink[];
  loading: boolean;
  selectedSkills: string[];
  selectedIndustries: string[];
  nicheField?: string;
  profileMenuAnchor: HTMLElement | null;
  onOpenProfileMenu: (anchor: HTMLElement) => void;
  onCloseProfileMenu: () => void;
  onOpenSettings: () => void;
  onOpenLinks: () => void;
  onOpenEditProfile: () => void;
  onOpenShare: () => void;
  onViewProfile?: string;
  onRemoveLink: (id: string) => Promise<void>;
  onAddBio: () => void;
};

const menuPaperSx = {
  mt: 1.5,
  minWidth: 200,
  borderRadius: 2,
  bgcolor: 'rgba(30,30,30,0.98)',
  border: '1px solid rgba(156,187,217,0.26)',
};

const skillsPills = (skills: string[]) => (
  <Stack direction="row" flexWrap="wrap" gap={1}>
    {skills.map((skill) => (
      <Box
        key={`skill-${skill}`}
        data-testid="dashboard-pill"
        sx={{
          display: 'inline-flex',
          width: 'fit-content',
          maxWidth: '100%',
          whiteSpace: 'nowrap',
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          bgcolor: 'rgba(236,64,122,0.15)',
          border: '1px solid rgba(236,64,122,0.35)',
          fontSize: '0.78rem',
        }}
      >
        {skill}
      </Box>
    ))}
  </Stack>
);

const industryPills = (industries: string[], nicheField?: string) => {
  const otherValues = parseNicheValues(nicheField);
  return (
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {industries.map((industry) => (
        <Box
          key={`industry-${industry}`}
          data-testid="dashboard-pill"
          sx={{
            display: 'inline-flex',
            width: 'fit-content',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: 'rgba(66,165,245,0.15)',
            border: '1px solid rgba(66,165,245,0.35)',
            fontSize: '0.78rem',
          }}
        >
          {industry}
        </Box>
      ))}
      {otherValues.map((value) => (
        <Box
          key={`other-${value}`}
          data-testid="dashboard-pill"
          sx={{
            display: 'inline-flex',
            width: 'fit-content',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            px: 1.25,
            py: 0.5,
            borderRadius: 999,
            bgcolor: 'rgba(66,165,245,0.1)',
            border: '1px solid rgba(66,165,245,0.25)',
            fontSize: '0.78rem',
          }}
        >
          Other: {value}
        </Box>
      ))}
    </Stack>
  );
};

export const DashboardIdentitySection = ({
  displayName,
  tagline,
  bio,
  bioIsPlaceholder,
  avatarUrl,
  socialsArray,
  loading,
  selectedSkills,
  selectedIndustries,
  nicheField,
  profileMenuAnchor,
  onOpenProfileMenu,
  onCloseProfileMenu,
  onOpenSettings,
  onOpenLinks,
  onOpenEditProfile,
  onOpenShare,
  onViewProfile,
  onRemoveLink,
  onAddBio,
}: Props) => (
  <IdentityHeader
    displayName={displayName}
    tagline={tagline}
    bio={bio}
    bioIsPlaceholder={bioIsPlaceholder}
    onAddBio={bioIsPlaceholder ? onAddBio : undefined}
    avatarUrl={avatarUrl}
    slotLeftOfAvatar={
      loading || hasVisibleSocialLinks(socialsArray) ? (
        <ProfileLinksWidget
          socials={socialsArray}
          isOwner
          onRemove={(id) => void onRemoveLink(id)}
          grouped
          collapsible
          defaultExpanded
        />
      ) : undefined
    }
    slotUnderAvatarLabel={undefined}
    slotUnderAvatar={null}
    badges={
      selectedSkills.length > 0 ||
      selectedIndustries.length > 0 ||
      !!nicheField ? (
        <Stack spacing={1.25} sx={{ mt: 1 }}>
          {selectedSkills.length > 0 ? (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              Skills
            </Typography>
          ) : null}
          {selectedSkills.length > 0 ? skillsPills(selectedSkills) : null}
          {selectedIndustries.length > 0 || nicheField ? (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 700,
              }}
            >
              Industries
            </Typography>
          ) : null}
          {selectedIndustries.length > 0 || nicheField
            ? industryPills(selectedIndustries, nicheField)
            : null}
        </Stack>
      ) : undefined
    }
    slotBetweenContentAndActions={undefined}
    actions={
      <>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ flexWrap: 'wrap' }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => onOpenProfileMenu(e.currentTarget)}
            endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
            disabled={loading}
            aria-label="Profile menu"
            aria-haspopup="true"
            aria-expanded={Boolean(profileMenuAnchor)}
            sx={{
              borderColor: 'rgba(45, 212, 191, 0.6)',
              color: '#2dd4bf',
              minHeight: 38,
              fontSize: '0.875rem',
              py: 0.6,
              px: 1.5,
              '&:hover': {
                borderColor: '#2dd4bf',
                bgcolor: 'rgba(45, 212, 191, 0.12)',
              },
            }}
          >
            Profile
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onOpenSettings}
            disabled={loading}
            aria-label="Settings"
            sx={{
              borderColor: 'rgba(45, 212, 191, 0.6)',
              color: '#2dd4bf',
              minHeight: 38,
              fontSize: '0.875rem',
              py: 0.6,
              px: 1.5,
              '&:hover': {
                borderColor: '#2dd4bf',
                bgcolor: 'rgba(45, 212, 191, 0.12)',
              },
            }}
          >
            Settings
          </Button>
        </Stack>
        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={onCloseProfileMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: menuPaperSx } }}
        >
          <MenuItem onClick={onOpenLinks} sx={{ py: 1.25 }}>
            Add or Edit Links
          </MenuItem>
          <MenuItem onClick={onOpenEditProfile} sx={{ py: 1.25 }}>
            Edit Profile
          </MenuItem>
          {onViewProfile ? (
            <MenuItem
              component="a"
              href={onViewProfile}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onCloseProfileMenu}
              sx={{ py: 1.25 }}
            >
              View Profile
            </MenuItem>
          ) : null}
          <MenuItem onClick={onOpenShare} sx={{ py: 1.25 }}>
            Share My Profile
          </MenuItem>
        </Menu>
      </>
    }
  />
);
