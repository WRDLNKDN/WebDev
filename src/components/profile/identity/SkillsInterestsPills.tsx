import { Box, Button, Stack, Typography } from '@mui/material';
import { useLayoutEffect, useRef, useState } from 'react';

const sectionLabelSx = {
  color: 'text.secondary',
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 700,
} as const;

const skillPillSx = {
  display: 'inline-flex',
  width: 'fit-content',
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  px: 1.25,
  py: 0.5,
  borderRadius: 999,
  bgcolor: 'rgba(236,64,122,0.15)',
  border: '1px solid rgba(236,64,122,0.35)',
  fontSize: '0.78rem',
} as const;

/** Same pill styling as Skills for parity. */
const interestPillSx = { ...skillPillSx };

/** Single-line height for interests collapse (one line of chips). */
const INTERESTS_COLLAPSED_MAX_HEIGHT = 40;

export type SkillsInterestsPillsProps = {
  skills: string[];
  interests?: string[];
};

/**
 * Canonical center-column pills: Skills then Interests.
 * Interests wrap by width; when they overflow one line, an Expand control reveals the rest.
 */
export const SkillsInterestsPills = ({
  skills,
  interests = [],
}: SkillsInterestsPillsProps) => {
  const interestsRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  useLayoutEffect(() => {
    if (interests.length === 0 || expanded) {
      setHasOverflow(false);
      return;
    }
    const el = interestsRef.current;
    if (!el) return;

    const check = () => {
      setHasOverflow(el.scrollHeight > el.clientHeight);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [interests.length, expanded]);

  if (skills.length === 0 && interests.length === 0) return null;

  return (
    <Stack spacing={1.25} sx={{ mt: 1 }}>
      {skills.length > 0 ? (
        <>
          <Typography variant="caption" sx={sectionLabelSx}>
            Skills
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {skills.map((skill) => (
              <Box
                key={`skill-${skill}`}
                data-testid="dashboard-pill"
                sx={skillPillSx}
              >
                {skill}
              </Box>
            ))}
          </Stack>
        </>
      ) : null}
      {interests.length > 0 ? (
        <>
          <Typography variant="caption" sx={sectionLabelSx}>
            Interests
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            <Stack
              ref={interestsRef}
              direction="row"
              flexWrap="wrap"
              gap={1}
              sx={{
                maxHeight: expanded ? 'none' : INTERESTS_COLLAPSED_MAX_HEIGHT,
                overflow: 'hidden',
                transition: 'max-height 0.2s ease-out',
              }}
            >
              {interests.map((interest) => (
                <Box
                  key={`interest-${interest}`}
                  data-testid="dashboard-pill"
                  sx={interestPillSx}
                >
                  {interest}
                </Box>
              ))}
            </Stack>
            {hasOverflow && !expanded && (
              <Button
                size="small"
                onClick={() => setExpanded(true)}
                sx={{
                  mt: 0.75,
                  textTransform: 'none',
                  fontSize: '0.78rem',
                  color: 'primary.main',
                  minHeight: 0,
                  py: 0.25,
                  px: 0,
                }}
                aria-expanded={false}
                data-testid="profile-interests-expand"
              >
                Expand
              </Button>
            )}
          </Box>
        </>
      ) : null}
    </Stack>
  );
};
