// src/pages/content/PlaylistsPage.tsx

import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Container,
  Grid,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect, useState } from 'react';

import {
  fetchPublicPlaylists,
  type PublicPlaylist,
} from '../../lib/api/contentApi';
import { toMessage } from '../../lib/utils/errors';

export const PlaylistsPage = () => {
  const [playlists, setPlaylists] = useState<PublicPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await fetchPublicPlaylists({ limit: 50 });
        if (!cancelled) setPlaylists(data);
      } catch (e) {
        if (!cancelled) setError(toMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography color="text.secondary">Loading playlists…</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        WRDLNKDN playlists
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Curated community picks and featured content.
      </Typography>

      {playlists.length === 0 ? (
        <Typography color="text.secondary">
          No public playlists yet. Check back soon.
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {playlists.map((p) => (
            <Grid size={{ xs: 12, sm: 6 }} key={p.id}>
              <Card
                component={RouterLink}
                to={`/playlists/${p.slug}`}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  height: '100%',
                }}
              >
                <CardActionArea sx={{ height: '100%' }}>
                  <CardContent
                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'primary.dark',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <PlaylistPlayIcon
                        sx={{ color: 'primary.light', fontSize: 28 }}
                      />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="h6" component="h2">
                        {p.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.itemCount} item{p.itemCount !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};
