import {
  faBehance,
  faDev,
  faDiscord,
  faDribbble,
  faFacebook,
  faFigma,
  faGithub,
  faGitlab,
  faInstagram,
  faLinkedin,
  faMastodon,
  faMedium,
  faReddit,
  faStackOverflow,
  faThreads,
  faTwitch,
  faTwitter,
  faXTwitter,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import { faGlobe, faRss } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { BoxProps } from '@mui/material';
import { Box } from '@mui/material';

// We extend BoxProps so we can pass sx, m, p, etc. to the icon container
interface LinkIconProps extends BoxProps {
  platform: string;
}

export const LinkIcon = ({ platform, ...props }: LinkIconProps) => {
  const key = platform?.toLowerCase() || 'custom';

  // 1. Define the Icon and the Brand Color
  let icon = faGlobe;
  let brandColor = '#757575'; // Default Grey

  switch (key) {
    // --- PROFESSIONAL / MAKER ---
    case 'linkedin':
      icon = faLinkedin;
      brandColor = '#0077b5';
      break;
    case 'github':
      icon = faGithub;
      brandColor = '#ffffff'; // White for dark mode
      break;
    case 'gitlab':
      icon = faGitlab;
      brandColor = '#fc6d26';
      break;
    case 'stack overflow':
      icon = faStackOverflow;
      brandColor = '#f48024';
      break;
    case 'dev.to':
      icon = faDev;
      brandColor = '#ffffff';
      break;
    case 'behance':
      icon = faBehance;
      brandColor = '#1769ff';
      break;
    case 'dribbble':
      icon = faDribbble;
      brandColor = '#ea4c89';
      break;
    case 'figma':
      icon = faFigma;
      brandColor = '#f24e1e';
      break;
    case 'notion':
      // Fallback for Notion (No free FA brand icon yet)
      icon = faGlobe;
      brandColor = '#ffffff';
      break;

    // --- SOCIAL / COMMUNITY ---
    case 'x':
      icon = faXTwitter;
      brandColor = '#ffffff';
      break;
    case 'twitter':
      icon = faTwitter;
      brandColor = '#1da1f2';
      break;
    case 'facebook':
      icon = faFacebook;
      brandColor = '#1877f2';
      break;
    case 'instagram':
      icon = faInstagram;
      brandColor = '#e4405f';
      break;
    case 'reddit':
      icon = faReddit;
      brandColor = '#ff4500';
      break;
    case 'discord':
      icon = faDiscord;
      brandColor = '#5865F2';
      break;
    case 'mastodon':
      icon = faMastodon;
      brandColor = '#6364ff';
      break;
    case 'threads':
      icon = faThreads;
      brandColor = '#ffffff';
      break;

    // --- CONTENT ---
    case 'youtube':
      icon = faYoutube;
      brandColor = '#ff0000';
      break;
    case 'twitch':
      icon = faTwitch;
      brandColor = '#9146ff';
      break;
    case 'medium':
      icon = faMedium;
      brandColor = '#ffffff';
      break;
    case 'substack':
      // Substack doesn't have a free FA icon yet, using generic RSS
      icon = faRss;
      brandColor = '#ff6719';
      break;

    // --- CUSTOM / DEFAULT ---
    default:
      icon = faGlobe;
      brandColor = 'inherit';
      break;
  }

  // 2. Render wrapped in a Box for MUI compatibility
  return (
    <Box
      component="span"
      {...props}
      sx={{
        color: brandColor,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem', // Default size
        ...props.sx, // Allow overrides
      }}
    >
      <FontAwesomeIcon icon={icon} />
    </Box>
  );
};
