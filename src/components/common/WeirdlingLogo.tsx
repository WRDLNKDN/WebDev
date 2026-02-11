import { Box, type BoxProps } from '@mui/material';
import { useEffect, useState } from 'react';
import { WEIRDLING_ASSET_COUNT } from '../../types/weirdling';

// Allow passing SX props so we can resize it anywhere
export const WeirdlingLogo = (props: BoxProps) => {
  const [weirdlingIndex, setWeirdlingIndex] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setWeirdlingIndex((prev) => (prev % WEIRDLING_ASSET_COUNT) + 1);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      {...props}
      sx={{
        width: '64px',
        height: '64px',
        overflow: 'hidden',
        borderRadius: '12px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...props.sx, // Allow overrides
      }}
    >
      <Box
        component="img"
        src={`/assets/weirdling_${weirdlingIndex}.png`}
        alt="Weirdling Animation"
        sx={{
          height: '100%',
          width: 'auto',
          transform: 'scale(2.1) translateY(10%)',
          transition: 'all 0.5s ease-in-out',
        }}
      />
    </Box>
  );
};
