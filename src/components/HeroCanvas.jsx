import { useEffect, useRef } from 'react';

const HeroCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width, height;
    let particles = [];
    
    // Mouse state
    let mouse = { x: null, y: null, radius: 350 }; // Large radius for a soft breeze effect

    // Image setup
    const leafImg = new Image();
    leafImg.src = '/assets/images/leaf_realistic.png';
    let imageLoaded = false;
    
    leafImg.onload = () => {
      imageLoaded = true;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      // Handle high DPI displays for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      initParticles();
    };

    window.addEventListener('resize', resize);
    
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    class Leaf {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        
        // Depth of Field (Z-index simulation): 0.1 (far background) to 1.0 (close foreground)
        this.z = Math.random() * 0.9 + 0.1; 
        
        // Size based on Z depth
        this.baseSize = 100 + (Math.random() * 250); // 100px to 350px base
        this.size = this.baseSize * this.z;
        
        // Opacity based on Z depth (far away = transparent, close = opaque)
        this.baseOpacity = this.z * 0.45; // Max opacity 0.45 to keep it subtle and not overwhelm text
        this.currentOpacity = this.baseOpacity;

        this.density = (Math.random() * 30) + 10;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.005; // Very slow cinematic spin
        
        // Float speed scales with Z (parallax illusion: foreground moves faster)
        this.vy = -(Math.random() * 0.4 + 0.1) * this.z;
        this.vx = (Math.random() - 0.5) * 0.2 * this.z;
      }

      draw() {
        if (!imageLoaded) return;

        ctx.save();
        ctx.globalAlpha = this.currentOpacity;
        
        // 'screen' blending mode flawlessly removes the black background of the generated image
        ctx.globalCompositeOperation = 'screen'; 
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw centered
        ctx.drawImage(leafImg, -this.size / 2, -this.size / 2, this.size, this.size);
        
        ctx.restore();
      }

      update() {
        this.y += this.vy;
        this.x += this.vx;
        this.angle += this.spin;

        // Wrap around smoothly
        if (this.y < -this.size) {
          this.y = height + this.size;
          this.x = Math.random() * width;
        }
        if (this.x < -this.size) this.x = width + this.size;
        if (this.x > width + this.size) this.x = -this.size;

        // Smooth mouse wind physics
        if (mouse.x != null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < mouse.radius) {
            let forceDirectionX = dx / distance;
            let forceDirectionY = dy / distance;
            
            // Ease out force
            let force = (mouse.radius - distance) / mouse.radius;
            // Smooth dampening
            let smoothForce = force * force;
            
            // Foreground leaves are affected more by wind than background leaves
            let depthFactor = this.z;
            
            let directionX = forceDirectionX * smoothForce * this.density * depthFactor;
            let directionY = forceDirectionY * smoothForce * this.density * depthFactor;

            // Push away softly
            this.x -= directionX;
            this.y -= directionY;
            
            // Add slight turbulence to spin
            this.angle += (directionX + directionY) * 0.001;
            
            // Slightly fade out when mouse passes over
            this.currentOpacity = Math.max(0.05, this.baseOpacity - (force * 0.2));
          } else {
            this.currentOpacity = this.baseOpacity;
          }
        } else {
          this.currentOpacity = this.baseOpacity;
        }
      }
    }

    const initParticles = () => {
      particles = [];
      // Fewer particles because images take up more space and rendering power
      const numberOfParticles = Math.floor((width * height) / 45000); 
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Leaf());
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

      // Clear background with matching premium charcoal-olive color (#0C0D0A)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0C0D0A';
      ctx.fillRect(0, 0, width, height);
      
      // Sort particles by Z so background draws first
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
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
        zIndex: -2,
        pointerEvents: 'none' // Ensure it doesn't block interactions with the text
      }} 
    />
  );
};

export default HeroCanvas;
