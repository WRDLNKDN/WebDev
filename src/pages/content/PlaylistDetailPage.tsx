// src/pages/content/PlaylistDetailPage.tsx

import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Chip,
  Container,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';

import {
  fetchPlaylistItems,
  type PlaylistItem,
} from '../../lib/api/contentApi';
import { toMessage } from '../../lib/utils/errors';

export const PlaylistDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await fetchPlaylistItems(slug, { limit: 100 });
        if (!cancelled) {
          setItems(data);
          setTitle(
            slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          );
        }
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
  }, [slug]);

  if (!slug) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography color="error">Missing playlist slug</Typography>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography color="error">{error}</Typography>
        <Link
          component={RouterLink}
          to="/playlists"
          sx={{ mt: 2, display: 'inline-block' }}
        >
          Back to playlists
        </Link>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Link
        component={RouterLink}
        to="/playlists"
        sx={{ display: 'inline-block', mb: 2 }}
      >
        ← Back to playlists
      </Link>
      <Typography variant="h4" sx={{ mb: 4 }}>
        {title ?? slug}
      </Typography>

      {items.length === 0 ? (
        <Typography color="text.secondary">
          No items in this playlist yet.
        </Typography>
      ) : (
        <List disablePadding>
          {items.map((item) => (
            <ListItem
              key={item.id}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 0.5,
              }}
            >
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="subtitle1" component="span">
                      {item.title}
                    </Typography>
                    <Chip label={item.type} size="small" />
                  </Box>
                }
                secondary={
                  item.submittedBy.displayName || item.submittedBy.handle
                    ? `by ${item.submittedBy.displayName ?? item.submittedBy.handle}`
                    : undefined
                }
              />
              {item.type === 'youtube' && item.youtubeUrl && (
                <Link
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  Watch on YouTube
                  <OpenInNewIcon fontSize="small" />
                </Link>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
};
