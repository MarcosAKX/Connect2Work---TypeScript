import { useEffect, useRef } from 'react';

interface NodePoint { x: number; y: number; vx: number; vy: number }

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const drawingCanvas = canvas;
    const drawingContext = context;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let nodes: NodePoint[] = [];
    let animationFrame = 0;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      drawingCanvas.width = drawingCanvas.offsetWidth * ratio;
      drawingCanvas.height = drawingCanvas.offsetHeight * ratio;
      drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0);
      nodes = Array.from({ length: 46 }, () => ({
        x: Math.random() * drawingCanvas.offsetWidth,
        y: Math.random() * drawingCanvas.offsetHeight,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
      }));
    }

    function draw() {
      const width = drawingCanvas.offsetWidth;
      const height = drawingCanvas.offsetHeight;
      drawingContext.clearRect(0, 0, width, height);
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
          const firstNode = nodes[first];
          const secondNode = nodes[second];
          if (!firstNode || !secondNode) continue;
          const dx = firstNode.x - secondNode.x;
          const dy = firstNode.y - secondNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= 140) continue;
          drawingContext.strokeStyle = `rgba(251, 191, 36, ${(1 - distance / 140) * 0.3})`;
          drawingContext.lineWidth = 1;
          drawingContext.beginPath();
          drawingContext.moveTo(firstNode.x, firstNode.y);
          drawingContext.lineTo(secondNode.x, secondNode.y);
          drawingContext.stroke();
        }
      }

      nodes.forEach((node) => {
        drawingContext.beginPath();
        drawingContext.arc(node.x, node.y, 1.6, 0, Math.PI * 2);
        drawingContext.fillStyle = 'rgba(251, 191, 36, 0.55)';
        drawingContext.fill();
      });
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className="network-bg" aria-hidden="true" />;
}
