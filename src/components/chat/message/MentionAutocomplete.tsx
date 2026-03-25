import {
  Box,
  List,
  ListItemButton,
  Paper,
  Typography,
  useTheme,
} from '@mui/material';
import { denseMenuPaperSxFromTheme } from '../../../lib/ui/formSurface';
import React, { useMemo, useRef, useEffect, useReducer } from 'react';
import {
  computeMentionPanelLayout,
  MENTION_PANEL_VIEWPORT_GUTTER,
  readVisualViewportMetrics,
} from '../../../lib/chat/mentionPanelLayout';
import { ProfileAvatar } from '../../avatar/ProfileAvatar';

export type MentionableUser = {
  user_id: string;
  handle: string;
  display_name: string | null;
  avatar: string | null;
};

type MentionAutocompleteProps = {
  open: boolean;
  query: string;
  users: MentionableUser[];
  currentUserId: string | undefined;
  onSelect: (user: MentionableUser) => void;
  anchorEl: HTMLElement | null;
  onClose: () => void;
};

export const MentionAutocomplete = ({
  open,
  query,
  users,
  currentUserId,
  onSelect,
  anchorEl,
  onClose,
}: MentionAutocompleteProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const listRef = useRef<HTMLUListElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [, bumpLayout] = useReducer((n: number) => n + 1, 0);

  const filteredUsers = useMemo(() => {
    const others = users.filter((u) => u.user_id !== currentUserId);
    if (!query.trim()) return others;
    const lowerQuery = query.toLowerCase();
    return others.filter(
      (user) =>
        user.handle.toLowerCase().includes(lowerQuery) ||
        user.display_name?.toLowerCase().includes(lowerQuery),
    );
  }, [query, users, currentUserId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers.length, query]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredUsers.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter' && filteredUsers[selectedIndex]) {
        e.preventDefault();
        onSelect(filteredUsers[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredUsers, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (!listRef.current || selectedIndex < 0) return;
    const items = listRef.current.children;
    if (items[selectedIndex]) {
      (items[selectedIndex] as HTMLElement).scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!open || !anchorEl) return;
    const bump = () => bumpLayout();
    window.addEventListener('resize', bump);
    window.addEventListener('scroll', bump, true);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', bump);
    vv?.addEventListener('scroll', bump);
    return () => {
      window.removeEventListener('resize', bump);
      window.removeEventListener('scroll', bump, true);
      vv?.removeEventListener('resize', bump);
      vv?.removeEventListener('scroll', bump);
    };
  }, [open, anchorEl]);

  if (!open || !anchorEl) return null;

  const layout = computeMentionPanelLayout(
    anchorEl.getBoundingClientRect(),
    readVisualViewportMetrics(),
  );

  if (users.length === 0) {
    return (
      <Paper
        role="status"
        aria-live="polite"
        sx={{
          position: 'fixed',
          top: layout.top,
          left: layout.left,
          width: layout.width,
          maxWidth: `calc(100vw - ${MENTION_PANEL_VIEWPORT_GUTTER * 2}px)`,
          zIndex: (t) => t.zIndex.modal + 2,
          borderRadius: 2,
          p: 2,
          ...denseMenuPaperSxFromTheme(theme),
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No members with a handle are available to mention in this group.
        </Typography>
      </Paper>
    );
  }

  const maxHeight = layout.maxHeight;
  const activeMentionUser = filteredUsers[selectedIndex];
  const mentionActiveDescendantId = activeMentionUser
    ? `mention-opt-${activeMentionUser.user_id}`
    : undefined;
  /** Slightly taller rows on phones for reliable taps. */
  const itemHeight = 52;
  const maxVisible = Math.floor(maxHeight / itemHeight);
  const showScrollbar = filteredUsers.length > maxVisible;

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: layout.top,
        left: layout.left,
        width: layout.width,
        maxWidth: `calc(100vw - ${MENTION_PANEL_VIEWPORT_GUTTER * 2}px)`,
        maxHeight,
        overflow: 'hidden',
        zIndex: (t) => t.zIndex.modal + 2,
        borderRadius: 2,
        WebkitOverflowScrolling: 'touch',
        ...denseMenuPaperSxFromTheme(theme),
        boxShadow: isLight
          ? theme.shadows[12]
          : '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      <List
        ref={listRef}
        role="listbox"
        aria-label="Members to mention"
        aria-activedescendant={mentionActiveDescendantId}
        sx={{
          py: 0.5,
          maxHeight,
          overflowY: showScrollbar ? 'auto' : 'visible',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {filteredUsers.length === 0 ? (
          <Box role="status" aria-live="polite" sx={{ px: 2, py: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              No matching members. Use @ and pick someone, or type their exact
              handle.
            </Typography>
          </Box>
        ) : null}
        {filteredUsers.map((user, index) => (
          <ListItemButton
            key={user.user_id}
            id={`mention-opt-${user.user_id}`}
            role="option"
            aria-selected={index === selectedIndex}
            selected={index === selectedIndex}
            onMouseDown={(e) => {
              /* Keep focus on the composer so blur doesn’t cancel the tap (mobile + desktop). */
              e.preventDefault();
            }}
            onClick={() => onSelect(user)}
            onMouseEnter={() => setSelectedIndex(index)}
            onTouchStart={() => setSelectedIndex(index)}
            sx={{
              py: 1,
              minHeight: itemHeight,
              touchAction: 'manipulation',
              '&.Mui-selected': {
                bgcolor: 'rgba(45, 212, 191, 0.2)',
                '&:hover': {
                  bgcolor: 'rgba(45, 212, 191, 0.3)',
                },
              },
            }}
          >
            <ProfileAvatar
              src={user.avatar ?? undefined}
              alt={user.display_name || user.handle || '?'}
              size="small"
              sx={{ mr: 1.5, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: index === selectedIndex ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.display_name || user.handle}
              </Typography>
              {user.display_name && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  @{user.handle}
                </Typography>
              )}
            </Box>
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
};
