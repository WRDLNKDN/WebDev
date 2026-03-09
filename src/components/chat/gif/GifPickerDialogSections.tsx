import { Box, Button, Typography } from '@mui/material';
import type { GifContentFilter } from '../../../lib/chat/gifApi';

export type GifPickerResult = {
  id: string;
  title: string;
  previewUrl: string;
  gifUrl: string;
};

type ContentFilterButtonsProps = {
  contentFilter: GifContentFilter;
  query: string;
  onSelect: (filter: GifContentFilter, query: string) => void;
};

export const ContentFilterButtons = ({
  contentFilter,
  query,
  onSelect,
}: ContentFilterButtonsProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Typography variant="caption" color="text.secondary">
      Content:
    </Typography>
    <Button
      size="small"
      variant={contentFilter === 'low' ? 'contained' : 'text'}
      onClick={() => onSelect('low', query)}
    >
      G
    </Button>
    <Button
      size="small"
      variant={contentFilter === 'medium' ? 'contained' : 'text'}
      onClick={() => onSelect('medium', query)}
    >
      PG-13
    </Button>
    <Button
      size="small"
      variant={contentFilter === 'high' ? 'contained' : 'text'}
      onClick={() => onSelect('high', query)}
    >
      Strict
    </Button>
  </Box>
);

type GifResultsGridProps = {
  results: GifPickerResult[];
  maxHeight: number;
  cellHeight: number;
  onPick: (gifUrl: string, title?: string) => void;
};

export const GifResultsGrid = ({
  results,
  maxHeight,
  cellHeight,
  onPick,
}: GifResultsGridProps) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 1,
      maxHeight,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}
  >
    {results.map((gif) => (
      <Box
        key={gif.id}
        component="button"
        type="button"
        onClick={() => onPick(gif.gifUrl, gif.title)}
        sx={{
          p: 0,
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 1,
          overflow: 'hidden',
          cursor: 'pointer',
          bgcolor: 'black',
        }}
      >
        <Box
          component="img"
          src={gif.previewUrl}
          alt={gif.title || 'GIF'}
          sx={{
            width: '100%',
            height: cellHeight,
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </Box>
    ))}
  </Box>
);
