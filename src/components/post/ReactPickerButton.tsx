import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import {
  Box,
  Button,
  ClickAwayListener,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SharedReactionOption } from './sharedReactions';

const MUTED_COLOR = 'rgba(255,255,255,0.65)';
const HOVER_COLOR = '#22C55E';

export type ReactPickerButtonProps<T extends string = string> = {
  options: SharedReactionOption<T>[];
  selectedValue?: T | null;
  onToggleReaction: (value: T) => void;
  buttonLabel?: string;
  sx?: object;
  buttonSx?: object;
  traySx?: object;
  emojiSize?: string | number;
};

export const ReactPickerButton = <T extends string = string>({
  options,
  selectedValue = null,
  onToggleReaction,
  buttonLabel = 'React',
  sx,
  buttonSx,
  traySx,
  emojiSize = '1.4rem',
}: ReactPickerButtonProps<T>) => {
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.value === selectedValue) ?? null,
    [options, selectedValue],
  );

  const clearHoverCloseTimeout = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  };

  const openTray = () => {
    clearHoverCloseTimeout();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearHoverCloseTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 220);
  };

  useEffect(
    () => () => {
      clearHoverCloseTimeout();
    },
    [],
  );

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box
        onMouseEnter={openTray}
        onMouseLeave={scheduleClose}
        onFocus={openTray}
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        <Button
          size="small"
          onClick={() => {
            clearHoverCloseTimeout();
            setOpen((prev) => !prev);
          }}
          aria-label={buttonLabel}
          aria-haspopup="true"
          aria-expanded={open}
          aria-pressed={Boolean(selected)}
          sx={{
            textTransform: 'none',
            color: selected?.color ?? MUTED_COLOR,
            minHeight: { xs: 40, sm: 36 },
            py: { xs: 0.75, sm: 0.5 },
            px: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.625,
            borderRadius: 2,
            transition:
              'color 120ms ease, transform 120ms ease, background-color 120ms ease',
            '& .MuiSvgIcon-root, & .MuiTypography-root': {
              color: 'inherit',
            },
            ...(selected
              ? {
                  fontWeight: 700,
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px',
                }
              : null),
            '&:hover': {
              bgcolor: 'transparent',
              color: selected?.color ?? HOVER_COLOR,
              transform: 'scale(1.08)',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            },
            ...buttonSx,
          }}
        >
          <EmojiEmotionsOutlinedIcon sx={{ fontSize: { xs: 22, sm: 20 } }} />
          <Typography
            component="span"
            variant="caption"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              fontWeight: selected ? 700 : 600,
              color: 'inherit',
            }}
          >
            {buttonLabel}
          </Typography>
        </Button>
        {open ? (
          <Box
            onMouseEnter={openTray}
            onMouseLeave={scheduleClose}
            sx={{
              position: 'absolute',
              left: 0,
              bottom: 'calc(100% + 10px)',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              borderRadius: '999px',
              px: 0.75,
              py: 0.75,
              bgcolor: 'rgba(20,22,27,0.96)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow:
                '0 14px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset',
              ...traySx,
            }}
          >
            {options.map((option) => {
              const active = option.value === selectedValue;
              return (
                <Tooltip key={option.value} title={option.label}>
                  <Box
                    component="button"
                    type="button"
                    aria-label={option.label}
                    data-reaction-color={option.color}
                    onClick={() => {
                      onToggleReaction(option.value);
                      setOpen(false);
                    }}
                    sx={{
                      cursor: 'pointer',
                      width: 40,
                      height: 40,
                      borderRadius: '999px',
                      border: active
                        ? `2px solid ${option.color}`
                        : '1px solid rgba(255,255,255,0.08)',
                      bgcolor: active
                        ? 'rgba(255,255,255,0.10)'
                        : 'rgba(255,255,255,0.04)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: emojiSize,
                      lineHeight: 1,
                      transition:
                        'transform 120ms ease, background-color 120ms ease, border-color 120ms ease',
                      '&:hover': {
                        transform: 'translateY(-2px) scale(1.05)',
                        bgcolor: 'rgba(255,255,255,0.12)',
                        borderColor: option.color,
                      },
                    }}
                  >
                    <span aria-hidden="true">{option.emoji}</span>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ) : null}
      </Box>
    </ClickAwayListener>
  );
};
