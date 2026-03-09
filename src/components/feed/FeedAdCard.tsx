import { Box, Card, CardContent, Link, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/auth/supabaseClient';
import { FeedAdCardMenu } from './ad/FeedAdCardMenu';
import {
  parseFeedAdvertiserLinks,
  type FeedAdvertiser,
} from './ad/feedAdTypes';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '';

type Props = {
  advertiser: FeedAdvertiser;
  onDismiss?: () => void;
  onAdClick?: (payload: { target: string; url: string }) => void;
  onImpression?: () => void;
};

export const FeedAdCard = ({
  advertiser,
  onDismiss,
  onAdClick,
  onImpression,
}: Props) => {
  const links = parseFeedAdvertiserLinks(advertiser.links);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const hasTrackedImpressionRef = useRef(false);

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

  useEffect(() => {
    if (hasTrackedImpressionRef.current) return;
    hasTrackedImpressionRef.current = true;
    onImpression?.();
  }, [onImpression]);

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
        <FeedAdCardMenu
          menuAnchor={menuAnchor}
          onOpen={(anchor) => setMenuAnchor(anchor)}
          onClose={() => setMenuAnchor(null)}
          onDismiss={onDismiss}
        />
        <Stack
          direction="row"
          spacing={{ xs: 1, sm: 2 }}
          alignItems="flex-start"
        >
          {/* Single identity: partner logo only (no fallback circle avatar) */}
          {advertiser.logo_url ? (
            <Box
              component="img"
              src={advertiser.logo_url}
              alt=""
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                objectFit: 'contain',
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            />
          ) : null}
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
                  sx={{
                    color: 'text.secondary',
                    display: 'block',
                  }}
                >
                  {advertiser.url.replace(/^https?:\/\//, '')}
                </Typography>
              </Box>
            </Stack>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                display: 'block',
                mt: 0.5,
                color: 'text.primary',
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
            {/* Single canonical outbound link: CTA list if configured, else one "Learn more" to primary URL */}
            {links.length > 0 ? (
              <Box component="nav" sx={{ mt: 1.25 }} aria-label="Ad link">
                <Link
                  href={links[0].url || advertiser.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onAdClick?.({
                      target: 'cta_link_1',
                      url: links[0].url || advertiser.url,
                    })
                  }
                  variant="body2"
                  sx={{
                    color: 'primary.main',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  {links[0].label || 'Learn more'}
                </Link>
              </Box>
            ) : (
              <Stack direction="row" sx={{ mt: 1.5 }}>
                <Link
                  component="a"
                  href={advertiser.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    onAdClick?.({
                      target: 'cta_learn_more',
                      url: advertiser.url,
                    })
                  }
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
              sx={{
                display: 'block',
                flexShrink: 0,
                width: { xs: 64, sm: 78, md: 92 },
                height: { xs: 64, sm: 78, md: 92 },
                borderRadius: 1,
                overflow: 'hidden',
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
