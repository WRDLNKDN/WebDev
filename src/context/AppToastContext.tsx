import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
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

export function enqueueToast(
  queue: ToastItem[],
  toast: Omit<ToastItem, 'id'>,
  idFactory: () => number = () => Date.now() + Math.floor(Math.random() * 1000),
) {
  return [
    ...queue,
    {
      ...toast,
      id: idFactory(),
    },
  ];
}

export function dismissToast(queue: ToastItem[]) {
  return queue.slice(1);
}

const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="up" />;
};

export const AppToastProvider = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [queue, setQueue] = useState<ToastItem[]>([]);

  const currentToast = queue[0] ?? null;

  const dismissCurrentToast = useCallback(() => {
    setQueue((prev) => dismissToast(prev));
  }, []);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    setQueue((prev) => enqueueToast(prev, toast));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

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
          bottom: { xs: 18, sm: 28 },
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
          action={
            <>
              {currentToast?.action ? (
                <IconButton
                  size="small"
                  color="inherit"
                  aria-label={currentToast.action.label}
                  onClick={() => {
                    currentToast.action?.onClick();
                    dismissCurrentToast();
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {currentToast.action.label}
                  </span>
                </IconButton>
              ) : null}
              <IconButton
                size="small"
                color="inherit"
                aria-label="Dismiss notification"
                onClick={dismissCurrentToast}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
          sx={{
            alignItems: 'center',
            width: '100%',
            '& .MuiAlert-message': {
              fontWeight: 600,
            },
          }}
        >
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
