import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';

type FeedAdCardMenuProps = {
  menuAnchor: HTMLElement | null;
  onOpen: (anchor: HTMLElement) => void;
  onClose: () => void;
  onDismiss?: () => void;
};

export const FeedAdCardMenu = ({
  menuAnchor,
  onOpen,
  onClose,
  onDismiss,
}: FeedAdCardMenuProps) => {
  if (!onDismiss) return null;

  const dismissAndClose = () => {
    onDismiss();
    onClose();
  };

  return (
    <>
      <Tooltip title="More options">
        <span>
          <IconButton
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8 }}
            aria-label="More options"
            aria-haspopup="true"
            aria-expanded={!!menuAnchor}
            onClick={(e) => onOpen(e.currentTarget)}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={menuAnchor}
        open={!!menuAnchor}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={dismissAndClose}>
          <ListItemIcon>
            <BlockOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Hide this ad</ListItemText>
        </MenuItem>
        <MenuItem onClick={dismissAndClose}>
          <ListItemIcon>
            <ThumbDownOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Not interested</ListItemText>
        </MenuItem>
        <MenuItem onClick={dismissAndClose}>
          <ListItemIcon>
            <VisibilityOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Seen too often</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};
