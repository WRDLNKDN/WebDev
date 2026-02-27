/**
 * PostActionMenu — three-dot menu for post/message actions (edit, delete, report).
 * Shared by FeedCard and MessageList.
 */
import { IconButton, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';

export type PostActionMenuItem = {
  label: string;
  onClick: () => void;
  /** Red/warning style (e.g. Delete, Report) */
  danger?: boolean;
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
      <IconButton
        size="small"
        onClick={handleOpen}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        sx={{ color: 'rgba(255,255,255,0.6)' }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => {
              item.onClick();
              handleClose();
            }}
            sx={item.danger ? { color: 'error.main' } : undefined}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
