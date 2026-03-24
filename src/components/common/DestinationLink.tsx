import { Box, Link, Tooltip } from '@mui/material';
import type { LinkProps } from '@mui/material/Link';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';

const TOOLTIP_ENTER_DELAY_MS = 150;
const TOOLTIP_LEAVE_DELAY_MS = 0;
const TOOLTIP_URL_MAX_WIDTH = 320;
const TOOLTIP_URL_MAX_HEIGHT = 120;

function normalizeHref(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export interface DestinationLinkProps extends Omit<
  LinkProps,
  'href' | 'target'
> {
  /** Destination URL (will be normalized with https if no protocol). */
  href: string;
  /** Optional label for aria-label (e.g. link title). Screen readers get "label, destination: url". */
  ariaLabelPrefix?: string;
  /** Children (link content). */
  children: ReactNode;
  /** Opens in same window by default. No target="_blank". */
  openInNewTab?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Link that opens in the same window and shows the full destination URL in a
 * tooltip on hover/focus. Use for Dashboard and Profile links so users see
 * where the link goes and can use the Back button.
 */
export const DestinationLink = ({
  href,
  ariaLabelPrefix,
  children,
  openInNewTab = false,
  sx,
  ...linkProps
}: DestinationLinkProps) => {
  const normalizedHref = normalizeHref(href);

  const tooltipTitle = normalizedHref ? (
    <Box
      component="span"
      sx={{
        display: 'block',
        maxWidth: TOOLTIP_URL_MAX_WIDTH,
        maxHeight: TOOLTIP_URL_MAX_HEIGHT,
        overflow: 'auto',
        overflowWrap: 'break-word',
        wordBreak: 'break-all',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      }}
    >
      {normalizedHref}
    </Box>
  ) : null;

  const ariaLabel =
    ariaLabelPrefix && normalizedHref
      ? `${ariaLabelPrefix}, destination: ${normalizedHref}`
      : undefined;

  return (
    <Tooltip
      title={tooltipTitle}
      enterDelay={TOOLTIP_ENTER_DELAY_MS}
      leaveDelay={TOOLTIP_LEAVE_DELAY_MS}
      placement="top"
      describeChild
    >
      <Link
        href={normalizedHref}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        underline="none"
        aria-label={ariaLabel}
        sx={sx}
        {...linkProps}
      >
        {children}
      </Link>
    </Tooltip>
  );
};
