---
name: ayush-frontend
description: >-
  Creative frontend engineering skill unifying React Three Fiber (R3F), Liquid Glass JS,
  Shader Gradient, and Liquid-Logo WebGL shaders. Use when building high-end interactive 3D web experiences,
  refractive liquid glass UI components, animated fluid gradients, or real-time liquid metal logo simulations.
---

# Ayush Frontend Skill

The **Ayush Frontend** skill empowers the agent to architect and build next-generation, high-performance creative web interfaces combining WebGL shaders, 3D scenes, fluid simulations, and Apple-inspired refractive glassmorphic interfaces.

All four foundational GitHub repositories are cloned and imported locally inside [`references/`](./references/):
1. **React-Three-Fiber** (`@react-three/fiber`): Declarative, reactive Three.js scenes inside React. Located at [`references/react-three-fiber/`](./references/react-three-fiber/).
2. **Liquid Glass JS** (`liquid-glass-js`): Apple-inspired real-time WebGL refraction, chromatic aberration, specular highlights, and blur. Located at [`references/liquid-glass-js/`](./references/liquid-glass-js/).
3. **Shader Gradient** (`shadergradient`): Fluid 3D animated gradient backgrounds and customizable Three.js shader meshes. Located at [`references/shadergradient/`](./references/shadergradient/).
4. **Liquid-Logo** (`liquid-logo`): Real-time WebGL simplex noise shader simulation for morphing logos into liquid chrome/metal. Located at [`references/liquid-logo/`](./references/liquid-logo/).

---

## Architecture Overview

```
ayush-frontend/
├── SKILL.md                               # Master skill guide & API reference
├── references/                            # Cloned & imported GitHub repositories
│   ├── react-three-fiber/                 # pmndrs/react-three-fiber source & packages
│   ├── liquid-glass-js/                   # dashersw/liquid-glass-js shaders & components
│   ├── shadergradient/                    # ruucm/shadergradient monorepo & UI packages
│   └── liquid-logo/                       # collidingScopes/liquid-logo shaders & canvas
├── examples/                              # Ready-to-use production implementations
│   ├── ReactThreeFiberScene.tsx           # 3D canvas, lighting, float, and distort material
│   ├── LiquidGlassComponent.tsx           # Apple-style glass card & button components
│   ├── ShaderGradientBackground.tsx       # Three.js GLSL fluid background shader
│   ├── LiquidLogoCanvas.tsx               # WebGL liquid-metal logo distortion canvas
│   └── IntegratedHeroExperience.tsx       # Master layout uniting all 4 technologies
└── scripts/
    └── scaffold-frontend.ps1              # Automated dependency installer for projects
```

---

## 1. React-Three-Fiber (R3F) Integration

**Repository**: [`references/react-three-fiber/`](./references/react-three-fiber/)  
**Example**: [`examples/ReactThreeFiberScene.tsx`](./examples/ReactThreeFiberScene.tsx)

### Core Capabilities:
- Declarative Three.js scene graph in standard React JSX.
- Automatic canvas sizing, resize listeners, and high-DPI scaling (`dpr={[1, 2]}`).
- Reactive loop via `useFrame((state, delta) => ...)` for animations.
- Native integration with `@react-three/drei` helpers (`OrbitControls`, `Float`, `MeshDistortMaterial`, `Environment`, `PerspectiveCamera`).

### Quick Start:
```bash
npm install three @types/three @react-three/fiber @react-three/drei
```

```tsx
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';

function HeroMesh() {
  return (
    <Float speed={2} rotationIntensity={1.2}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial color="#6366f1" distort={0.4} speed={2} metalness={0.9} roughness={0.1} />
      </mesh>
    </Float>
  );
}

export function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <HeroMesh />
    </Canvas>
  );
}
```

---

## 2. Liquid Glass JS

**Repository**: [`references/liquid-glass-js/`](./references/liquid-glass-js/)  
**Example**: [`examples/LiquidGlassComponent.tsx`](./examples/LiquidGlassComponent.tsx)

### Core Capabilities:
- True optical refraction simulation based on normal vectors and displacement passes.
- Multi-layered nested glass support (cards containing buttons with independent refractive depths).
- Dynamic tint opacity, specular rim lighting, and backdrop blur.

### Key CSS & Shader Rules:
- Apply `backdrop-filter: blur(16px) saturate(180%)` for hardware-accelerated frosted realism.
- Use dual inset box shadows:
  ```css
  box-shadow:
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2);
  ```
- Specular gradient overlays for realistic light catch on curved borders.

---

## 3. Shader Gradient

**Repository**: [`references/shadergradient/`](./references/shadergradient/)  
**Example**: [`examples/ShaderGradientBackground.tsx`](./examples/ShaderGradientBackground.tsx)

### Core Capabilities:
- 3D interactive mesh gradients driven by Simplex/Perlin noise GLSL shaders.
- Procedural color blending across 3+ key colors with smooth interpolation.
- Configurable noise frequency, flow speed, grain texture, and lighting presets (`halo`, `waterPlane`, `sphere`).

### Usage Pattern:
```tsx
import { ShaderGradientBackground } from './ShaderGradientBackground';

export function Hero() {
  return (
    <ShaderGradientBackground>
      <div className="flex items-center justify-center min-h-screen">
        <h1 className="text-white text-5xl font-black">Ayush Creative Studio</h1>
      </div>
    </ShaderGradientBackground>
  );
}
```

---

## 4. Liquid-Logo WebGL Shader

**Repository**: [`references/liquid-logo/`](./references/liquid-logo/)  
**Example**: [`examples/LiquidLogoCanvas.tsx`](./examples/LiquidLogoCanvas.tsx)

### Core Capabilities:
- Real-time GLSL fragment shader (`references/liquid-logo/fragment-shader.glsl`) applying continuous fluid distortion to uploaded logos and raster graphics.
- Simplex 3D noise functions with adjustable frequency, speed, and intensity factors.
- Specular highlights generating metallic "liquid chrome" reflection effects.
- Blend modes: Normal, Multiply, Screen, Overlay.

### Direct Uniform Controls:
- `u_speed`: Controls flow velocity.
- `u_intensity`: Controls the magnitude of pixel displacement.
- `u_colorShift`: Shifts RGB chromatic aberration across the fluid wavefronts.

---

## 5. Unified Integration: The "Ayush Frontend" Hero Experience

**Example**: [`examples/IntegratedHeroExperience.tsx`](./examples/IntegratedHeroExperience.tsx)

When creating high-impact creative frontends:
1. **Background Layer**: `ShaderGradientBackground` (dynamic WebGL 3D plane or sphere mesh).
2. **Midground 3D Elements**: React Three Fiber Canvas with interactive 3D geometry or floating props.
3. **Featured Asset**: `LiquidLogoCanvas` rendering the brand icon with fluid metallic chrome simulation.
4. **Foreground UI Controls**: `LiquidGlassCard` and `LiquidGlassButton` floating over the canvas with refraction and specular highlights.

---

## Workflow Guide for New Projects

1. **Scaffold Project Dependencies**:
   Run the helper script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Users\ARYAN - AYUSH\.gemini\config\skills\ayush-frontend\scripts\scaffold-frontend.ps1" -TargetDir "<your-project-path>"
   ```

2. **Import Reference Code**:
   Copy or adapt components from [`examples/`](./examples/) directly into your React / Next.js / Vite application.

3. **Verify Performance**:
   - Keep mesh subdivision optimal (e.g., 64x64 or 128x128).
   - Use `gl={{ powerPreference: 'high-performance' }}` on Three.js canvases.
   - Combine canvas contexts when possible to minimize GPU overhead.

refero
design spells
details.so
charco.design
designspells.com
chamjo.design
21st.dev
