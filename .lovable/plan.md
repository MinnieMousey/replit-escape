# Migration Plan: Replit AIS Duty Simulator → TanStack Start

## Goal
Remove all Replit-specific infrastructure and port the AIS Duty Simulator frontend into the existing Lovable TanStack Start template. Preserve every page, component, game, and interaction exactly as they work today. The Express backend is a stub (one health route), so it will be ported to a TanStack server route.

## What stays and what goes

### Kept (the actual app)
- `artifacts/ais-shift/src/` — the entire frontend SPA (pages, components, context, hooks, lib, types, games, glossary, HUD, report)
- 4 referenced images from `attached_assets/` (map charts, CAD logo, FIR chart)

### Discarded (Replit scaffolding with no real data)
- `artifacts/api-server/` — stub Express backend (only `/healthz`)
- `artifacts/mockup-sandbox/` — Replit workspace component preview server
- `lib/db/` — empty Drizzle schema, no tables defined
- `lib/api-zod/`, `lib/api-client-react/`, `lib/api-spec/` — empty API scaffolding
- `pnpm-workspace.yaml`, `.replit`, `.replitignore`, `.npmrc`, `replit.md`, `scripts/`
- All `@replit/*` Vite plugins

## Detailed steps

### 1. Clean Replit artifacts
- Delete `.replit`, `.replitignore`, `.npmrc`, `replit.md`
- Delete `pnpm-workspace.yaml`
- Delete `scripts/` directory
- Remove `.replit-artifact/` dirs from any copied artifacts

### 2. Add missing runtime dependencies
```
bun add leaflet react-leaflet next-themes
bun add -D @types/leaflet @tailwindcss/typography
bun add @radix-ui/react-toast
```
- `leaflet` + `react-leaflet` — map components in the glossary
- `next-themes` — used by the existing `sonner.tsx` toast component
- `@radix-ui/react-toast` — used by the existing `toast.tsx` / `toaster.tsx` components
- `@tailwindcss/typography` — referenced in CSS via `@plugin`

### 3. Copy frontend source into the project
Copy everything under `artifacts/ais-shift/src/` into `src/` of the Lovable project, except:
- `main.tsx` — TanStack Start handles entry/bootstrap differently
- `index.css` — theme will be merged into `src/styles.css`

### 4. Port theme and global CSS
The Replit app uses HSL CSS variables with a custom light-blue sky theme. The Lovable template uses oklch. All ~70+ Replit components reference `hsl(var(--background))`, so the HSL theme must be preserved.

- Merge the Replit `index.css` into `src/styles.css`, keeping the `@import "tailwindcss"` and `@source` directives from the Lovable template
- Add `@plugin "@tailwindcss/typography"`
- Keep the custom fonts (`Inter`, `Share Tech Mono`) via `<link>` in `src/routes/__root.tsx` head (do not use CSS `@import` for Google Fonts in Tailwind v4)
- The Replit app sets `body { background: transparent }` because a `SkyBackground` component renders the sky; preserve this
- Keep the `.dark` block from the Lovable template (dark mode still works since the Replit theme only defines `:root`)

### 5. Copy assets
- Copy the 4 referenced images from `attached_assets/` into `public/assets/`
- Update all `@assets/...` imports in the source to `/assets/...` (Vite public folder convention)

### 6. Port routing (wouter → TanStack Router file-based)
The Replit app uses `wouter` with these routes:

| Path        | Page component |
|-------------|----------------|
| `/`         | Login          |
| `/select`   | ShiftSelect    |
| `/handover` | Handover       |
| `/shift`    | Shift          |
| `/practice` | Practice       |
| `/report`   | Report         |

Create TanStack route files:
- `src/routes/index.tsx` → `Login` (replace placeholder)
- `src/routes/select.tsx` → `ShiftSelect`
- `src/routes/handover.tsx` → `Handover`
- `src/routes/shift.tsx` → `Shift`
- `src/routes/practice.tsx` → `Practice`
- `src/routes/report.tsx` → `Report`
- `src/routes/__root.tsx` → wrap with `ShiftProvider`, `ThemeProvider`, `TooltipProvider`, `Toaster`

Remove `WouterRouter` and `Switch`/`Route` imports — navigation is handled by TanStack Router's `<Outlet />` in the root layout.

### 7. Add missing UI components
The Lovable template already has most shadcn/ui components. The Replit app adds these extras not present in the template:
- `button-group.tsx`, `empty.tsx`, `field.tsx`, `input-group.tsx`, `item.tsx`, `kbd.tsx`, `spinner.tsx`
- `toast.tsx`, `toaster.tsx` (radix-based, distinct from sonner)
- `use-toast.ts` hook

Copy these into `src/components/ui/` and `src/hooks/`.

### 8. Port the Express health check
Create `src/routes/api/healthz.ts` as a TanStack server route:
```ts
export const Route = createFileRoute("/api/healthz")({
  server: {
    handlers: {
      GET: async () => Response.json({ status: "ok" }),
    },
  },
});
```

### 9. Update root metadata
Update `src/routes/__root.tsx` head metadata from "Lovable App" / "Your App" to "AIS Duty Simulator" with an appropriate description.

### 10. Verify build
- Run `bun run build` and fix any TypeScript or import errors
- Test the app in preview to confirm all pages load, the shift simulator runs, games work, and the glossary map renders

## Technical details

- **State management**: The app uses a single React Context (`ShiftContext`) with `localStorage` persistence for the file store. No database or backend state is involved — this is entirely client-side and will work unchanged.
- **No API client needed**: The frontend never calls the backend. All task generation, scoring, and file-store logic runs in the browser. The only backend is the health check.
- **Path alias**: The Replit app uses `@/` pointing to `src/`. The Lovable template already has this alias configured in `vite.config.ts`.
- **Unused deps that will NOT be installed**: `wouter`, `framer-motion`, `react-icons`, `date-fns` (indirectly via `react-day-picker` which Lovable already has). These are either replaced by TanStack Router or not actually imported in the source.
- **TypeScript references**: The Replit `tsconfig.json` references `../../lib/api-client-react`. This reference will be removed since the lib packages are discarded.
