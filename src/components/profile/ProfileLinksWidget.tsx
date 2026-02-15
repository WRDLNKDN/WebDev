import { Box, Link, Stack, Typography } from '@mui/material';
import { CATEGORY_ORDER } from '../../constants/platforms';
import type { SocialLink } from '../../types/profile';
import { LinkIcon } from './LinkIcon';

interface ProfileLinksWidgetProps {
  socials: SocialLink[];
}

export const ProfileLinksWidget = ({ socials }: ProfileLinksWidgetProps) => {
  // 1. HARDENED SAFETY CHECK:
  // We explicitly check Array.isArray to prevent crashes if Supabase sends {}
  if (!socials || !Array.isArray(socials) || socials.length === 0) return null;

  // 2. Filter for visible links only
  const visibleLinks = socials.filter((s) => s.isVisible);

  if (visibleLinks.length === 0) return null;

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      {CATEGORY_ORDER.map((category) => {
        // 3. Group by Category
        const categoryLinks = visibleLinks
          .filter((link) => link.category === category)
          .sort((a, b) => a.order - b.order); // Respect user sort order

        // If this category is empty, skip it
        if (categoryLinks.length === 0) return null;

        return (
          <Box key={category}>
            {/* Category Header */}
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: 1.5,
                mb: 1,
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              {category}
            </Typography>

            {/* Links List */}
            <Stack spacing={1.5}>
              {categoryLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="none"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: 'text.primary',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: 'primary.main',
                      transform: 'translateX(4px)', // Subtle "Go" animation
                    },
                  }}
                >
                  {/* Platform icon (MUI) */}
                  <LinkIcon
                    platform={link.platform}
                    sx={{ mr: 1.5, fontSize: '1.1rem', width: 20 }}
                  />

                  {/* Label: Use custom label if 'Custom', otherwise Platform Name */}
                  {link.label || link.platform}
                </Link>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
};
