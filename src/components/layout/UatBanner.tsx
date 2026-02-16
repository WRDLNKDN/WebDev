import { Box, Typography } from '@mui/material';
import { isUat } from '../../lib/env';

const PROD_SUPABASE_REF = 'rpcaazmxymymqdejevtb';

function getSupabaseProjectRef(): string | null {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url) return null;
    const m = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** True if current host looks like UAT (webdev-uat.vercel.app etc.) */
function isUatHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h.includes('webdev-uat') || h.includes('uat.');
}

export const UatBanner = () => {
  const supabaseRef = getSupabaseProjectRef();
  const isWrongSupabase =
    supabaseRef !== null && supabaseRef === PROD_SUPABASE_REF;
  const showUatBanner = isUat;
  const showWrongConfigWarning = isWrongSupabase && (isUat || isUatHost());

  if (!showUatBanner && !showWrongConfigWarning) return null;

  return (
    <Box
      component="aside"
      role="banner"
      aria-label="UAT environment"
      sx={{
        py: 0.75,
        px: 2,
        bgcolor: showWrongConfigWarning ? 'error.dark' : 'warning.dark',
        color: 'warning.contrastText',
        textAlign: 'center',
        fontSize: '0.8125rem',
        fontWeight: 600,
      }}
    >
      <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
        {showWrongConfigWarning ? (
          <>
            UAT — WRONG Supabase: using PROD ({supabaseRef}). Set
            VITE_SUPABASE_URL in Vercel UAT project to
            lgxwseyzoefxggxijatp.supabase.co and redeploy.
          </>
        ) : (
          <>UAT — This is a test environment. Data is not production.</>
        )}
      </Typography>
    </Box>
  );
};
