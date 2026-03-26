import GavelIcon from '@mui/icons-material/Gavel';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type NavbarMobileDrawerLegalProps = {
  onNavigate: () => void;
};

export const NavbarMobileDrawerLegal = ({
  onNavigate,
}: NavbarMobileDrawerLegalProps) => {
  return (
    <List dense disablePadding sx={{ py: 0 }}>
      <ListSubheader
        component="div"
        sx={{
          bgcolor: 'transparent',
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: '0.7rem',
          py: 0.5,
          px: 2,
          pt: 2,
          pb: 0.5,
        }}
      >
        Legal
      </ListSubheader>
      <ListItemButton
        component={RouterLink}
        to="/terms"
        onClick={onNavigate}
        sx={{ minHeight: 44, py: 0.5 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <GavelIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Terms of Service"
          primaryTypographyProps={{ variant: 'body2' }}
        />
      </ListItemButton>
      <ListItemButton
        component={RouterLink}
        to="/privacy"
        onClick={onNavigate}
        sx={{ minHeight: 44, py: 0.5 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <GavelIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Privacy Policy"
          primaryTypographyProps={{ variant: 'body2' }}
        />
      </ListItemButton>
      <ListItemButton
        component={RouterLink}
        to="/guidelines"
        onClick={onNavigate}
        sx={{ minHeight: 44, py: 0.5 }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          <GavelIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Community Guidelines"
          primaryTypographyProps={{ variant: 'body2' }}
        />
      </ListItemButton>
    </List>
  );
};
