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
    Scene.ts               # Renderer, camera, grid, RAF loop
    RayRenderer.ts         # LineSegments — manages geometry lifecycle
    SphereRenderer.ts      # Mesh spheres + hover raycaster + tooltip
    CameraController.ts    # OrbitControls → dispatches updateCameraPose (throttled)
  view2d/
    UIPanel.ts             # DOM panel, store.subscribe(), textContent updates
  main.ts
  vite.config.ts           # Vitest config: jsdom environment + coverage thresholds
  __tests__/
    setup.ts               # jsdom polyfills
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

**Known tradeoff — ray data duplication:** `spawnSphere` copies `currentRays` into the sphere payload. Those rays then live in both the sphere object and the redux-undo history snapshots of `currentRays`. For a lab tool with ≤20 spheres × ≤20 rays × ≤30 undo steps this is acceptable (~12 000 Point3D objects). If the undo history grows large, it will be visible in Redux DevTools as an oversized state tree.

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
- `Math.abs(mathjs.det(A)) < SINGULAR_THRESHOLD` (parallel or near-parallel rays)

```typescript
// Chosen empirically for N ≤ 20 rays in a scene of ≤ 50 unit radius.
// det(A) is dimensionless and bounded by ray count × angular spread.
// Revisit if scene scale or ray count changes significantly.
const SINGULAR_THRESHOLD = 1e-10;
```

---

## Redux State Design

### Undo granularity

Undo/redo operates at the **action level** via redux-undo. The meaningful undo steps are:
- `spawnSphere` (undo = remove that sphere + restore its rays to `currentRays`)
- `addRay` (undo = remove last ray)
- `clearRays` (undo = restore rays)
- `deleteSphere` (undo = restore sphere)

Pressing Ctrl+Z after 5 ray-adds steps back through them one at a time. Acceptable for a lab tool. If it becomes annoying, `groupBy` in redux-undo can batch all `addRay` actions between two `spawnSphere` actions — leave as a future enhancement.

### `sceneSlice` actions (all undoable)

| Action | Payload | Effect |
|--------|---------|--------|
| `addRay` | `Ray` | Push to `currentRays` |
| `spawnSphere` | `{ position: Point3D, rays: Ray[], rmsError: number }` | Append sphere, clear `currentRays` |
| `deleteSphere` | `id: string` | Remove sphere by id |
| `clearRays` | — | Reset `currentRays` to `[]` |

`spawnSphere` receives an already-computed result — **the LSLS call happens in the event handler, not the reducer**:

```typescript
// In the keydown handler (main.ts)
case 'c': {
  const { currentRays } = store.getState().scene.present;
  if (currentRays.length < 2) {
    uiPanel.showStatus('Need at least 2 rays');
    return;
  }
  const position = computeClosestPoint(currentRays);
  if (!position) {
    uiPanel.showStatus('Rays are parallel — no unique intersection');
    return;
  }
  const rmsError = computeRmsError(position, currentRays);
  dispatch(spawnSphere({ position, rays: [...currentRays], rmsError }));
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
| `C` | Compute LSLS in handler → dispatch `spawnSphere` (or show status message) |
| `Shift+Click` on sphere | Dispatch `deleteSphere` (see click detection below) |
| Undo button / `Ctrl+Z` | `ActionCreators.undo()` |
| Redo button / `Ctrl+Y` | `ActionCreators.redo()` |
| "New Ray Set" button | Dispatch `clearRays` |

Keyboard events are bound to **`document`**, not the canvas. The canvas never needs `tabIndex`. Do not add `keydown` listeners to any `<input>` element — if inputs are ever added, guard with `e.target instanceof HTMLInputElement` check.

### Shift+Click vs. OrbitControls conflict

OrbitControls consumes mouse events. A short drag must not trigger `deleteSphere`. Strategy: record `mousedown` position, only treat `mouseup` as a click if delta < 4px.

```typescript
let mouseDownPos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', (e) => {
  if (!e.shiftKey) return;
  if (Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y) > 4) return;
  // proceed with raycasting for deleteSphere
});
```

---

## Rendering Architecture: RAF loop vs. Redux subscriptions

These are two separate update paths and must not be conflated:

| Path | Purpose | Trigger |
|------|---------|---------|
| `requestAnimationFrame` loop in `Scene.ts` | Calls `renderer.render(scene, camera)` every frame | Unconditional — required for smooth OrbitControls damping |
| `store.subscribe()` in view classes | Updates Three.js geometry and DOM | Triggered by Redux dispatch |

**`renderer.render()` runs unconditionally every frame.** Geometry updates (RayRenderer, SphereRenderer) and DOM updates (UIPanel) happen only in `store.subscribe()` callbacks.

### Preventing redundant geometry rebuilds

`store.subscribe()` fires on *every* dispatch, including `updateCameraPose` (every 200ms during orbit). Use reference equality to skip rebuilds when the scene slice did not change:

```typescript
// In main.ts, after store setup
let prevScene: SceneState | null = null;

store.subscribe(() => {
  const scene = store.getState().scene.present;
  if (scene === prevScene) return;
  prevScene = scene;
  rayRenderer.update(scene);
  sphereRenderer.update(scene);
});
```

`UIPanel` can apply the same guard keyed on the full state if needed.

---

## 3D Scene Details

- Dark background (`#1a1a2e`)
- `GridHelper` on Y=0 plane
- Ray line segments: origin → origin + direction × 25 units
  - Current (not yet computed): green `#00ff88`
  - Archived (belonging to a sphere): grey `#888888`
- Spheres: radius 0.15, red `#ff4444` `MeshStandardMaterial`
- Hover tooltip: `Raycaster` on `mousemove`, see tooltip spec below

### `RayRenderer` geometry lifecycle

The class owns two `LineSegments` objects (current + archived). On each `update()` call:

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

`buildGeometry` returns a new `BufferGeometry` with a `Float32Array` of segment endpoints. When there are zero rays, return a geometry with an empty positions array (not null) to avoid Three.js warnings.

### `SphereRenderer` lifecycle and diffing

`SphereRenderer` owns a `Map<string, THREE.Mesh>` keyed by sphere id. On each `update()`:

```typescript
update(state: SceneState) {
  const incomingIds = new Set(state.spheres.map(s => s.id));

  // Remove meshes no longer in state
  for (const [id, mesh] of this.meshes) {
    if (!incomingIds.has(id)) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.scene.remove(mesh);
      this.meshes.delete(id);
    }
  }

  // Add meshes not yet in map
  for (const sphere of state.spheres) {
    if (!this.meshes.has(sphere.id)) {
      const mesh = this.buildMesh(sphere);
      this.scene.add(mesh);
      this.meshes.set(sphere.id, mesh);
    }
  }
}
```

Sphere positions are immutable after creation — no position update path needed.

### Tooltip positioning

The tooltip is a `<div>` appended to `document.body` with `position: fixed`. It must not be inside the canvas container (which may have `overflow: hidden`). Conversion from 3D to screen coords:

```typescript
function toScreenPos(point: THREE.Vector3, camera: THREE.Camera, canvas: HTMLCanvasElement) {
  const ndc = point.clone().project(camera);
  return {
    x: (ndc.x + 1) / 2 * canvas.clientWidth,
    y: (1 - ndc.y) / 2 * canvas.clientHeight,
  };
}
```

Use `canvas.clientWidth/clientHeight` (CSS pixels), not `canvas.width/canvas.height` (device pixels). This is correct on retina displays without manual `devicePixelRatio` scaling.

---

## 2D UI Panel (`UIPanel.ts`)

Subscribes to `store.subscribe()`. Reads state via selectors, updates `textContent` only (no innerHTML with dynamic data).

Exposes a `showStatus(msg: string)` method for transient messages (LSLS failure reasons). Status clears after 3 seconds via `setTimeout`.

```
┌─────────────────────────────────────┐
│ Current rays: 3                      │
│ Last sphere: (1.20, 0.50, 3.10)     │
│ RMS error: 0.042                     │
│ [Undo] [Redo] [New Ray Set]         │
│ Status: Need at least 2 rays        │
└─────────────────────────────────────┘
```

---

## Camera Pose Persistence

`CameraController.ts` listens to OrbitControls `change` events (~60fps during interaction). Dispatches `updateCameraPose` via a hand-rolled throttle (no lodash):

```typescript
function throttle(fn: () => void, ms: number) {
  let last = 0;
  return () => { const now = Date.now(); if (now - last >= ms) { last = now; fn(); } };
}
```

Throttle interval: 200ms.

**Init:** On app start, read Redux camera state and apply it to the Three.js camera and `controls.target` before the first render. If Redux camera state is at its default values (e.g., position `{x:0, y:5, z:10}`, target `{x:0,y:0,z:0}`), apply those too — this is the canonical initial camera pose.

**Reverse sync (Redux → Three.js):** If camera state is ever set from outside `CameraController` (e.g., a future "reset camera" feature), `CameraController` must pick it up. Wire this by checking in `store.subscribe()` whether `camera` state changed and, if so, applying it to `controls.object.position` and `controls.target`, then calling `controls.update()`.

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

`setup.ts` polyfills `crypto.randomUUID()` for jsdom:

```typescript
// src/__tests__/setup.ts
if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => Math.random().toString(36).slice(2) },
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
- `deleteSphere` → removes correct sphere by id, others unchanged
- `clearRays` → empties `currentRays`, leaves spheres unchanged
- Undo after `addRay` → `currentRays` reverts
- Undo after `spawnSphere` → sphere removed, `currentRays` restored
- Redo after undo → re-applies correctly

### Handler guard (inline in `main.test.ts` or integration test)
- C pressed with 0 rays → `spawnSphere` not dispatched, `uiPanel.showStatus` called
- C pressed with 1 ray → same
- C pressed with parallel rays → `computeClosestPoint` returns `null`, `spawnSphere` not dispatched

---

## Build / Run

```bash
pnpm dev              # Vite dev server
pnpm build            # tsc + vite build
pnpm test             # vitest
pnpm test --coverage  # vitest with coverage report
```
