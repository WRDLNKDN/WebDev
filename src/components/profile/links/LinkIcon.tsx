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

type LinkIconStyle = { Icon: IconComponent; brandColor: string };

function pickProfessionalLinkIcon(key: string): LinkIconStyle | null {
  switch (key) {
    case 'linkedin':
      return { Icon: LinkedIn, brandColor: '#0077b5' };
    case 'github':
      return { Icon: GitHub, brandColor: '#FFFFFF' };
    case 'gitlab':
      return { Icon: Code, brandColor: '#fc6d26' };
    case 'stack overflow':
    case 'stack exchange':
      return { Icon: Code, brandColor: '#f48024' };
    case 'dev.to':
      return { Icon: Code, brandColor: '#FFFFFF' };
    case 'behance':
      return { Icon: Palette, brandColor: '#1769ff' };
    case 'dribbble':
      return { Icon: Palette, brandColor: '#ea4c89' };
    case 'figma':
      return { Icon: DesignServices, brandColor: '#f24e1e' };
    case 'notion':
      return { Icon: Description, brandColor: '#FFFFFF' };
    default:
      return null;
  }
}

function pickSocialLinkIcon(key: string): LinkIconStyle | null {
  switch (key) {
    case 'x':
      return { Icon: X, brandColor: '#FFFFFF' };
    case 'twitter':
      return { Icon: Twitter, brandColor: '#1da1f2' };
    case 'facebook':
      return { Icon: Facebook, brandColor: '#1877f2' };
    case 'instagram':
      return { Icon: Instagram, brandColor: '#e4405f' };
    case 'tiktok':
      return { Icon: MusicNote, brandColor: '#FFFFFF' };
    case 'reddit':
      return { Icon: Reddit, brandColor: '#ff4500' };
    case 'discord':
      return { Icon: Forum, brandColor: '#5865F2' };
    case 'mastodon':
      return { Icon: Share, brandColor: '#6364ff' };
    case 'threads':
      return { Icon: Share, brandColor: '#FFFFFF' };
    default:
      return null;
  }
}

function pickContentLinkIcon(key: string): LinkIconStyle | null {
  switch (key) {
    case 'youtube':
      return { Icon: YouTube, brandColor: '#ff0000' };
    case 'twitch':
      return { Icon: VideoLibrary, brandColor: '#9146ff' };
    case 'medium':
      return { Icon: Article, brandColor: '#FFFFFF' };
    case 'substack':
      return { Icon: RssFeed, brandColor: '#ff6719' };
    case 'patreon':
      return { Icon: VolunteerActivism, brandColor: '#ff424d' };
    case 'calendly':
      return { Icon: CalendarMonth, brandColor: '#006bff' };
    default:
      return null;
  }
}

function pickCloudLinkIcon(key: string): LinkIconStyle | null {
  switch (key) {
    case 'box':
      return { Icon: Folder, brandColor: '#0061d5' };
    case 'dropbox':
      return { Icon: CloudQueue, brandColor: '#0061ff' };
    case 'google drive':
      return { Icon: Folder, brandColor: '#4285f4' };
    case 'mega':
      return { Icon: CloudQueue, brandColor: '#d9272e' };
    case 'onedrive':
      return { Icon: CloudQueue, brandColor: '#0078d4' };
    default:
      return null;
  }
}

function pickMusicLinkIcon(key: string): LinkIconStyle | null {
  switch (key) {
    case 'amazon music':
      return { Icon: LibraryMusic, brandColor: '#ff9900' };
    case 'apple music':
      return { Icon: LibraryMusic, brandColor: '#fa243c' };
    case 'bandcamp':
      return { Icon: LibraryMusic, brandColor: '#629aa9' };
    case 'pandora':
      return { Icon: LibraryMusic, brandColor: '#3668ff' };
    case 'soundcloud':
      return { Icon: LibraryMusic, brandColor: '#ff5500' };
    case 'spotify':
      return { Icon: LibraryMusic, brandColor: '#1db954' };
    case 'tidal':
      return { Icon: LibraryMusic, brandColor: '#5ce1e6' };
    default:
      return null;
  }
}

function pickGamesLinkIcon(key: string): LinkIconStyle | null {
  switch (key) {
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
      return { Icon: SportsEsports, brandColor: '#7dd3fc' };
    default:
      return null;
  }
}

function resolveLinkIconStyle(key: string): LinkIconStyle {
  return (
    pickProfessionalLinkIcon(key) ??
    pickSocialLinkIcon(key) ??
    pickContentLinkIcon(key) ??
    pickCloudLinkIcon(key) ??
    pickMusicLinkIcon(key) ??
    pickGamesLinkIcon(key) ?? { Icon: Public, brandColor: 'inherit' }
  );
}

export const LinkIcon = ({ platform, ...props }: LinkIconProps) => {
  const key = platform?.toLowerCase() || 'custom';
  const { Icon, brandColor } = resolveLinkIconStyle(key);

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
