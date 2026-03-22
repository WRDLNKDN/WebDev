import {
  Article,
  CalendarMonth,
  CloudQueue,
  Code,
  DesignServices,
  Description,
  Facebook,
  Folder,
  Forum,
  GitHub,
  Instagram,
  LibraryMusic,
  LinkedIn,
  Palette,
  Public,
  Reddit,
  RssFeed,
  Share,
  VolunteerActivism,
  MusicNote,
  SportsEsports,
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
      brandColor = '#FFFFFF';
      break;
    case 'gitlab':
      Icon = Code;
      brandColor = '#fc6d26';
      break;
    case 'stack overflow':
    case 'stack exchange':
      Icon = Code;
      brandColor = '#f48024';
      break;
    case 'dev.to':
      Icon = Code;
      brandColor = '#FFFFFF';
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
      brandColor = '#FFFFFF';
      break;

    // --- SOCIAL / COMMUNITY ---
    case 'x':
      Icon = X;
      brandColor = '#FFFFFF';
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
    case 'tiktok':
      Icon = MusicNote;
      brandColor = '#FFFFFF';
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
      brandColor = '#FFFFFF';
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
      brandColor = '#FFFFFF';
      break;
    case 'substack':
      Icon = RssFeed;
      brandColor = '#ff6719';
      break;
    case 'patreon':
      Icon = VolunteerActivism;
      brandColor = '#ff424d';
      break;
    case 'calendly':
      Icon = CalendarMonth;
      brandColor = '#006bff';
      break;

    // --- FILES / CLOUD STORAGE ---
    case 'box':
      Icon = Folder;
      brandColor = '#0061d5';
      break;
    case 'dropbox':
      Icon = CloudQueue;
      brandColor = '#0061ff';
      break;
    case 'google drive':
      Icon = Folder;
      brandColor = '#4285f4';
      break;
    case 'mega':
      Icon = CloudQueue;
      brandColor = '#d9272e';
      break;
    case 'onedrive':
      Icon = CloudQueue;
      brandColor = '#0078d4';
      break;

    // --- MUSIC ---
    case 'amazon music':
      Icon = LibraryMusic;
      brandColor = '#ff9900';
      break;
    case 'apple music':
      Icon = LibraryMusic;
      brandColor = '#fa243c';
      break;
    case 'bandcamp':
      Icon = LibraryMusic;
      brandColor = '#629aa9';
      break;
    case 'pandora':
      Icon = LibraryMusic;
      brandColor = '#3668ff';
      break;
    case 'soundcloud':
      Icon = LibraryMusic;
      brandColor = '#ff5500';
      break;
    case 'spotify':
      Icon = LibraryMusic;
      brandColor = '#1db954';
      break;
    case 'tidal':
      Icon = LibraryMusic;
      brandColor = '#5ce1e6';
      break;

    // --- GAMES ---
    case 'armor games':
    case 'epic games store':
    case 'game jolt':
    case 'github (game repo)':
    case 'itch.io':
    case 'kongregate':
    case 'newgrounds':
    case 'nintendo eshop':
    case 'playstation store':
    case 'roblox':
    case 'steam':
    case 'unity play':
    case 'web browser (playable web game)':
    case 'xbox / microsoft store':
      Icon = SportsEsports;
      brandColor = '#7dd3fc';
      break;
    case 'other':
      Icon = Public;
      brandColor = 'inherit';
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
