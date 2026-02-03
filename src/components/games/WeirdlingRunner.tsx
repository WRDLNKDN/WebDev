import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

// --- ASSET SECTOR ---
// ⚠️ ACTION REQUIRED: Convert your 'ChatGPT_Image...png' to Base64 and paste it here!
// You can use a site like https://www.base64-image.de/
// For now, I've put a simple placeholder string. If it fails, the game will auto-draw a pink box.
import { WEIRDLING_URI } from '../../theme/assets';

// --- TYPES ---
interface Runner {
  x: number;
  y: number;
  width: number;
  height: number;
  dy: number;
  jumpPower: number;
  gravity: number;
  isGrounded: boolean;
  angle: number;
}

interface Obstacle {
  x: number;
  width: number;
  height: number;
  type: 'MANAGER' | 'CABINET';
  tieColor: string;
  skinColor: string;
  hairColor: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export const WeirdlingRunner = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weirdlingImgRef = useRef<HTMLImageElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('WRDLNKDN_HIGH_SCORE');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);

  // Track if image loaded successfully
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const wImg = new Image();
    wImg.onload = () => {
      weirdlingImgRef.current = wImg;
      setImageLoaded(true);
    };
    wImg.onerror = () => {
      // Fallback: If image fails, we will draw procedurally
      setImageLoaded(false);
      console.warn('Weirdling asset missing - engaging procedural fallback.');
    };
    wImg.src = WEIRDLING_URI;
  }, []);

  useEffect(() => {
    // Note: Removed "if (!assetsLoaded) return" so game works even if image fails
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    let scrollSpeed = 6;
    let distanceTraveled = 0;

    // PHYSICS TWEAK: Floatier jump to clear tall cabinets
    const runner: Runner = {
      x: 60,
      y: 150,
      width: 40,
      height: 40,
      dy: 0,
      jumpPower: -12.5,
      gravity: 0.58,
      isGrounded: false,
      angle: 0,
    };

    const obstacles: Obstacle[] = [];
    const particles: Particle[] = [];
    const groundLevel = 190;

    const spawnObstacle = () => {
      const isCabinet = Math.random() > 0.65; // Slightly fewer cabinets

      const tieColors = ['#f00', '#00f', '#ffeb3b', '#4caf50'];
      const skinColors = ['#ffccb3', '#8d5524', '#c68642', '#e0ac69'];
      const hairColors = ['#000', '#555', '#8d5524', '#e6e6e6'];

      if (isCabinet) {
        obstacles.push({
          x: canvas.width,
          width: 45,
          height: 55, // HEIGHT NERF: 65 -> 55 to be jumpable
          type: 'CABINET',
          tieColor: '',
          skinColor: '',
          hairColor: '',
        });
      } else {
        obstacles.push({
          x: canvas.width,
          width: 32,
          height: 32,
          type: 'MANAGER',
          tieColor: tieColors[Math.floor(Math.random() * tieColors.length)],
          skinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
          hairColor: hairColors[Math.floor(Math.random() * hairColors.length)],
        });
      }
    };

    const handleJump = () => {
      if (runner.isGrounded) {
        runner.dy = runner.jumpPower;
        runner.isGrounded = false;
        // Dust particles
        for (let i = 0; i < 6; i++) {
          particles.push({
            x: runner.x + runner.width / 2,
            y: runner.y + runner.height,
            vx: (Math.random() - 0.5) * 5,
            vy: Math.random() * -3,
            life: 1.0,
            color: '#ddd',
          });
        }
      }
    };

    const inputHandler = (e: KeyboardEvent | MouseEvent | TouchEvent) => {
      if (gameOver) return;

      const isKeyJump =
        'code' in e && (e.code === 'Space' || e.code === 'ArrowUp');
      const isClickJump = e.type === 'click' || e.type === 'touchstart';

      if (isKeyJump || isClickJump) {
        if (e.cancelable) e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener('keydown', inputHandler);
    canvas.addEventListener('touchstart', inputHandler);
    canvas.addEventListener('click', inputHandler);

    // --- DRAWING LOGIC ---

    const drawCabinet = (obs: Obstacle) => {
      const y = groundLevel - obs.height;
      ctx.fillStyle = '#d3c09a';
      ctx.fillRect(obs.x, y, obs.width, obs.height);

      ctx.strokeStyle = '#a69576';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, y, obs.width, obs.height);

      // 2 Drawers instead of 3 for the shorter cabinet
      const drawerHeight = obs.height / 2;
      ctx.strokeStyle = '#a69576';
      ctx.lineWidth = 1;

      for (let i = 0; i < 2; i++) {
        const dy = y + i * drawerHeight;
        ctx.strokeRect(obs.x + 2, dy + 2, obs.width - 4, drawerHeight - 4);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(obs.x + obs.width / 2 - 8, dy + 8, 16, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(obs.x + obs.width / 2 - 6, dy + 14, 12, 3);
      }
    };

    const drawManager = (obs: Obstacle) => {
      const cx = obs.x + obs.width / 2;
      const cy = groundLevel - obs.height + obs.height / 2;

      ctx.fillStyle = obs.skinColor;
      ctx.beginPath();
      ctx.arc(cx, cy, obs.width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = obs.hairColor;
      ctx.beginPath();
      ctx.arc(cx, cy - 5, obs.width / 2 + 1, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(obs.x, cy + 10, obs.width, obs.height);

      ctx.fillStyle = obs.tieColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 10);
      ctx.lineTo(cx - 3, cy + 25);
      ctx.lineTo(cx + 3, cy + 25);
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 4);
      ctx.lineTo(cx - 2, cy - 1);
      ctx.moveTo(cx + 8, cy - 4);
      ctx.lineTo(cx + 2, cy - 1);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx - 5, cy + 3, 2, 0, Math.PI * 2);
      ctx.arc(cx + 5, cy + 3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy + 14, 4, Math.PI, 0);
      ctx.stroke();

      if (score > 10) {
        ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(0.4, score / 100)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, obs.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawHallway = () => {
      ctx.fillStyle = '#2a2a35';
      ctx.fillRect(0, 0, canvas.width, groundLevel);

      const doorSpacing = 350;
      const doorOffset = distanceTraveled % doorSpacing;
      ctx.fillStyle = '#3a3a45';
      ctx.strokeStyle = '#4a4a55';
      const doorX = 350 - doorOffset;
      if (doorX > -60 && doorX < canvas.width) {
        ctx.fillRect(doorX, groundLevel - 110, 70, 110);
        ctx.strokeRect(doorX, groundLevel - 110, 70, 110);

        ctx.fillStyle = '#4a4a55';
        ctx.fillRect(doorX + 10, groundLevel - 90, 50, 40);

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px monospace';
        const dept = ['HR', 'LEGAL', 'SALES', 'AUDIT'][
          Math.floor(distanceTraveled / 1000) % 4
        ];
        ctx.fillText(dept, doorX + 15, groundLevel - 60);
      }

      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, groundLevel, canvas.width, canvas.height - groundLevel);

      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      const gridSpacing = 50;
      const gridOffset = distanceTraveled % gridSpacing;
      for (let i = 0; i < canvas.width / gridSpacing + 1; i++) {
        const gx = i * gridSpacing - gridOffset;
        ctx.moveTo(gx, groundLevel);
        ctx.lineTo(gx - 300, canvas.height);
      }
      ctx.stroke();
    };

    // --- PROCEDURAL FALLBACK (If image fails) ---
    const drawProceduralWeirdling = (
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      // Body (Pink)
      ctx.fillStyle = '#f06292';
      ctx.fillRect(x, y, w, h);

      // Sunglasses (Black bar)
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 2, y + 10, w - 4, 8);

      // Shine on glasses
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 5, y + 12, 4, 2);
      ctx.fillRect(x + 20, y + 12, 4, 2);

      // Smile
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 25, 6, 0, Math.PI);
      ctx.stroke();
    };

    const update = () => {
      if (gameOver) return;

      frameCount++;
      scrollSpeed = 6 + score * 0.08;
      distanceTraveled += scrollSpeed;

      runner.dy += runner.gravity;
      runner.y += runner.dy;

      if (!runner.isGrounded) runner.angle += 0.15;
      else runner.angle = 0;

      if (runner.y + runner.height > groundLevel) {
        runner.y = groundLevel - runner.height;
        runner.dy = 0;
        runner.isGrounded = true;
      }

      const spawnRate = Math.max(50, 110 - score);
      if (frameCount % Math.floor(spawnRate + Math.random() * 20) === 0) {
        spawnObstacle();
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= scrollSpeed;

        // HITBOX TUNING: More forgiveness
        const padding = 8;
        if (
          runner.x + padding < obs.x + obs.width - padding &&
          runner.x + runner.width - padding > obs.x + padding &&
          runner.y + runner.height - padding > groundLevel - obs.height
        ) {
          setGameOver(true);
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('WRDLNKDN_HIGH_SCORE', score.toString());
          }
        }

        if (obs.x + obs.width < 0) {
          obstacles.splice(i, 1);
          setScore((s) => s + 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawHallway();

      particles.forEach((p) => {
        ctx.fillStyle = `rgba(255,255,255,${p.life})`;
        ctx.fillRect(p.x, p.y, 3, 3);
      });

      obstacles.forEach((obs) => {
        if (obs.type === 'CABINET') {
          drawCabinet(obs);
        } else {
          drawManager(obs);
        }
      });

      // WEIRDLING RENDER LOGIC
      ctx.save();
      // Translate to center of runner for rotation
      ctx.translate(runner.x + runner.width / 2, runner.y + runner.height / 2);
      ctx.rotate(runner.angle);

      if (imageLoaded && weirdlingImgRef.current) {
        // Draw Image relative to center
        ctx.drawImage(
          weirdlingImgRef.current,
          -runner.width / 2,
          -runner.height / 2,
          runner.width,
          runner.height,
        );
      } else {
        // Fallback Procedure relative to center
        drawProceduralWeirdling(
          -runner.width / 2,
          -runner.height / 2,
          runner.width,
          runner.height,
        );
      }
      ctx.restore();
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', inputHandler);
      canvas.removeEventListener('click', inputHandler);
      canvas.removeEventListener('touchstart', inputHandler);
    };
  }, [gameOver, score, highScore, imageLoaded]); // removed assetsLoaded dependency, relying on imageLoaded state

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
          sx={{
            color: '#f06292',
            fontFamily: 'monospace',
            textShadow: '0 0 10px #f06292',
          }}
        >
          INTEGRITY: {score}
        </Typography>
        <Typography
          variant="h6"
          sx={{ color: '#ffeb3b', fontFamily: 'monospace' }}
        >
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

      <Typography
        variant="caption"
        sx={{ mt: 1, color: 'text.secondary', fontFamily: 'monospace' }}
      >
        [SPACE/TAP] TO DODGE MANAGERS & LEGACY PAPERWORK
      </Typography>

      {gameOver && (
        <Box sx={{ mt: 2, animation: 'fadeIn 0.5s' }}>
          <Typography
            variant="h5"
            sx={{
              color: '#ff4d4d',
              mb: 1,
              fontWeight: 800,
              fontFamily: 'monospace',
            }}
          >
            [SYSTEM_CRASH]
          </Typography>
          <Typography variant="body2" sx={{ color: '#fff', mb: 2 }}>
            Buried under legacy paperwork.
          </Typography>
          <Typography
            onClick={() => {
              setGameOver(false);
              setScore(0);
            }}
            sx={{
              color: '#42a5f5',
              cursor: 'pointer',
              fontWeight: 600,
              border: '1px solid #42a5f5',
              display: 'inline-block',
              px: 2,
              py: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(66, 165, 245, 0.1)' },
            }}
          >
            REBOOT_KERNEL (RESTART)
          </Typography>
        </Box>
      )}
    </Box>
  );
};
