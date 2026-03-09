import { createTheme } from '@mui/material/styles';
import { THEME_COMPONENTS } from './themeComponents';
import { PALETTE, FONT_FAMILY } from './themeConstants';
import { THEME_TYPOGRAPHY } from './themeTypography';

const theme = createTheme({
  palette: PALETTE,
  typography: THEME_TYPOGRAPHY,
  components: THEME_COMPONENTS,
});

export default theme;
export { FONT_FAMILY };
