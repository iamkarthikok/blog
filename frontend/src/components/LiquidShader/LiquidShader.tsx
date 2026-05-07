import { useEffect, useRef } from 'react'
import './LiquidShader.css'

const VS = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FS = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / u_res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.45;

  // Diagonal axis: 0 at BL, ~1.41 at TR (wave travels along this)
  float diag = (uv.x + uv.y) * 0.7071;

  // Iterative sin/cos warp — produces caustic-like swirls (the look of light
  // refracted through moving water).
  vec2 q = p * 2.4;
  for (int i = 0; i < 4; i++) {
    float fi = float(i + 1);
    q += vec2(
      sin(q.y * 1.3 + t / fi + 0.6),
      cos(q.x * 1.3 + t / fi + 0.2)
    ) * 0.55 / fi;
  }

  // Caustic field: sharp bright bands where the swirls coincide
  float caustic = 0.5 + 0.5 * sin(q.x + q.y + u_time * 1.1);
  caustic = pow(caustic, 0.55);

  // Diagonal wave front traveling BL → TR, shaped by the caustic field
  float wave = 0.5 + 0.5 * sin(diag * 5.2 - u_time * 1.0 + caustic * 3.4);
  wave = pow(wave, 1.5);

  // Surface noise for organic variation
  float n = fbm(p * 1.8 + vec2(t * 0.5, t * 0.2));

  // Combine signals into an intensity field
  float intensity = caustic * 0.6 + wave * 0.35 + n * 0.15;

  // ---------- color palette ----------
  // The "warm" base is intentionally near-bg (alpha-feel) so the accent areas
  // of the wave dissolve into the page rather than reading as red/orange —
  // letting the cool teal + gold highlights drive the visible color.
  vec3 warm = vec3(0.97, 0.94, 0.86);
  vec3 hot = vec3(0.98, 0.58, 0.32);
  vec3 cool = vec3(0.15, 0.52, 0.62);
  vec3 highlight = vec3(0.96, 0.86, 0.62);

  vec3 color = mix(cool, warm, smoothstep(0.25, 0.75, caustic));
  color = mix(color, hot, smoothstep(0.55, 0.95, wave) * 0.55);
  color = mix(color, highlight, pow(caustic, 5.0) * 0.7);

  // Bottom-weighted: more turbulence near the waterline (BL corner)
  float bottom = mix(0.78, 1.0, pow(1.0 - uv.y, 1.4));
  // Slight diagonal bias so BL is a touch denser than TR
  float bias = mix(0.85, 1.0, 1.0 - smoothstep(0.0, 1.4, diag));
  intensity *= bottom * bias;

  // Lift saturation a touch so the wash reads vivid in browsers that don't
  // gamma-boost canvas output (Firefox in particular).
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(lum), color, 1.18);
  color = clamp(color, 0.0, 1.0);

  // Fade alpha where warm dominates so those regions become visibly transparent
  // — keeps the wave moving without imposing the red/orange tone.
  float warmZone = smoothstep(0.45, 0.85, caustic);
  float alpha = intensity * 0.5 * mix(1.0, 0.25, warmZone);

  // Premultiplied output — the rgb channels are baked with alpha so the
  // composite is consistent across browsers.
  gl_FragColor = vec4(color * alpha, alpha);
}
`

export function LiquidShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      // Premultiplied alpha is the standard WebGL composite path and renders
      // consistently across Chrome and Firefox; non-premultiplied Firefox
      // tends to wash out colors on transparent canvases.
      premultipliedAlpha: true,
      alpha: true,
      antialias: false,
    })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('shader compile:', gl.getShaderInfoLog(sh))
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, VS)
    const fs = compile(gl.FRAGMENT_SHADER, FS)
    if (!vs || !fs) return

    const program = gl.createProgram()!
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('program link:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const posLoc = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'u_res')
    const uTime = gl.getUniformLocation(program, 'u_time')

    gl.enable(gl.BLEND)
    // Blend func for premultiplied output: source already includes alpha multiply.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    // Clamp DPR aggressively — full-screen WebGL at retina resolution is
    // expensive and we don't need pixel-perfect rendering for a soft wash.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.0)

    let raf = 0
    const start = performance.now()
    const tick = () => {
      // Size sync runs every frame: cheap when nothing changes (the if-guard
      // skips the GL state update), but immune to layout races on first mount
      // and to viewport changes (devtools, fullscreen, etc.) without needing a
      // separate resize listener.
      const w = Math.max(1, Math.floor(window.innerWidth * dpr))
      const h = Math.max(1, Math.floor(window.innerHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        gl.uniform2f(uRes, w, h)
      }
      gl.uniform1f(uTime, (performance.now() - start) / 1000)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return <canvas ref={canvasRef} className="liquid-shader" aria-hidden="true" />
}
