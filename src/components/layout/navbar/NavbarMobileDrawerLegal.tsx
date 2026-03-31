import GavelIcon from '@mui/icons-material/Gavel';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { RouterLinkPrefetch } from '../../routing/RouterLinkPrefetch';
import {
  DrawerNavSubheader,
  drawerNavListSx,
  drawerNavRowButtonSx,
} from './navbarDrawerPrimitives';

type NavbarMobileDrawerLegalProps = {
  onNavigate: () => void;
};

const LEGAL_LINKS = [
  { to: '/guidelines', label: 'Community Guidelines' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
] as const;

export const NavbarMobileDrawerLegal = ({
  onNavigate,
}: NavbarMobileDrawerLegalProps) => {
  return (
    <List dense disablePadding sx={drawerNavListSx}>
      <DrawerNavSubheader paddedTop>Legal</DrawerNavSubheader>
      {LEGAL_LINKS.map(({ to, label }) => (
        <ListItemButton
          key={to}
          component={RouterLinkPrefetch}
          to={to}
          onClick={onNavigate}
          sx={drawerNavRowButtonSx}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <GavelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={label}
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItemButton>
      ))}
    </List>
  );
};
