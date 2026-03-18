import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { parseNicheValues } from '../../../lib/profile/nicheValues';
import type { IndustryGroup } from '../../../types/profile';

const sectionLabelSx = {
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 700,
} as const;

export type IndustryGroupBlockProps = {
  groups: IndustryGroup[];
  nicheField?: string | null;
};

/**
 * Canonical industry renderer: grouped primary/sub-industry sections.
 * "Other" (niche values) is rendered as a first-class group like any primary industry.
 * Shared by Dashboard and Profile for layout parity.
 */
export const IndustryGroupBlock = ({
  groups,
  nicheField,
}: IndustryGroupBlockProps) => {
  const otherValues = parseNicheValues(nicheField ?? undefined);
  const otherGroup: IndustryGroup | null =
    otherValues.length > 0
      ? { industry: 'Other', sub_industries: otherValues }
      : null;
  const allGroups = otherGroup ? [...groups, otherGroup] : groups;

  // Collapsed by default; one section open at a time (accordion).
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        allGroups.map((g) => [g.industry.toLowerCase(), false]),
      ),
  );

  if (allGroups.length === 0) return null;

  return (
    <Stack spacing={1.25} sx={{ width: '100%' }}>
      <Typography variant="caption" sx={sectionLabelSx}>
        Industries
      </Typography>
      <Stack spacing={1}>
        {allGroups.map((group) => {
          const groupKey = group.industry.toLowerCase();
          const isExpanded = expandedGroups[groupKey] ?? false;

          return (
            <Box
              key={group.industry}
              data-testid={`dashboard-industry-group-${group.industry}`}
              sx={{
                border: '1px solid rgba(156,187,217,0.18)',
                borderRadius: 2,
                bgcolor: 'rgba(56,132,210,0.06)',
                overflow: 'hidden',
              }}
            >
              <Box
                component="button"
                type="button"
                onClick={() =>
                  setExpandedGroups((prev) => {
                    const next = { ...prev };
                    if (isExpanded) {
                      next[groupKey] = false;
                    } else {
                      // Accordion: close others, open this one
                      allGroups.forEach((g) => {
                        next[g.industry.toLowerCase()] = false;
                      });
                      next[groupKey] = true;
                    }
                    return next;
                  })
                }
                aria-expanded={isExpanded}
                aria-controls={`dashboard-industry-sublist-${groupKey}`}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  p: 1.25,
                  border: 'none',
                  bgcolor: 'transparent',
                  color: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {group.industry}
                </Typography>
                {isExpanded ? (
                  <ExpandLessIcon
                    sx={{ fontSize: 18, color: 'text.secondary' }}
                  />
                ) : (
                  <ExpandMoreIcon
                    sx={{ fontSize: 18, color: 'text.secondary' }}
                  />
                )}
              </Box>
              <Collapse in={isExpanded}>
                <Stack
                  id={`dashboard-industry-sublist-${groupKey}`}
                  spacing={0.75}
                  sx={{
                    px: 1.25,
                    pb: 1.25,
                  }}
                >
                  {group.sub_industries.length > 0 ? (
                    group.sub_industries.map((subIndustry) => (
                      <Typography
                        key={`${group.industry}-${subIndustry}`}
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.5 }}
                      >
                        {subIndustry}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No subindustries listed
                    </Typography>
                  )}
                </Stack>
              </Collapse>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
};
