// src/theme.ts
import { createTheme } from "@mui/material/styles";

const customTheme = createTheme({
  palette: {
    background: {
      default: "#212121", // Dark Gray (Page Background)
    },
    primary: {
      main: "#212121", // Dark Gray (Container background/text if needed)
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#E0F7FA", // Light Cyan (Inner Box/Div background)
      contrastText: "#000000", // Black for text on light background
    },
  },
  typography: {
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiContainer: {
      defaultProps: {
        disableGutters: true,
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 4,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default customTheme;
