import {
  Article,
  Code,
  DesignServices,
  Description,
  Facebook,
  Forum,
  GitHub,
  Instagram,
  LinkedIn,
  Palette,
  Public,
  Reddit,
  RssFeed,
  Share,
  Twitter,
  VideoLibrary,
  X,
  YouTube,
} from '@mui/icons-material';
import type { BoxProps, SvgIconProps } from '@mui/material';
import { Box } from '@mui/material';

// We extend BoxProps so we can pass sx, m, p, etc. to the icon container
interface LinkIconProps extends BoxProps {
  platform: string;
}

type IconComponent = React.ComponentType<SvgIconProps>;

export const LinkIcon = ({ platform, ...props }: LinkIconProps) => {
  const key = platform?.toLowerCase() || 'custom';

  // 1. Define the Icon and the Brand Color
  let Icon: IconComponent = Public;
  let brandColor = '#757575'; // Default Grey

  switch (key) {
    // --- PROFESSIONAL / MAKER ---
    case 'linkedin':
      Icon = LinkedIn;
      brandColor = '#0077b5';
      break;
    case 'github':
      Icon = GitHub;
      brandColor = '#ffffff';
      break;
    case 'gitlab':
      Icon = Code;
      brandColor = '#fc6d26';
      break;
    case 'stack overflow':
      Icon = Code;
      brandColor = '#f48024';
      break;
    case 'dev.to':
      Icon = Code;
      brandColor = '#ffffff';
      break;
    case 'behance':
      Icon = Palette;
      brandColor = '#1769ff';
      break;
    case 'dribbble':
      Icon = Palette;
      brandColor = '#ea4c89';
      break;
    case 'figma':
      Icon = DesignServices;
      brandColor = '#f24e1e';
      break;
    case 'notion':
      Icon = Description;
      brandColor = '#ffffff';
      break;

    // --- SOCIAL / COMMUNITY ---
    case 'x':
      Icon = X;
      brandColor = '#ffffff';
      break;
    case 'twitter':
      Icon = Twitter;
      brandColor = '#1da1f2';
      break;
    case 'facebook':
      Icon = Facebook;
      brandColor = '#1877f2';
      break;
    case 'instagram':
      Icon = Instagram;
      brandColor = '#e4405f';
      break;
    case 'reddit':
      Icon = Reddit;
      brandColor = '#ff4500';
      break;
    case 'discord':
      Icon = Forum;
      brandColor = '#5865F2';
      break;
    case 'mastodon':
      Icon = Share;
      brandColor = '#6364ff';
      break;
    case 'threads':
      Icon = Share;
      brandColor = '#ffffff';
      break;

    // --- CONTENT ---
    case 'youtube':
      Icon = YouTube;
      brandColor = '#ff0000';
      break;
    case 'twitch':
      Icon = VideoLibrary;
      brandColor = '#9146ff';
      break;
    case 'medium':
      Icon = Article;
      brandColor = '#ffffff';
      break;
    case 'substack':
      Icon = RssFeed;
      brandColor = '#ff6719';
      break;

    // --- CUSTOM / DEFAULT ---
    default:
      Icon = Public;
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
        fontSize: '1.25rem',
        ...props.sx,
      }}
    >
      <Icon sx={{ fontSize: 'inherit' }} />
    </Box>
  );
};
