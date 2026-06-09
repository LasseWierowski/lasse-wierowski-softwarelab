# PLAN.md — Ray Closest Point 3D

## Context

University software-lab project. The user shoots rays from different camera angles, presses C to compute the closest 3D point to all accumulated rays (via least-squares linear system), and a sphere spawns at that point. The app demonstrates spatial ray convergence and reports RMS error per sphere as a quality metric.

---

## Tech Stack

| Concern | Library |
|---------|---------|
| 3D rendering | Three.js + OrbitControls |
| State management | Redux Toolkit + redux-undo |
| Math | mathjs |
| Language | TypeScript |
| Bundler | Vite |
| Tests | Vitest + jsdom (TDD, 70% coverage on logic + state) |
| UI | Plain DOM (no framework) |

---

## Layer Architecture

```
src/
  logic/           # Pure math — no imports from state or view
  state/           # Redux store, slices, selectors — no Three.js
  view3d/          # Three.js scene — reads from store, dispatches actions
  view2d/          # DOM panel — reads from store, dispatches actions
  main.ts          # Wires all layers together
```

---

## File Structure

```
src/
  logic/
    rayIntersection.ts     # LSLS solver → Point3D | null
    rmsError.ts            # perp distance + RMS helpers
  state/
    store.ts               # configureStore, redux-undo wiring
    sceneSlice.ts          # undoable: currentRays, spheres
    cameraSlice.ts         # NOT undoable: cameraPose (outside undo history)
    selectors.ts           # lastSphere, currentRayCount, etc.
  view3d/
    Scene.ts               # Renderer, camera, grid, animation loop
    RayRenderer.ts         # LineSegments — manages geometry lifecycle
    SphereRenderer.ts      # Mesh spheres + hover raycaster + tooltip
    CameraController.ts    # OrbitControls → dispatches updateCameraPose (throttled)
  view2d/
    UIPanel.ts             # DOM panel, store.subscribe(), textContent updates
  main.ts
  vite.config.ts           # Vitest config: jsdom environment + coverage thresholds
  __tests__/
    logic/
      rayIntersection.test.ts
      rmsError.test.ts
    state/
      sceneSlice.test.ts
```

---

## Data Models

Use plain `{x, y, z}` objects throughout — serializable into Redux, self-documenting, no conversion friction at the Three.js boundary.

```typescript
interface Point3D { x: number; y: number; z: number; }

interface Ray {
  origin: Point3D;      // camera world position when R was pressed
  direction: Point3D;   // normalized camera forward vector
}

interface Sphere {
  id: string;           // crypto.randomUUID()
  position: Point3D;    // computed closest point
  rays: Ray[];          // archived rays for this set (display only)
  rmsError: number;     // sqrt(Σ perp_dist² / n)
}

// sceneSlice (wrapped with undoable)
interface SceneState {
  currentRays: Ray[];
  spheres: Sphere[];
}

// cameraSlice (NOT undoable — separate from undo history)
interface CameraState {
  position: Point3D;
  target: Point3D;
}
```

Converting to Three.js at the boundary: `new THREE.Vector3(p.x, p.y, p.z)`. This happens only in `view3d/`, never in logic or state.

---

## LSLS Algorithm (`src/logic/rayIntersection.ts`)

Given N rays (origin `o_i`, unit direction `d_i`), minimize total squared perpendicular distance to point P.

Projection matrix onto the plane perpendicular to each ray:
```
M_i = I − d_i ⊗ d_i
```

Build the 3×3 system using mathjs:
```
A = Σ M_i
b = Σ M_i · o_i
P = A⁻¹ · b
```

Return `null` if:
- N < 2 (not enough rays)
- `Math.abs(mathjs.det(A)) < 1e-10` (singular — parallel or near-parallel rays)

The epsilon `1e-10` is relative to a unit-scale scene; document it as a named constant `SINGULAR_THRESHOLD`.

---

## Redux State Design

### Undo granularity

Undo/redo operates at the **action level** via redux-undo. The meaningful undo steps are:
- `spawnSphere` (undo = remove that sphere + restore its rays to `currentRays`)
- `addRay` (undo = remove last ray)
- `clearRays` (undo = restore rays)
- `deleteSphere` (undo = restore sphere)

Pressing Ctrl+Z after 5 ray-adds will step back through them one at a time. This is acceptable for a lab tool. If it becomes annoying, `groupBy` in redux-undo can batch all `addRay` actions between two `spawnSphere` actions — leave this as a future enhancement.

### `sceneSlice` actions (all undoable)

| Action | Payload | Effect |
|--------|---------|--------|
| `addRay` | `Ray` | Push to `currentRays` |
| `spawnSphere` | `{ position: Point3D, rays: Ray[], rmsError: number }` | Append sphere, clear `currentRays` |
| `deleteSphere` | `id: string` | Remove sphere by id |
| `clearRays` | — | Reset `currentRays` to `[]` |

`spawnSphere` receives an already-computed result — **the LSLS call happens in the event handler, not the reducer**:

```typescript
// In the keydown handler (main.ts or CameraController)
case 'c': {
  const { currentRays } = store.getState().scene.present;
  if (currentRays.length < 2) return;
  const position = computeClosestPoint(currentRays); // logic layer
  if (!position) return; // parallel rays
  const rmsError = computeRmsError(position, currentRays);
  dispatch(spawnSphere({ position, rays: currentRays, rmsError }));
  break;
}
```

### `cameraSlice` actions

| Action | Payload | Effect |
|--------|---------|--------|
| `updateCameraPose` | `{ position, target }` | Overwrite camera state |

### Store shape

```typescript
{
  scene: UndoableState<SceneState>,  // .past / .present / .future
  camera: CameraState                // outside undo history
}
```

Undo/Redo: dispatch `ActionCreators.undo()` / `ActionCreators.redo()` targeting the `scene` slice only.

---

## Keyboard / Interaction Map

| Input | Action |
|-------|--------|
| `R` | Read `camera.position` + forward vector, dispatch `addRay` |
| `C` | Compute LSLS in handler → dispatch `spawnSphere` (or no-op) |
| `Shift+Click` on sphere | Dispatch `deleteSphere` (see click detection below) |
| Undo button / `Ctrl+Z` | `ActionCreators.undo()` |
| Redo button / `Ctrl+Y` | `ActionCreators.redo()` |
| "New Ray Set" button | Dispatch `clearRays` |

### Shift+Click vs. OrbitControls conflict

OrbitControls consumes mouse events. A short drag must not trigger `deleteSphere`. Detection strategy:

```typescript
let mouseDownPos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', (e) => {
  if (!e.shiftKey) return;
  const dx = e.clientX - mouseDownPos.x;
  const dy = e.clientY - mouseDownPos.y;
  if (Math.hypot(dx, dy) > 4) return; // was a drag, not a click
  // proceed with raycasting for deleteSphere
});
```

---

## 3D Scene Details

- Dark background (`#1a1a2e`)
- `GridHelper` on Y=0 plane
- Ray line segments: origin → origin + direction × 25 units
  - Current (not yet computed): green `#00ff88`
  - Archived (belonging to a sphere): grey `#888888`
- Spheres: radius 0.15, red `#ff4444` `MeshStandardMaterial`
- Hover tooltip: `Raycaster` on `mousemove`, tooltip `<div>` positioned via `Vector3.project(camera)` → NDC → pixel coords (multiply by `devicePixelRatio` for retina correctness)

### `RayRenderer` geometry lifecycle

Every `addRay`, `spawnSphere`, `deleteSphere`, and undo/redo triggers a geometry rebuild. The class owns two `LineSegments` objects (current + archived). On each store update:

```typescript
update(state: SceneState) {
  this.currentLines.geometry.dispose();
  this.currentLines.geometry = buildGeometry(state.currentRays, 25);

  this.archivedLines.geometry.dispose();
  this.archivedLines.geometry = buildGeometry(
    state.spheres.flatMap(s => s.rays), 25
  );
}
```

`buildGeometry` returns a new `BufferGeometry` with a `Float32Array` of segment endpoints.

### `SphereRenderer` disposal

When `deleteSphere` fires, the corresponding `Mesh` must be explicitly disposed before removal:

```typescript
removeSphere(id: string) {
  const mesh = this.meshes.get(id);
  if (!mesh) return;
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
  this.scene.remove(mesh);
  this.meshes.delete(id);
}
```

On full undo/redo replays, diff the incoming sphere list against `this.meshes` to determine which to add/remove.

---

## 2D UI Panel (`UIPanel.ts`)

Subscribes to `store.subscribe()`. Reads state via selectors, updates `textContent` only (no innerHTML with dynamic data):

```
┌─────────────────────────────┐
│ Current rays: 3              │
│ Last sphere: (1.20, 0.50, 3.10) │
│ RMS error: 0.042             │
│ [Undo] [Redo] [New Ray Set] │
└─────────────────────────────┘
```

---

## Camera Pose Persistence

`CameraController.ts` listens to OrbitControls `change` events (fires at ~60fps during interaction). Dispatches `updateCameraPose` via a **hand-rolled throttle** (no lodash dependency):

```typescript
function throttle(fn: () => void, ms: number) {
  let last = 0;
  return () => { const now = Date.now(); if (now - last >= ms) { last = now; fn(); } };
}
```

Throttle interval: 200ms. On app init, if Redux has a saved pose, apply it to the Three.js camera and `controls.target` before the first render.

---

## `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      include: ['src/logic/**', 'src/state/**'],
      thresholds: { lines: 70, functions: 70, branches: 70 },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

`setup.ts` must polyfill `crypto.randomUUID()` for jsdom:

```typescript
// src/__tests__/setup.ts
import { vi } from 'vitest';
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => vi.fn()(() => Math.random().toString(36).slice(2)) },
  });
}
```

---

## Test Plan (TDD — write tests first)

### `src/logic/rayIntersection.test.ts`
- Two perpendicular rays that perfectly intersect → result ≈ known point
- Three near-intersecting rays → result within tolerance
- Parallel rays (same direction) → returns `null`
- Near-parallel rays (det < `SINGULAR_THRESHOLD`) → returns `null`
- Single ray → returns `null`

### `src/logic/rmsError.test.ts`
- `perpDistance(point, ray)` — point on ray → 0; point offset known distance → exact value
- `computeRmsError` with perfect convergence → 0
- `computeRmsError` with controlled offset → expected value

### `src/state/sceneSlice.test.ts`
- `addRay` → appends to `currentRays`
- `spawnSphere` → appends sphere with correct payload, clears `currentRays`
- `spawnSphere` with < 2 rays → should not be dispatched (guard in handler, not reducer; test the handler guard separately)
- `deleteSphere` → removes correct sphere by id, others unchanged
- `clearRays` → empties `currentRays`, leaves spheres unchanged
- Undo after `addRay` → `currentRays` reverts
- Undo after `spawnSphere` → sphere removed, `currentRays` restored
- Redo after undo → re-applies correctly

---

## Build / Run

```bash
pnpm dev            # Vite dev server
pnpm build          # tsc + vite build
pnpm test           # vitest
pnpm test --coverage  # vitest with coverage report
```
