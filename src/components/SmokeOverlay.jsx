import { useEffect, useRef } from 'react';

const SmokeOverlay = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width, height;
    let particles = [];

    const smokeImg = new Image();
    smokeImg.src = '/assets/images/smoke_sprite.png';
    let imageLoaded = false;
    
    smokeImg.onload = () => {
      imageLoaded = true;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    window.addEventListener('resize', resize);

    class SmokeParticle {
      constructor() {
        this.x = Math.random() * width;
        this.y = height + (Math.random() * height * 0.5); // Start slightly below screen
        
        // Depth simulation
        this.z = Math.random() * 0.8 + 0.2; 
        
        this.baseSize = 400 + (Math.random() * 800); // Massive smoke plumes
        this.size = this.baseSize * this.z;
        
        // Smoke needs to be very faint to look incredibly realistic and premium
        this.maxOpacity = this.z * 0.15; // Extremely subtle, 15% opacity max
        this.opacity = 0; // Starts invisible at bottom
        
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.001; // Glacial spin
        
        // Slow upward drift
        this.vy = -(Math.random() * 0.8 + 0.2) * this.z;
        this.vx = (Math.random() - 0.5) * 0.2 * this.z;

        // Growth
        this.growthRate = Math.random() * 0.1 + 0.05;
      }

      draw() {
        if (!imageLoaded) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // 'screen' mode removes black background of the smoke sprite perfectly
        ctx.globalCompositeOperation = 'screen'; 
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.drawImage(smokeImg, -this.size / 2, -this.size / 2, this.size, this.size);
        
        ctx.restore();
      }

      update() {
        this.y += this.vy;
        this.x += this.vx;
        this.angle += this.spin;
        this.size += this.growthRate; // Smoke expands as it rises

        // Fade in when starting, fade out when reaching top
        if (this.y > height * 0.7) {
           // Fade in at bottom
           this.opacity += 0.001;
           if (this.opacity > this.maxOpacity) this.opacity = this.maxOpacity;
        } else if (this.y < height * 0.4) {
           // Fade out at top
           this.opacity -= 0.001;
           if (this.opacity < 0) this.opacity = 0;
        } else {
           this.opacity = this.maxOpacity;
        }

        // Reset when completely off top or fully faded
        if (this.y < -this.size || (this.opacity <= 0 && this.y < height * 0.4)) {
          this.y = height + (Math.random() * this.size * 0.5);
          this.x = Math.random() * width;
          this.size = this.baseSize * this.z;
          this.opacity = 0;
        }
      }
    }

    const initParticles = () => {
      particles = [];
      const numberOfParticles = Math.floor(width / 80); // Responsive particle count
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new SmokeParticle());
      }
    };

    let isCanvasVisible = true;
    let isRunning = false;

    const startLoop = () => {
      if (!isRunning) {
        isRunning = true;
        animate();
      }
    };

    const stopLoop = () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };

    const animate = () => {
      if (!isRunning) return;

      // Clear canvas so the photo below is perfectly visible
      ctx.clearRect(0, 0, width, height);

      // Sort by Z index to draw background smoke first
      particles.sort((a, b) => a.z - b.z);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isCanvasVisible = entry.isIntersecting;
        if (isCanvasVisible) {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0 }
    );

    resize();
    observer.observe(canvas);

    return () => {
      window.removeEventListener('resize', resize);
      observer.disconnect();
      stopLoop();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1, // Sits above the photo (-2) but below text (1)
        pointerEvents: 'none' 
      }} 
    />
  );
};

export default SmokeOverlay;
