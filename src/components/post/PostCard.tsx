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
      { borderRadius: 2, minWidth: 0, position: 'relative' as const },
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
          pt: { xs: 1.25, sm: 2 },
          pb: { xs: 0.75, sm: 1 },
          '&:last-child': { pb: { xs: 1.25, sm: 2 } },
          px: { xs: 1.5, sm: 2 },
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
        <Box sx={{ minWidth: 0, ml: { xs: 6, sm: 7 } }}>{children}</Box>
      </Box>
    </CardContent>
  </Card>
);
