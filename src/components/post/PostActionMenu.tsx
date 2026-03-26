/**
 * PostActionMenu — kebab menu for feed posts and chat messages.
 * Chat message order is defined in MessageList (reply, forward, copy, edit, delete, report).
 */
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { ReactNode } from 'react';
import { useState } from 'react';

export type PostActionMenuItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  /** Red/warning style (e.g. Delete, Report) */
  danger?: boolean;
  disabled?: boolean;
};

export type PostActionMenuProps = {
  items: PostActionMenuItem[];
  ariaLabel?: string;
  /** Only render button when this is true (e.g. isOwner && !deleted) */
  visible?: boolean;
  /** Chat messages: smaller, lower-contrast trigger */
  density?: 'default' | 'subtle';
};

export const PostActionMenu = ({
  items,
  ariaLabel = 'Options',
  visible = true,
  density = 'default',
}: PostActionMenuProps) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const menuId = open ? 'post-action-menu' : undefined;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  if (!visible || items.length === 0) return null;

  const subtle = density === 'subtle';
  const subtleLight = subtle && theme.palette.mode === 'light';

  return (
    <>
      <Tooltip title={ariaLabel}>
        <IconButton
          size="small"
          onClick={handleOpen}
          aria-label={ariaLabel}
          aria-controls={menuId}
          aria-haspopup="true"
          aria-expanded={open}
          sx={{
            width: subtle ? 32 : 44,
            height: subtle ? 32 : 44,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: subtle ? 1.25 : '18px',
            color: subtleLight
              ? 'rgba(0,0,0,0.45)'
              : subtle
                ? 'rgba(255,255,255,0.5)'
                : 'rgba(255,255,255,0.82)',
            bgcolor: subtleLight
              ? 'rgba(0,0,0,0.05)'
              : subtle
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(132,154,214,0.14)',
            border: subtleLight
              ? '1px solid rgba(0,0,0,0.1)'
              : subtle
                ? '1px solid rgba(255,255,255,0.1)'
                : '1px solid rgba(173,203,255,0.18)',
            boxShadow: subtle
              ? 'none'
              : '0 12px 26px rgba(4,10,25,0.42), inset 0 1px 0 rgba(156,187,217,0.26)',
            transition:
              'background-color 120ms ease, color 120ms ease, transform 120ms ease, border-color 120ms ease',
            ...(!subtle
              ? {
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 1,
                    borderRadius: '16px',
                    background:
                      'radial-gradient(circle at 30% 28%, rgba(156,187,217,0.32), rgba(56,132,210,0.06) 48%, rgba(132,154,214,0.08) 100%)',
                    pointerEvents: 'none',
                  },
                }
              : {}),
            '&:hover': {
              bgcolor: subtleLight
                ? 'rgba(0,0,0,0.08)'
                : subtle
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(148,175,232,0.18)',
              borderColor: subtleLight
                ? 'rgba(0,0,0,0.16)'
                : subtle
                  ? 'rgba(255,255,255,0.18)'
                  : 'rgba(191,219,254,0.32)',
              color: subtleLight
                ? 'rgba(0,0,0,0.78)'
                : subtle
                  ? 'rgba(255,255,255,0.92)'
                  : '#FFFFFF',
              transform: subtle ? 'none' : 'scale(1.04)',
            },
            '&:focus-visible': {
              outline: '2px solid rgba(191,219,254,0.78)',
              outlineOffset: 2,
            },
          }}
        >
          <MoreVertIcon sx={{ fontSize: subtle ? 18 : undefined }} />
        </IconButton>
      </Tooltip>
      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          root: {
            sx: { zIndex: 1600 },
          },
          paper: {
            elevation: 0,
            sx: {
              zIndex: 1600,
              mt: 0.9,
              minWidth: 268,
              borderRadius: 2,
              color: '#f8fafc',
              border: '1px solid rgba(125,211,252,0.82)',
              bgcolor: 'rgba(16,22,31,0.985)',
              boxShadow:
                '0 24px 44px rgba(0,0,0,0.58), 0 0 0 1px rgba(56,132,210,0.10) inset',
              backdropFilter: 'blur(14px)',
              py: 0.85,
            },
          },
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.label}
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              handleClose();
            }}
            sx={{
              minHeight: 54,
              px: 1.9,
              gap: 1.35,
              color: item.danger ? '#fecaca' : 'inherit',
              '& .MuiListItemIcon-root': {
                minWidth: 30,
                color: item.danger ? '#fca5a5' : 'rgba(255,255,255,0.82)',
              },
              '& .MuiListItemText-primary': {
                fontSize: '1rem',
                fontWeight: 600,
              },
              '&:hover': {
                bgcolor: 'rgba(56,132,210,0.14)',
              },
            }}
          >
            {item.icon ? <ListItemIcon>{item.icon}</ListItemIcon> : null}
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
