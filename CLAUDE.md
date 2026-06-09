# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Vite dev server (HMR)
pnpm build    # tsc + vite build (type-checks first, then bundles)
pnpm preview  # serve the dist/ build locally
pnpm test     # vitest
```

To run a single test file: `pnpm vitest run src/path/to/file.test.ts`

## Architecture

Vanilla TypeScript + Vite with no framework. Entry point is `src/main.ts`, which mounts directly into `#app` in `index.html` via DOM manipulation. Static assets live in `src/assets/` (imported by JS, bundled by Vite) and `public/` (copied as-is, referenced by `/` paths in HTML).

TypeScript is configured in bundler mode (`moduleResolution: bundler`, `noEmit: true`) — the compiler only type-checks; Vite handles transpilation and bundling. Strict unused-variable checking is on (`noUnusedLocals`, `noUnusedParameters`).
