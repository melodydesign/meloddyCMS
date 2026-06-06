// --- WebGL Orange Laser Background ---
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (gl) {
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const vertexShaderSource = `
          attribute vec2 position;
          void main() {
              gl_Position = vec4(position, 0.0, 1.0);
          }
      `;

  const fragmentShaderSource = `
          precision highp float;
          uniform vec2 u_resolution;
          uniform float u_time;

          float random(vec2 st) {
              return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
          }

          float noise(vec2 st) {
              vec2 i = floor(st);
              vec2 f = fract(st);
              float a = random(i);
              float b = random(i + vec2(1.0, 0.0));
              float c = random(i + vec2(0.0, 1.0));
              float d = random(i + vec2(1.0, 1.0));
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
          }

          float fbm(vec2 st) {
              float value = 0.0;
              float amplitude = 0.5;
              for (int i = 0; i < 5; i++) {
                  value += amplitude * noise(st);
                  st *= 2.0;
                  amplitude *= 0.5;
              }
              return value;
          }

          void main() {
              vec2 uv = gl_FragCoord.xy / u_resolution.xy;
              vec2 p = uv * 2.0 - 1.0;
              p.x *= u_resolution.x / u_resolution.y;

              // Central glowing pillar (shifted slightly off-center)
              float beamX = -0.1;
              float dist = abs(p.x - beamX);

              float core = 0.001 / dist;
              core = smoothstep(0.0, 1.0, core);

              float glow = 0.02 / (dist + 0.05);

              // Smoke effect drifting upwards
              vec2 smokeUV = vec2(p.x, p.y - u_time * 0.1);
              float smokeNoise = fbm(smokeUV * 3.0 + vec2(u_time * 0.05, 0.0));
              float smokeScatter = smoothstep(0.8, 0.0, dist);
              float smoke = smokeNoise * smokeScatter * 0.4;

              float pulse = sin(u_time * 2.0) * 0.1 + 0.9;

              vec3 beamColor = vec3(1.0, 0.67, 0.0);
              vec3 smokeColor = vec3(0.8, 0.4, 0.0);
              vec3 coreColor = vec3(1.0, 1.0, 1.0);

              vec3 finalColor = core * coreColor + glow * beamColor * pulse + smoke * smokeColor;
              float edge = smoothstep(1.0, 0.4, abs(p.x)) * smoothstep(1.0, 0.2, abs(p.y));

              gl_FragColor = vec4(finalColor * edge, 1.0);
          }
      `;

  function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0, -1.0, 1.0, 1.0
  ]), gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(program);

  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

  let startTime = performance.now();
  function render() {
    const currentTime = performance.now();
    gl.uniform1f(timeLocation, (currentTime - startTime) / 1000);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
  }
  render();
}

// --- GSAP Animations Boot Sequence ---
document.addEventListener("DOMContentLoaded", () => {
  gsap.set("#bg-orange-bottom", { xPercent: -100, yPercent: 100 });
  gsap.set("#bg-darkorange-bottom", { xPercent: -100, yPercent: 100 });
  gsap.set("#bg-orange-topleft", { xPercent: -100 });

  gsap.set("#hud-elements > div, #frame-container > div", { opacity: 0 });
  gsap.set("#top-accent", { opacity: 0, y: -20 });
  gsap.set("#pre-title", { opacity: 0, letterSpacing: "0.5em" });
  gsap.set("#title-text", { opacity: 0, scale: 1.1, filter: "blur(10px)" });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  tl.to("#bg-orange-topleft", { xPercent: 0, duration: 1.2 })
    .to("#bg-orange-bottom", { xPercent: 0, yPercent: 0, duration: 1.5 }, "-=1.0")
    .to("#bg-darkorange-bottom", { xPercent: 0, yPercent: 0, duration: 1.5 }, "-=1.2")
    .to("#frame-container > div", {
      opacity: 1,
      duration: 1,
      stagger: 0.1,
      ease: "power2.inOut"
    }, "-=1.0")
    .to("#hud-elements > div", {
      opacity: 1,
      duration: 0.1,
      stagger: { each: 0.05, from: "random" }
    }, "-=0.5")
    .to("#hud-elements > div", {
      opacity: 0.5,
      duration: 0.05,
      yoyo: true,
      repeat: 3,
      stagger: { each: 0.02, from: "random" }
    }, "-=0.2")
    .to("#top-accent", {
      opacity: 1,
      y: 0,
      duration: 0.8
    }, "-=0.2")
    .to("#pre-title", {
      opacity: 1,
      letterSpacing: "0.1em",
      duration: 1
    }, "-=0.4")
    .to("#title-text", {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      duration: 1.5,
      ease: "expo.out"
    }, "-=0.2");

  // --- Interactive Flashlight Cards ---
  const glowCards = document.querySelectorAll('.glow-card');
  glowCards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // --- Scroll Reveal Animations ---
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
  };

  const revealObserver = new IntersectionObserver((entries) => {
    let delay = 0;
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('active');
        }, delay);
        delay += 100; // Stagger effect
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal').forEach((el) => {
    revealObserver.observe(el);
  });
});
