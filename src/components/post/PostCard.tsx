/**
 * PostCard — canonical Post container used by Feed and Chat Full / Groups.
 * Renders: Card shell, optional three-dot menu, PostAuthor (avatar, name, handle, time), and body/reactions as children.
 * Container must never redefine Post behavior; this component defines it.
 */
import { Box, Card, CardContent } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { PostActionMenu } from './PostActionMenu';
import type { PostActionMenuItem } from './PostActionMenu';
import { PostAuthor } from './PostAuthor';
import type { PostAuthorProps } from './PostAuthor';

export type PostCardProps = {
  /** Author line (avatar, displayName, handle, createdAt, editedAt, formatTime, optional children e.g. repost line) */
  author: PostAuthorProps;
  /** Three-dot menu items; when present and visible, menu is shown top-right */
  actionMenu?: {
    items: PostActionMenuItem[];
    ariaLabel?: string;
    visible: boolean;
  } | null;
  /** Body, link preview, images, reactions, etc. */
  children: React.ReactNode;
  /** Card-level sx (e.g. Feed: default; Chat: bgcolor, maxWidth, alignSelf) */
  sx?: SxProps<Theme>;
  /** Content padding override */
  contentSx?: SxProps<Theme>;
};

export const PostCard = ({
  author,
  actionMenu,
  children,
  sx,
  contentSx,
}: PostCardProps) => (
  <Card
    variant="outlined"
    sx={[
      {
        borderRadius: 2.75,
        minWidth: 0,
        position: 'relative' as const,
        borderColor: 'rgba(156,187,217,0.22)',
        bgcolor: 'rgba(24,28,35,0.96)',
        boxShadow:
          '0 20px 38px rgba(0,0,0,0.18), 0 0 0 1px rgba(56,132,210,0.06) inset',
        overflow: 'hidden',
      },
      ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
    ]}
  >
    {actionMenu?.visible && actionMenu.items.length > 0 && (
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <PostActionMenu
          ariaLabel={actionMenu.ariaLabel}
          visible
          items={actionMenu.items}
        />
      </Box>
    )}
    <CardContent
      sx={[
        {
          pt: { xs: 1.35, sm: 1.65 },
          pb: { xs: 0.75, sm: 0.95 },
          '&:last-child': { pb: { xs: 1.25, sm: 2 } },
          px: { xs: 1.35, sm: 1.65 },
          pr: { xs: 6.25, sm: 6.75 },
        },
        ...(Array.isArray(contentSx)
          ? contentSx
          : contentSx
            ? [contentSx]
            : []),
      ]}
    >
      <Box sx={{ minWidth: 0 }}>
        <PostAuthor {...author} />
        {/* Align body/actions with right edge of avatar */}
        <Box sx={{ minWidth: 0, ml: { xs: 5.75, sm: 6.5 } }}>{children}</Box>
      </Box>
    </CardContent>
  </Card>
);
