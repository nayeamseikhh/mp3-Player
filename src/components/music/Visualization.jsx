import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@context/PlayerContext';

const Visualization = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const { analyserRef, audioElementRef, currentTrack, isPlaying } = usePlayer();
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(255, 138, 50, 0.15)');
      gradient.addColorStop(0.5, 'rgba(255, 138, 50, 0.05)');
      gradient.addColorStop(1, 'rgba(255, 138, 50, 0.02)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const analyser = analyserRef.current;
      if (!analyser || !isPlaying) {
        // Draw idle waveform
        drawIdleWaveform(ctx, width, height);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 2.5;
      const barSpacing = (width / bufferLength) * 0.5;
      let x = 0;

      // Draw frequency bars
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const hue = (i / bufferLength) * 360;
        const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        barGradient.addColorStop(0, `hsla(${hue}, 80%, 50%, 0.6)`);
        barGradient.addColorStop(1, `hsla(${hue}, 90%, 65%, 0.9)`);
        ctx.fillStyle = barGradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + barSpacing;
      }

      // Draw waveform
      drawWaveform(ctx, width, height, dataArray);
    };

    const drawIdleWaveform = (ctx, width, height) => {
      const time = Date.now() / 1000;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 138, 50, 0.3)';
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.02 + time) * height * 0.1;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    const drawWaveform = (ctx, width, height, dataArray) => {
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();

      const sliceWidth = width / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 255.0;
        const y = v * height / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();
    };

    animationRef.current = requestAnimationFrame(draw);
    setIsCanvasReady(true);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserRef, isPlaying]);

  return (
    <div className="w-full h-48 bg-bg-tertiary rounded-lg overflow-hidden border border-border-default">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default Visualization;