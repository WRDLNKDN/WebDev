import AddIcon from '@mui/icons-material/Add';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  Collapse,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { DestinationLink } from '../../components/common/DestinationLink';
import { useState } from 'react';
import {
  CATEGORY_ORDER,
  getCategoryForPlatform,
} from '../../constants/platforms';
import { getGlassCardStrong } from '../../theme/candyStyles';
import type { LinkCategory, SocialLink } from '../../types/profile';
import { compareSocialLinksAlphabetically } from '../../lib/profile/socialLinksPresentation';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../lib/utils/linkPlatform';
import { LinkIcon } from '../../components/profile/links/LinkIcon';

type DashboardLinksSectionProps = {
  loading: boolean;
  socials: SocialLink[];
  onOpenLinks: () => void;
};

type DashboardLinkGroup = {
  category: LinkCategory;
  heading: string;
  links: SocialLink[];
};

const DISPLAY_CATEGORY_LABELS: Record<LinkCategory, string> = {
  Professional: 'Professional',
  Social: 'Social',
  Content: 'Content',
  Games: 'Games',
  Files: 'Files',
  Music: 'Music',
  Custom: 'Other',
};

const addButtonSx = {
  textTransform: 'none',
  fontWeight: 600,
  color: 'white',
  background: 'linear-gradient(90deg, #0f766e 0%, #2dd4bf 100%)',
  border: 'none',
  minHeight: 34,
  py: 0.5,
  px: 1.5,
  fontSize: '0.8125rem',
  '&:hover': { background: 'linear-gradient(90deg, #0d5d56 0%, #14b8a6 100%)' },
} as const;

const getNormalizedCategory = (link: SocialLink): LinkCategory => {
  if (CATEGORY_ORDER.includes(link.category)) return link.category;
  return getCategoryForPlatform(
    link.platform || detectPlatformFromUrl(link.url),
  );
};

export const groupDashboardLinks = (
  socials: SocialLink[],
): DashboardLinkGroup[] =>
  CATEGORY_ORDER.map((category) => {
    const links = socials
      .filter((link) => getNormalizedCategory(link) === category)
      .sort((a, b) => compareSocialLinksAlphabetically(a, b));

    if (links.length === 0) return null;

    return {
      category,
      heading: DISPLAY_CATEGORY_LABELS[category],
      links,
    };
  }).filter(Boolean) as DashboardLinkGroup[];

const DashboardLinkCategory = ({ group }: { group: DashboardLinkGroup }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Box
      data-testid={`dashboard-links-group-${group.category}`}
      sx={{
        minWidth: 0,
        borderRadius: 3,
        border: '1px solid rgba(156,187,217,0.22)',
        bgcolor: 'rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => setExpanded((current) => !current)}
        sx={{
          all: 'unset',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          px: 1.5,
          py: 1.25,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(56,132,210,0.10)' },
        }}
        aria-expanded={expanded}
        aria-label={`${group.heading} links`}
      >
        <Typography
          variant="overline"
          sx={{
            minWidth: 0,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere',
            letterSpacing: 1.1,
            color: 'text.secondary',
            fontWeight: 700,
            textAlign: 'left',
          }}
        >
          {group.heading}
        </Typography>
        {expanded ? (
          <ExpandLessIcon sx={{ flexShrink: 0, fontSize: 18 }} />
        ) : (
          <ExpandMoreIcon sx={{ flexShrink: 0, fontSize: 18 }} />
        )}
      </Box>
      <Collapse in={expanded}>
        <Stack
          spacing={0.75}
          sx={{ px: 1.5, pb: 1.5 }}
          data-testid={`dashboard-links-list-${group.category}`}
        >
          {group.links.map((link) => {
            const platform =
              link.platform?.trim() || detectPlatformFromUrl(link.url);
            const href = link.url.startsWith('http')
              ? link.url
              : `https://${link.url}`;
            const label =
              link.label?.trim() || platform || getShortLinkLabel(link.url);

            return (
              <DestinationLink
                key={link.id}
                href={href}
                ariaLabelPrefix={label}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  minWidth: 0,
                  px: 1,
                  py: 0.9,
                  borderRadius: 2,
                  color: 'text.primary',
                  border: '1px solid rgba(156,187,217,0.18)',
                  bgcolor: 'rgba(56,132,210,0.08)',
                  '&:hover': {
                    color: 'primary.main',
                    borderColor: 'rgba(45, 212, 191, 0.45)',
                    bgcolor: 'rgba(45, 212, 191, 0.08)',
                  },
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{ minWidth: 0, overflow: 'hidden' }}
                >
                  <LinkIcon
                    platform={platform}
                    sx={{ width: 18, fontSize: '1rem', flexShrink: 0 }}
                  />
                  <Typography
                    variant="body2"
                    noWrap
                    data-testid="dashboard-link-label"
                    sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {label}
                  </Typography>
                </Stack>
              </DestinationLink>
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
};

export const DashboardLinksSection = ({
  loading,
  socials,
  onOpenLinks,
}: DashboardLinksSectionProps) => {
  const theme = useTheme();
  const groups = groupDashboardLinks(socials);

  return (
    <Paper
      data-testid="dashboard-links-section"
      elevation={0}
      sx={{
        ...getGlassCardStrong(theme),
        p: { xs: 2, md: 3 },
        mb: 2.5,
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          sx={{ width: '100%' }}
        >
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              letterSpacing: 2,
              color: 'text.secondary',
              fontWeight: 600,
            }}
          >
            LINKS
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={onOpenLinks}
            disabled={loading}
            aria-label="Add links"
            sx={{
              ...addButtonSx,
              minHeight: { xs: 44, sm: 34 },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Add
          </Button>
        </Stack>

        {groups.length === 0 ? (
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid rgba(156,187,217,0.22)',
              bgcolor: 'rgba(0,0,0,0.2)',
              p: { xs: 2, sm: 2.25 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 3 },
              alignItems: { xs: 'stretch', sm: 'flex-start' },
            }}
          >
            <Box
              sx={{
                flex: '1 1 auto',
                minWidth: 0,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
              }}
            >
              <LinkOutlinedIcon
                sx={{
                  fontSize: 28,
                  color: 'primary.light',
                  opacity: 0.9,
                  flexShrink: 0,
                  mt: 0.25,
                }}
                aria-hidden
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle2"
                  component="p"
                  sx={{ fontWeight: 700, mb: 0.5 }}
                >
                  No outbound links yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Add sites you want visitors to explore—portfolio sites, repos,
                  socials, or files. They appear on your public profile in
                  categories you control.
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={onOpenLinks}
              disabled={loading}
              aria-label="Add your first link"
              sx={{
                ...addButtonSx,
                alignSelf: { xs: 'stretch', sm: 'center' },
              }}
            >
              Add a link
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1.25,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(240px, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              alignItems: 'start',
            }}
          >
            {groups.map((group) => (
              <DashboardLinkCategory key={group.category} group={group} />
            ))}
          </Box>
        )}
      </Stack>
    </Paper>
  );
};
