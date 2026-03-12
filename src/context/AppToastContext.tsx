import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Slide,
  Snackbar,
  useMediaQuery,
} from '@mui/material';
import type { AlertColor, SlideProps } from '@mui/material';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useTheme } from '@mui/material/styles';

type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: number;
  message: string;
  severity?: AlertColor;
  duration?: number;
  action?: ToastAction;
};

type AppToastContextValue = {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

const MAX_TOAST_QUEUE = 4;
const visuallyHiddenSx = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
} as const;

function isDuplicateToast(
  existing: ToastItem | undefined,
  incoming: Omit<ToastItem, 'id'>,
) {
  if (!existing) return false;

  return (
    existing.message === incoming.message &&
    existing.severity === incoming.severity &&
    existing.action?.label === incoming.action?.label
  );
}

export function enqueueToast(
  queue: ToastItem[],
  toast: Omit<ToastItem, 'id'>,
  idFactory: () => number = () => Date.now() + Math.floor(Math.random() * 1000),
) {
  if (isDuplicateToast(queue[queue.length - 1], toast)) {
    return queue;
  }

  return [
    ...queue,
    {
      ...toast,
      id: idFactory(),
    },
  ].slice(-MAX_TOAST_QUEUE);
}

export function dismissToast(queue: ToastItem[]) {
  return queue.slice(1);
}

export function getToastAccessibilityProps(severity?: AlertColor) {
  const assertive = severity === 'error' || severity === 'warning';
  return {
    role: assertive ? 'alert' : 'status',
    'aria-live': assertive ? ('assertive' as const) : ('polite' as const),
    'aria-atomic': 'true' as const,
  };
}

export function getToastSeverityLabel(severity?: AlertColor) {
  switch (severity) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
    default:
      return 'Info';
  }
}

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="up" />;
};

export const AppToastProvider = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [queue, setQueue] = useState<ToastItem[]>([]);

  const currentToast = queue[0] ?? null;
  const toastA11y = getToastAccessibilityProps(currentToast?.severity);

  const dismissCurrentToast = useCallback(() => {
    setQueue((prev) => dismissToast(prev));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    setQueue((prev) => enqueueToast(prev, toast));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  useEffect(() => {
    if (!currentToast) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      dismissCurrentToast();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentToast, dismissCurrentToast]);

  return (
    <AppToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={currentToast?.id ?? 'empty'}
        open={Boolean(currentToast)}
        autoHideDuration={currentToast?.duration ?? 2800}
        onClose={(_event, reason) => {
          if (reason === 'clickaway') return;
          dismissCurrentToast();
        }}
        anchorOrigin={{
          vertical: isMobile ? 'bottom' : 'bottom',
          horizontal: 'center',
        }}
        TransitionComponent={SlideTransition}
        sx={{
          bottom: {
            xs: 'max(18px, env(safe-area-inset-bottom))',
            sm: 'max(28px, env(safe-area-inset-bottom))',
          },
          '& .MuiPaper-root': {
            minWidth: { xs: 'calc(100vw - 24px)', sm: 360 },
            maxWidth: { xs: 'calc(100vw - 24px)', sm: 520 },
            borderRadius: 2,
            boxShadow: '0 16px 40px rgba(0,0,0,0.34)',
          },
        }}
      >
        <Alert
          severity={currentToast?.severity ?? 'info'}
          variant="filled"
          onClose={dismissCurrentToast}
          role={toastA11y.role}
          aria-live={toastA11y['aria-live']}
          aria-atomic={toastA11y['aria-atomic']}
          action={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                ml: 1,
              }}
            >
              {currentToast?.action ? (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => {
                    currentToast.action?.onClick();
                    dismissCurrentToast();
                  }}
                  sx={{
                    minWidth: 0,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.2,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentToast.action.label}
                </Button>
              ) : null}
              <IconButton
                size="small"
                color="inherit"
                aria-label="Dismiss notification"
                onClick={dismissCurrentToast}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            alignItems: { xs: 'flex-start', sm: 'center' },
            width: '100%',
            '& .MuiAlert-action': {
              alignItems: { xs: 'flex-start', sm: 'center' },
              pt: { xs: 0.25, sm: 0 },
              pl: { xs: 1, sm: 2 },
              mr: 0,
            },
            '& .MuiAlert-message': {
              fontWeight: 600,
              overflowWrap: 'anywhere',
              pr: 0.5,
            },
          }}
        >
          <Box component="span" sx={visuallyHiddenSx}>
            {getToastSeverityLabel(currentToast?.severity)} notification. Press
            Escape to dismiss.
          </Box>
          {currentToast?.message ?? ''}
        </Alert>
      </Snackbar>
    </AppToastContext.Provider>
  );
};

export const useAppToast = () => {
  const context = useContext(AppToastContext);
  if (!context) {
    throw new Error('useAppToast must be used within AppToastProvider');
  }
  return context;
};
