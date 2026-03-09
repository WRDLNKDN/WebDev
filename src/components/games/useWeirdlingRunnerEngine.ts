import { useEffect } from 'react';

import type {
  Obstacle,
  Particle,
  Runner,
  WeirdlingRunnerEngineParams,
} from './weirdlingRunnerTypes';

export const useWeirdlingRunnerEngine = ({
  canvasRef,
  weirdlingImgRef,
  gameOver,
  score,
  highScore,
  imageLoaded,
  setGameOver,
  setScore,
  setHighScore,
}: WeirdlingRunnerEngineParams) => {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    let scrollSpeed = 6;
    let distanceTraveled = 0;

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
      const isCabinet = Math.random() > 0.65;
      const tieColors = ['#f00', '#00f', '#ffeb3b', '#4caf50'];
      const skinColors = ['#ffccb3', '#8d5524', '#c68642', '#e0ac69'];
      const hairColors = ['#000', '#555', '#8d5524', '#e6e6e6'];

      if (isCabinet) {
        obstacles.push({
          x: canvas.width,
          width: 45,
          height: 55,
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
      if (!runner.isGrounded) return;
      runner.dy = runner.jumpPower;
      runner.isGrounded = false;
      for (let i = 0; i < 6; i += 1) {
        particles.push({
          x: runner.x + runner.width / 2,
          y: runner.y + runner.height,
          vx: (Math.random() - 0.5) * 5,
          vy: Math.random() * -3,
          life: 1.0,
          color: '#ddd',
        });
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

    const drawCabinet = (obs: Obstacle) => {
      const y = groundLevel - obs.height;
      ctx.fillStyle = '#d3c09a';
      ctx.fillRect(obs.x, y, obs.width, obs.height);
      ctx.strokeStyle = '#a69576';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, y, obs.width, obs.height);
      const drawerHeight = obs.height / 2;
      ctx.strokeStyle = '#a69576';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i += 1) {
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
        ctx.font = '10px Poppins, sans-serif';
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
      for (let i = 0; i < canvas.width / gridSpacing + 1; i += 1) {
        const gx = i * gridSpacing - gridOffset;
        ctx.moveTo(gx, groundLevel);
        ctx.lineTo(gx - 300, canvas.height);
      }
      ctx.stroke();
    };

    const drawProceduralWeirdling = (
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      ctx.fillStyle = '#f06292';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(x + 2, y + 10, w - 4, 8);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + 5, y + 12, 4, 2);
      ctx.fillRect(x + 20, y + 12, 4, 2);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + 25, 6, 0, Math.PI);
      ctx.stroke();
    };

    const update = () => {
      if (gameOver) return;
      frameCount += 1;
      scrollSpeed = 6 + score * 0.08;
      distanceTraveled += scrollSpeed;

      runner.dy += runner.gravity;
      runner.y += runner.dy;
      runner.angle = runner.isGrounded ? 0 : runner.angle + 0.15;

      if (runner.y + runner.height > groundLevel) {
        runner.y = groundLevel - runner.height;
        runner.dy = 0;
        runner.isGrounded = true;
      }

      const spawnRate = Math.max(50, 110 - score);
      if (frameCount % Math.floor(spawnRate + Math.random() * 20) === 0) {
        spawnObstacle();
      }

      for (let i = obstacles.length - 1; i >= 0; i -= 1) {
        const obs = obstacles[i];
        obs.x -= scrollSpeed;

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

      for (let i = particles.length - 1; i >= 0; i -= 1) {
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
      obstacles.forEach((obs) =>
        obs.type === 'CABINET' ? drawCabinet(obs) : drawManager(obs),
      );

      ctx.save();
      ctx.translate(runner.x + runner.width / 2, runner.y + runner.height / 2);
      ctx.rotate(runner.angle);
      if (imageLoaded && weirdlingImgRef.current) {
        ctx.drawImage(
          weirdlingImgRef.current,
          -runner.width / 2,
          -runner.height / 2,
          runner.width,
          runner.height,
        );
      } else {
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
  }, [
    canvasRef,
    weirdlingImgRef,
    gameOver,
    score,
    highScore,
    imageLoaded,
    setGameOver,
    setScore,
    setHighScore,
  ]);
};
