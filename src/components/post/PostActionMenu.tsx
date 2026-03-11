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
          aria-haspopup="true"
          aria-expanded={open}
          sx={{
            color: 'rgba(255,255,255,0.68)',
            borderRadius: 2,
            transition:
              'background-color 120ms ease, color 120ms ease, transform 120ms ease',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.08)',
              color: '#fff',
              transform: 'scale(1.04)',
            },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.75,
            minWidth: 224,
            borderRadius: 2.5,
            color: '#f8fafc',
            border: '1px solid rgba(96,165,250,0.45)',
            bgcolor: 'rgba(17,24,39,0.98)',
            boxShadow:
              '0 20px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset',
            backdropFilter: 'blur(14px)',
            py: 0.5,
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
              minHeight: 44,
              px: 1.5,
              gap: 1,
              color: item.danger ? '#fecaca' : 'inherit',
              '& .MuiListItemIcon-root': {
                minWidth: 28,
                color: item.danger ? '#fca5a5' : 'rgba(255,255,255,0.82)',
              },
              '& .MuiListItemText-primary': {
                fontSize: '0.96rem',
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
