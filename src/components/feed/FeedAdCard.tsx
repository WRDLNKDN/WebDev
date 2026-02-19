import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  IconButton,
  Link,
  Stack,
  Typography,
} from '@mui/material';

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

type Props = { advertiser: FeedAdvertiser };

export const FeedAdCard = ({ advertiser }: Props) => {
  const links = parseLinks(advertiser.links);

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, mb: 2, minWidth: 0 }}
      component="article"
      aria-label={`Sponsored: ${advertiser.title}`}
    >
      {advertiser.image_url && (
        <Box
          component="img"
          src={advertiser.image_url}
          alt=""
          loading="eager"
          referrerPolicy="no-referrer"
          sx={{
            width: '100%',
            height: 'auto',
            maxHeight: 200,
            objectFit: 'cover',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        />
      )}
      <CardContent sx={{ pt: 2, pb: 2, '&:last-child': { pb: 2 } }}>
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
            <Stack
              direction="row"
              alignItems="flex-start"
              justifyContent="space-between"
              gap={1}
            >
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
              <IconButton
                size="small"
                sx={{ mt: -0.5, mr: -0.5 }}
                aria-label="More options"
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
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
              sx={{ mt: 0.5, display: 'block' }}
            >
              {advertiser.description}
            </Typography>
            {links.length > 0 && (
              <Stack
                direction="row"
                flexWrap="wrap"
                gap={0.5}
                sx={{ mt: 1 }}
                component="nav"
              >
                {links.map((l, i) => (
                  <Box component="span" key={i}>
                    {i > 0 && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mx: 0.5 }}
                      >
                        •
                      </Typography>
                    )}
                    <Link
                      href={l.url || advertiser.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="body2"
                      sx={{
                        color: 'primary.main',
                        fontSize: '0.8125rem',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {l.label}
                    </Link>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};
