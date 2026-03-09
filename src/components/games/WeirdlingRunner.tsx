import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { WEIRDLING_URI } from '../../theme/assets';
import { GameEndScreen } from './GameEndScreen';
import { useWeirdlingRunnerEngine } from './useWeirdlingRunnerEngine';

export const WeirdlingRunner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weirdlingImgRef = useRef<HTMLImageElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('WRDLNKDN_HIGH_SCORE');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const gameStartTimeRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const wImg = new Image();
    wImg.onload = () => {
      weirdlingImgRef.current = wImg;
      setImageLoaded(true);
    };
    wImg.onerror = () => {
      setImageLoaded(false);
      console.warn('Weirdling asset missing - engaging procedural fallback.');
    };
    wImg.src = WEIRDLING_URI;
  }, []);

  useWeirdlingRunnerEngine({
    canvasRef,
    weirdlingImgRef,
    gameOver,
    score,
    highScore,
    imageLoaded,
    setGameOver,
    setScore,
    setHighScore,
  });

  useEffect(() => {
    if (gameOver) {
      if (gameStartTimeRef.current != null) {
        setElapsedSeconds(
          Math.floor((performance.now() - gameStartTimeRef.current) / 1000),
        );
      }
      gameStartTimeRef.current = null;
    } else {
      gameStartTimeRef.current = performance.now();
    }
  }, [gameOver]);

  const handlePlayAgain = () => {
    setGameOver(false);
    setScore(0);
    setElapsedSeconds(0);
  };

  return (
    <Box
      sx={{
        textAlign: 'center',
        mt: 4,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{ color: '#f06292', textShadow: '0 0 10px #f06292' }}
        >
          INTEGRITY: {score}
        </Typography>
        <Typography variant="h6" sx={{ color: '#ffeb3b' }}>
          PEAK_STATE: {highScore}
        </Typography>
      </Stack>

      <canvas
        ref={canvasRef}
        width={600}
        height={240}
        style={{
          background: '#000',
          borderRadius: '12px',
          border: '2px solid rgba(240, 98, 146, 0.5)',
          boxShadow: '0 0 20px rgba(240, 98, 146, 0.2)',
          width: '100%',
          maxWidth: '600px',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      />

      <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
        [SPACE/TAP] TO DODGE MANAGERS & LEGACY PAPERWORK
      </Typography>

      {gameOver && (
        <GameEndScreen
          title="[SYSTEM_CRASH]"
          subtitle="Buried under legacy paperwork."
          stats={[
            { label: 'Time', value: elapsedSeconds },
            { label: 'Score', value: score },
            { label: 'Best', value: highScore },
          ]}
          replayButtonLabel="Play again"
          onReplayClick={handlePlayAgain}
        />
      )}
    </Box>
  );
};
