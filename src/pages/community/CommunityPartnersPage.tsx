import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Paper,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { trackEvent } from '../../lib/analytics/trackEvent';
import { supabase } from '../../lib/auth/supabaseClient';

type Partner = {
  id: string;
  company_name: string;
  title: string | null;
  description: string | null;
  url: string;
  logo_url: string | null;
  image_url: string | null;
};

const NETTICA_FALLBACK: Partner = {
  id: 'nettica-fallback',
  company_name: 'Nettica',
  title: 'Secure networking partner',
  description:
    'Nettica helps teams run secure private networking with simple WireGuard management.',
  url: 'https://nettica.com/',
  logo_url: null,
  image_url: null,
};

const ENABLE_NETTICA_PARTNER_FALLBACK =
  (import.meta.env.VITE_ENABLE_NETTICA_PARTNER_FALLBACK as string | undefined)
    ?.trim()
    .toLowerCase() !== 'false';

export const CommunityPartnersPage = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadPartners = async () => {
      try {
        const { data, error } = await supabase
          .from('community_partners')
          .select(
            'id,company_name,title,description,url,logo_url,image_url,active,sort_order',
          )
          .eq('active', true)
          .order('sort_order', { ascending: true });
        if (cancelled) return;
        if (error) {
          setPartners([NETTICA_FALLBACK]);
          return;
        }
        const rows = ((data ?? []) as Partner[]).filter((row) => {
          return Boolean(row.company_name?.trim()) && Boolean(row.url?.trim());
        });
        setPartners(rows);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadPartners();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPartners = useMemo(() => {
    const byUrl = new Map<string, Partner>();
    for (const partner of partners) {
      byUrl.set(partner.url.trim().toLowerCase(), partner);
    }
    if (
      ENABLE_NETTICA_PARTNER_FALLBACK &&
      !byUrl.has(NETTICA_FALLBACK.url.trim().toLowerCase())
    ) {
      byUrl.set(NETTICA_FALLBACK.url.trim().toLowerCase(), NETTICA_FALLBACK);
    }
    return Array.from(byUrl.values());
  }, [partners]);

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Community Partners
          </Typography>
          <Typography variant="body1" color="text.primary">
            Partners shown here are managed in the Admin panel and published
            when active.
          </Typography>
        </Stack>

        <Grid container spacing={2}>
          {displayPartners.map((partner) => {
            const mediaUrl = partner.image_url || partner.logo_url || null;
            return (
              <Grid key={partner.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {mediaUrl && (
                      <Box
                        component="img"
                        src={mediaUrl}
                        alt={`${partner.company_name} logo`}
                        sx={{
                          width: '100%',
                          height: 80,
                          objectFit: 'contain',
                          objectPosition: 'left center',
                          mb: 1.5,
                        }}
                      />
                    )}
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {partner.company_name}
                    </Typography>
                    {partner.title && (
                      <Typography variant="body2" color="text.primary">
                        {partner.title}
                      </Typography>
                    )}
                    {partner.description && (
                      <Typography variant="body2" sx={{ mt: 1.25 }}>
                        {partner.description}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button
                      component={Link}
                      href={partner.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNewIcon />}
                      onClick={() =>
                        trackEvent('community_partner_outbound_click', {
                          source: 'community_partners_page',
                          partner_id: partner.id,
                          partner_name: partner.company_name,
                          target: partner.url,
                        })
                      }
                      sx={{
                        textTransform: 'none',
                        color: 'text.primary',
                        fontWeight: 600,
                      }}
                    >
                      Visit partner
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {!loading && displayPartners.length === 0 && (
          <Paper
            variant="outlined"
            sx={{
              mt: 1,
              p: { xs: 2.5, md: 3 },
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75 }}>
              No active partners yet
            </Typography>
            <Typography color="text.primary">
              We&apos;re preparing partner listings. Check back soon.
            </Typography>
          </Paper>
        )}

        <Button
          component={RouterLink}
          to="/feed"
          variant="text"
          sx={{ textTransform: 'none', mt: 3 }}
        >
          Back to feed
        </Button>
      </Container>
    </Box>
  );
};

export default CommunityPartnersPage;
