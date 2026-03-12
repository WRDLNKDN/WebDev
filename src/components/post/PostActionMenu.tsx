/**
 * PostActionMenu — three-dot menu for post/message actions (edit, delete, report).
 * Shared by FeedCard and MessageList.
 */
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
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
};

export const PostActionMenu = ({
  items,
  ariaLabel = 'Options',
  visible = true,
}: PostActionMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const menuId = open ? 'post-action-menu' : undefined;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  if (!visible || items.length === 0) return null;

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
            width: 44,
            height: 44,
            color: 'rgba(255,255,255,0.82)',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '18px',
            bgcolor: 'rgba(132,154,214,0.14)',
            border: '1px solid rgba(173,203,255,0.18)',
            boxShadow:
              '0 12px 26px rgba(4,10,25,0.42), inset 0 1px 0 rgba(255,255,255,0.12)',
            transition:
              'background-color 120ms ease, color 120ms ease, transform 120ms ease, border-color 120ms ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 1,
              borderRadius: '16px',
              background:
                'radial-gradient(circle at 30% 28%, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 48%, rgba(132,154,214,0.08) 100%)',
              pointerEvents: 'none',
            },
            '&:hover': {
              bgcolor: 'rgba(148,175,232,0.18)',
              borderColor: 'rgba(191,219,254,0.32)',
              color: '#fff',
              transform: 'scale(1.04)',
            },
            '&:focus-visible': {
              outline: '2px solid rgba(191,219,254,0.78)',
              outlineOffset: 2,
            },
          }}
        >
          <MoreVertIcon fontSize="small" />
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
                '0 24px 44px rgba(0,0,0,0.58), 0 0 0 1px rgba(255,255,255,0.04) inset',
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
                bgcolor: 'rgba(255,255,255,0.06)',
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
