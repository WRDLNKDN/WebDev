import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import {
  Box,
  Button,
  ClickAwayListener,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { INTERACTION_COLORS } from '../../theme/themeConstants';
import type { SharedReactionOption } from './sharedReactions';

// Keep the reaction entry button aligned with the rest of the feed action bar.
const MUTED_COLOR = 'rgba(255,255,255,0.65)';
const ACTIVE_COLOR = INTERACTION_COLORS.focus;
const HOVER_COLOR = INTERACTION_COLORS.focus;

export type ReactPickerButtonProps<T extends string = string> = {
  options: SharedReactionOption<T>[];
  selectedValue?: T | null;
  onToggleReaction: (value: T) => void;
  buttonLabel?: string;
  buttonTestId?: string;
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
  buttonTestId,
  sx,
  buttonSx,
  traySx,
  emojiSize = '1.4rem',
}: ReactPickerButtonProps<T>) => {
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [clickPinned, setClickPinned] = useState(false);

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
    if (clickPinned) return;
    clearHoverCloseTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 220);
  };

  const isWithinRoot = (node: EventTarget | null) =>
    node instanceof Node && rootRef.current?.contains(node);

  useEffect(
    () => () => {
      clearHoverCloseTimeout();
    },
    [],
  );

  return (
    <ClickAwayListener
      onClickAway={() => {
        clearHoverCloseTimeout();
        setClickPinned(false);
        setOpen(false);
      }}
    >
      <Box
        ref={rootRef}
        onMouseEnter={openTray}
        onMouseLeave={(event) => {
          if (isWithinRoot(event.relatedTarget)) return;
          scheduleClose();
        }}
        onFocusCapture={openTray}
        onBlurCapture={(event) => {
          if (clickPinned || isWithinRoot(event.relatedTarget)) return;
          clearHoverCloseTimeout();
          setOpen(false);
        }}
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
            setClickPinned((prev) => {
              const nextPinned = !prev;
              setOpen(nextPinned);
              return nextPinned;
            });
          }}
          data-testid={buttonTestId}
          aria-label={buttonLabel}
          aria-haspopup="true"
          aria-expanded={open}
          aria-pressed={Boolean(selected)}
          sx={{
            textTransform: 'none',
            color: selected ? ACTIVE_COLOR : MUTED_COLOR,
            minHeight: { xs: 40, sm: 36 },
            py: { xs: 0.75, sm: 0.5 },
            px: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.625,
            borderRadius: 2,
            border: '1px solid transparent',
            bgcolor: selected ? 'rgba(56,132,210,0.12)' : 'transparent',
            borderColor: selected ? 'rgba(141,188,229,0.3)' : 'transparent',
            boxShadow: selected
              ? '0 0 0 1px rgba(56,132,210,0.08) inset'
              : 'none',
            transition:
              'color 120ms ease, transform 120ms ease, background-color 120ms ease, border-color 120ms ease',
            '& .MuiSvgIcon-root, & .MuiTypography-root': {
              color: 'inherit',
            },
            ...(selected
              ? {
                  fontWeight: 700,
                }
              : null),
            '&:hover': {
              bgcolor: 'rgba(56,132,210,0.08)',
              borderColor: 'rgba(141,188,229,0.28)',
              color: HOVER_COLOR,
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
                '0 14px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(56,132,210,0.08) inset',
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
                      setClickPinned(false);
                      setOpen(false);
                    }}
                    sx={{
                      cursor: 'pointer',
                      width: 40,
                      height: 40,
                      borderRadius: '999px',
                      border: active
                        ? `2px solid ${option.color}`
                        : '1px solid rgba(156,187,217,0.18)',
                      bgcolor: active
                        ? 'rgba(255,255,255,0.10)'
                        : 'rgba(56,132,210,0.10)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: emojiSize,
                      lineHeight: 1,
                      transition:
                        'transform 120ms ease, background-color 120ms ease, border-color 120ms ease',
                      '&:hover': {
                        transform: 'translateY(-2px) scale(1.05)',
                        bgcolor: 'rgba(156,187,217,0.26)',
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
