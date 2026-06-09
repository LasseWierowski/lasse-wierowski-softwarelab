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
| Tests | Vitest (TDD, 70% coverage on logic + state) |
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
    cameraSlice.ts         # NOT undoable: cameraPose
    selectors.ts           # lastSphere, currentRayCount, etc.
  view3d/
    Scene.ts               # Renderer, camera, grid, animation loop
    RayRenderer.ts         # LineSegments for current (green) + archived (grey) rays
    SphereRenderer.ts      # Mesh spheres + hover raycaster + tooltip
    CameraController.ts    # OrbitControls → dispatches updateCameraPose (throttled)
  view2d/
    UIPanel.ts             # DOM panel, store.subscribe(), innerHTML updates
  main.ts
  __tests__/
    logic/
      rayIntersection.test.ts
      rmsError.test.ts
    state/
      sceneSlice.test.ts
```

---

## Data Models

```typescript
type Vec3 = [number, number, number];

interface Ray {
  origin: Vec3;       // camera world position when R was pressed
  direction: Vec3;    // normalized camera forward vector
}

interface Sphere {
  id: string;         // crypto.randomUUID()
  position: Vec3;     // computed closest point
  rays: Ray[];        // archived rays for this set (display only)
  rmsError: number;   // sqrt(Σ perp_dist² / n)
}

// sceneSlice (wrapped with undoable)
interface SceneState {
  currentRays: Ray[];
  spheres: Sphere[];
}

// cameraSlice (NOT undoable)
interface CameraState {
  position: Vec3;
  target: Vec3;
}
```

---

## LSLS Algorithm (`src/logic/rayIntersection.ts`)

Given N rays (origin `o_i`, unit direction `d_i`), minimize total squared perpendicular distance to point P.

The projection matrix onto the plane perpendicular to each ray:
```
M_i = I - d_i ⊗ d_i
```

Build the 3×3 system using mathjs:
```
A = Σ M_i
b = Σ M_i · o_i
P = A⁻¹ · b
```

Return `null` if N < 2 or if A is singular (parallel rays — det(A) ≈ 0).

---

## Redux State Design

### `sceneSlice` actions (all undoable via redux-undo)

| Action | Payload | Effect |
|--------|---------|--------|
| `addRay` | `Ray` | Push to `currentRays` |
| `computeIntersection` | — | Run LSLS on `currentRays`, spawn `Sphere`, clear `currentRays` |
| `deleteSphere` | `id: string` | Remove sphere by id |
| `clearRays` | — | Reset `currentRays` to `[]` |

### `cameraSlice` actions

| Action | Payload | Effect |
|--------|---------|--------|
| `updateCameraPose` | `{ position, target }` | Overwrite camera state |

### Store shape

```typescript
{
  scene: UndoableState<SceneState>,  // has .past / .present / .future
  camera: CameraState
}
```

Undo/Redo dispatches `ActionCreators.undo()` / `ActionCreators.redo()` from redux-undo on the `scene` slice only.

---

## Keyboard / Interaction Map

| Input | Action |
|-------|--------|
| `R` | Extract camera pose from Three.js, dispatch `addRay` |
| `C` | Dispatch `computeIntersection` (no-op if < 2 rays) |
| `Shift+Click` on sphere | Dispatch `deleteSphere` |
| Undo button / `Ctrl+Z` | `ActionCreators.undo()` |
| Redo button / `Ctrl+Y` | `ActionCreators.redo()` |
| "New Ray Set" button | Dispatch `clearRays` |

---

## 3D Scene Details

- Dark background (`#1a1a2e` or similar)
- `GridHelper` on Y=0 plane
- Ray line segments: origin → origin + direction × 25 units
  - Current (not yet computed): green `#00ff88`
  - Archived (belonging to a sphere): grey `#888888`
- Spheres: radius 0.15, red `#ff4444` `MeshStandardMaterial`
- Hover via `Raycaster` on `mousemove`; tooltip div positioned at projected screen coords, shows `(x, y, z)` and `RMS: X.XXX`

---

## 2D UI Panel (`UIPanel.ts`)

Subscribes to `store.subscribe()`. On each update reads:
- `selectors.lastSphere(state)` → coordinates + RMS
- `selectors.currentRayCount(state)` → status line

Renders (static HTML skeleton, dynamic text nodes updated via `textContent`):
```
┌─────────────────────────────┐
│ Current rays: 3              │
│ Last sphere: (1.2, 0.5, 3.1)│
│ RMS error: 0.042             │
│ [Undo] [Redo] [New Ray Set] │
└─────────────────────────────┘
```

---

## Camera Pose Persistence

`CameraController.ts` attaches a `change` listener to OrbitControls. On change, reads `camera.position` and `controls.target`, dispatches `updateCameraPose` via a **lodash `throttle`** (or hand-rolled, 100 ms). On app init, if Redux has a saved pose, applies it to the Three.js camera before the first render.

---

## Test Plan (TDD — write tests first)

### `src/logic/rayIntersection.test.ts`
- Two perpendicular rays that perfectly intersect → result ≈ known point, RMS = 0
- Three near-intersecting rays → result within tolerance
- Parallel rays (same direction) → returns `null`
- Single ray → returns `null`

### `src/logic/rmsError.test.ts`
- `perpDistance(point, ray)` — point on ray → 0, point offset → known value
- `rmsError(spheres, rays)` — perfect convergence → 0, controlled offset → expected value

### `src/state/sceneSlice.test.ts`
- `addRay` → appends to `currentRays`
- `computeIntersection` with ≥ 2 rays → spawns sphere, clears `currentRays`
- `computeIntersection` with < 2 rays → no-op
- `deleteSphere` → removes correct sphere by id
- `clearRays` → empties `currentRays`, leaves spheres unchanged
- Undo after `addRay` → reverts state
- Redo after undo → re-applies

---

## Build / Run

```bash
pnpm dev      # Vite dev server
pnpm build    # tsc + vite build
pnpm test     # vitest (with coverage)
```
