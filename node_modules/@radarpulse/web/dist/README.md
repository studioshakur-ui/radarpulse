# Rive assets

This folder is optional. If you add a hero animation, place it here:

- `radarpulse_hero.riv` (required name)

## Recommended spec (premium, "SpaceX-level")

### Canvas / aspect
- Artboard: **1600×1000** (16:10)
- Keep safe margins for the bottom caption strip (the app overlays a panel).

### Style
- No pure black; avoid #000000.
- Palette: pearl white, warm grays, and deep iris/violet accents.
- Use soft glass/refraction, very subtle grain, and controlled bloom.

### Motion (small but "wow")
- Slow parallax layers (2–4 depths) reacting to cursor (desktop) + gentle drift (mobile).
- Micro highlights: thin specular sweeps across glass (8–14s loop, randomized start).
- Flow lines: particles that move along curves (representing the pipeline).
- Avoid constant busy motion: keep motion purposeful and breathable.

### State machine
- State machine name: `State Machine 1` (as used by the app)
- Inputs (optional):
  - `scroll` (0..1) to modulate intensity.
  - `hover` (bool) for subtle response.

If you rename the state machine, update:
`apps/web/src/features/landing/cinematic/ChapterHeroArt.tsx`.
