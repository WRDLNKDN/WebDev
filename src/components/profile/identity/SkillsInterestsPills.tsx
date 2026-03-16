import { Box, Stack, Typography } from '@mui/material';

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

/** Same pill styling as Skills for parity (spec: "Interests render as pills using the same component styling as Skills"). */
const interestPillSx = { ...skillPillSx };

export type SkillsInterestsPillsProps = {
  skills: string[];
  interests?: string[];
};

/**
 * Canonical center-column pills: Skills then Interests.
 * Used by Dashboard and Profile for layout parity. No prefixes (e.g. no "Skill:" or "Industry:").
 */
export const SkillsInterestsPills = ({
  skills,
  interests = [],
}: SkillsInterestsPillsProps) => {
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
          <Stack direction="row" flexWrap="wrap" gap={1}>
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
        </>
      ) : null}
    </Stack>
  );
};
