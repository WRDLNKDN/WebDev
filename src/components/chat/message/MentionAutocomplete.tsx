import { Box, List, ListItemButton, Paper, Typography } from '@mui/material';
import React, { useMemo, useRef, useEffect } from 'react';
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
  const listRef = useRef<HTMLUListElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const lowerQuery = query.toLowerCase();
    return users.filter(
      (user) =>
        user.user_id !== currentUserId &&
        (user.handle?.toLowerCase().includes(lowerQuery) ||
          user.display_name?.toLowerCase().includes(lowerQuery)),
    );
  }, [query, users, currentUserId]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers.length, query]);

  useEffect(() => {
    if (!open || !listRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  if (!open || !anchorEl || filteredUsers.length === 0) return null;

  const rect = anchorEl.getBoundingClientRect();
  const maxHeight = 200;
  const itemHeight = 48;
  const maxVisible = Math.floor(maxHeight / itemHeight);
  const showScrollbar = filteredUsers.length > maxVisible;

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(280, rect.width),
        maxHeight,
        overflow: 'hidden',
        zIndex: 1500,
        bgcolor: 'rgba(30,30,30,0.98)',
        border: '1px solid rgba(156,187,217,0.26)',
        borderRadius: 2,
        boxShadow:
          '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      <List
        ref={listRef}
        sx={{
          py: 0.5,
          maxHeight,
          overflowY: showScrollbar ? 'auto' : 'visible',
        }}
      >
        {filteredUsers.map((user, index) => (
          <ListItemButton
            key={user.user_id}
            selected={index === selectedIndex}
            onClick={() => onSelect(user)}
            onMouseEnter={() => setSelectedIndex(index)}
            sx={{
              py: 1,
              minHeight: itemHeight,
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
