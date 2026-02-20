import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  IconButton,
  Link,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';

export type FeedAdvertiserLink = { label: string; url: string };

export type FeedAdvertiser = {
  id: string;
  company_name: string;
  title: string;
  description: string;
  url: string;
  logo_url: string | null;
  image_url?: string | null;
  links: unknown;
  active: boolean;
  sort_order: number;
};

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

function parseLinks(raw: unknown): FeedAdvertiserLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is { label?: string; url?: string } =>
        x != null && typeof x === 'object',
    )
    .map((x) => ({
      label: String(x.label ?? ''),
      url: String(x.url ?? ''),
    }))
    .filter((x) => x.label || x.url);
}

type Props = {
  advertiser: FeedAdvertiser;
  onDismiss?: () => void;
};

export const FeedAdCard = ({ advertiser, onDismiss }: Props) => {
  const links = parseLinks(advertiser.links);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);

  const heroImageUrl = useMemo(
    () => advertiser.image_url || fallbackImageUrl || null,
    [advertiser.image_url, fallbackImageUrl],
  );

  useEffect(() => {
    let cancelled = false;
    if (advertiser.image_url) {
      setFallbackImageUrl(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch(
          `${API_BASE}/api/link-preview?url=${encodeURIComponent(advertiser.url)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            credentials: API_BASE ? 'omit' : 'include',
          },
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          data?: { image?: string | null } | null;
        };
        const image = json.data?.image ?? null;
        if (!cancelled && image) setFallbackImageUrl(image);
      } catch {
        // Keep ad visible even when preview fetch fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [advertiser.image_url, advertiser.url]);

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, mb: 2, minWidth: 0, overflow: 'hidden' }}
      component="article"
      aria-label={`Sponsored: ${advertiser.title}`}
    >
      <CardContent
        sx={{
          pt: 2,
          pb: 2,
          pr: onDismiss ? { xs: 6.5, sm: 7 } : 2,
          position: 'relative',
          '&:last-child': { pb: 2 },
        }}
      >
        {onDismiss && (
          <>
            <IconButton
              size="small"
              sx={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="More options"
              aria-haspopup="true"
              aria-expanded={!!menuAnchor}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                onClick={() => {
                  onDismiss();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <BlockOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Hide this ad</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onDismiss();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <ThumbDownOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Not interested</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  onDismiss();
                  setMenuAnchor(null);
                }}
              >
                <ListItemIcon>
                  <VisibilityOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Seen too often</ListItemText>
              </MenuItem>
            </Menu>
          </>
        )}
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          alignItems="flex-start"
        >
          <Avatar
            src={advertiser.logo_url ?? undefined}
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.dark',
              color: 'primary.contrastText',
            }}
          >
            {advertiser.company_name.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="flex-start" gap={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block' }}
                >
                  {advertiser.company_name}
                </Typography>
                <Typography
                  variant="caption"
                  component="a"
                  href={advertiser.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: 'text.secondary',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  {advertiser.url.replace(/^https?:\/\//, '')}
                </Typography>
              </Box>
            </Stack>
            <Typography
              component="a"
              href={advertiser.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtitle1"
              fontWeight={600}
              sx={{
                display: 'block',
                mt: 0.5,
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {advertiser.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block', lineHeight: 1.45 }}
            >
              {advertiser.description}
            </Typography>
            {links.length > 0 ? (
              <Box component="nav" sx={{ mt: 1.25 }} aria-label="Ad links">
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    pl: 1.75,
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, minmax(0, 1fr))',
                    },
                    columnGap: 1.5,
                    rowGap: 0.35,
                    color: 'text.secondary',
                    '& li::marker': {
                      color: 'text.disabled',
                      fontSize: '0.62rem',
                    },
                  }}
                >
                  {links.map((l, i) => (
                    <Box
                      component="li"
                      key={`${l.label}-${i}`}
                      sx={{ minWidth: 0, lineHeight: 1.1 }}
                    >
                      <Link
                        href={l.url || advertiser.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="body2"
                        sx={{
                          color: 'primary.main',
                          fontSize: '0.82rem',
                          fontWeight: 400,
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                        }}
                      >
                        {l.label}
                      </Link>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Stack direction="row" sx={{ mt: 1.5 }}>
                <Link
                  component="a"
                  href={advertiser.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{
                    color: 'primary.main',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Learn more
                </Link>
              </Stack>
            )}
          </Box>
          {heroImageUrl && (
            <Box
              component="a"
              href={advertiser.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'block',
                flexShrink: 0,
                width: { xs: 64, sm: 78, md: 92 },
                height: { xs: 64, sm: 78, md: 92 },
                borderRadius: 1,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                mr: onDismiss ? { xs: 4.5, sm: 5, md: 5.5 } : 0,
              }}
            >
              <Box
                component="img"
                src={heroImageUrl}
                alt={`${advertiser.company_name} – ${advertiser.title}`}
                loading="eager"
                referrerPolicy="no-referrer"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
