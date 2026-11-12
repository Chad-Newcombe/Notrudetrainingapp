# Simple Kinetic Coach Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four chibi human coach assets with simple mature nonhuman kinetic forms and align each coach's application palette, materials, camera, and motion with its identity.

**Architecture:** Keep the existing `<model-viewer>` delivery path, but replace the asset contract and coach visual metadata. Build and approve River as a gated pilot before producing Jax, Sol, and Nova; every source asset is cleaned in Blender, audited before commit, and paired with a compact static fallback. Palette work and automated asset auditing can ship before any paid 3D service is approved.

**Tech Stack:** React 19, TypeScript, CSS custom properties, `<model-viewer>` 4.4, GLB/glTF 2.0, Blender source/export, optional Tripo P2/H3.1 pilot, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-coach-identity-sessions-and-models-design.md`

## Global Constraints

- The approved reference is `design/coaches/concepts/simple-kinetic-totems.png`.
- Every coach uses roughly three or four large continuous volumes, one restrained light element, minimal seams, and clean satin materials.
- No coach may have human anatomy, a face, eyes, mouth, hair, skin, clothing, a helmet, chibi proportions, toy styling, or decorative mechanical clutter.
- Silhouettes must remain distinct without color and legible at phone size.
- Each final model targets 15k–35k rendered triangles, one or two materials, 1024px textures by default, and a compressed GLB under 1.5 MB with preference under 1 MB.
- Every GLB exposes named `Idle`, `Listen`, and `Reply` clips.
- Every coach has a transparent WebP fallback under 100 KB.
- Reduced motion disables autoplay and decorative orbital/tension motion.
- The app retains a fully usable no-WebGL/error fallback.
- No paid service, account, API key, concept upload, or credit purchase occurs until the user explicitly approves the one-coach pilot budget.

## Review Focus

- **Slow mobile GPU or no WebGL 2:** controls and coach identity remain usable through the static fallback. Covered in Task 5.
- **GLB loads but is malformed or oversized:** automated audit rejects it before integration. Covered in Task 2.
- **Missing animation clip or reduced-motion preference:** the viewer selects a safe still pose and never loops decorative motion. Covered in Tasks 2 and 5.
- **Light/dark palette plus model material contrast:** coach remains readable without sacrificing text/focus contrast. Covered in Tasks 1 and 5.
- **Binary source and license provenance:** every model records generator/tool, input references, cleanup source, and commercial-use status. Covered in Tasks 3–4.

---

### Task 1: Mature coach palettes and visual metadata

**Files:**
- Create: `lib/coaches/visuals.ts`
- Create: `lib/theme/contrast.ts`
- Modify: `lib/coaches/presets.ts`
- Modify: `app/globals.css`
- Modify: `components/coach/CoachModelPreview.tsx`
- Create: `tests/lib/coach-visuals.test.ts`
- Create: `tests/lib/theme-contrast.test.ts`

**Interfaces:**
- Produces: `CoachVisualPreset` with `modelSrc`, `fallbackSrc`, `cameraOrbit`, `fieldOfView`, `environmentIntensity`, and clip names.
- Produces: `COACH_VISUALS: Record<CoachId, CoachVisualPreset>`.
- Produces: `contrastRatio(foreground: string, background: string): number`.
- Consumes: existing coach IDs and theme datasets.

- [ ] **Step 1: Write failing visual-metadata tests**

Assert all four coach IDs have distinct model/fallback paths, distinct camera framing, exact clip names `Idle`, `Listen`, `Reply`, and no human/chibi naming in alt copy.

- [ ] **Step 2: Write failing contrast tests**

For every light/dark coach palette, assert body text/background ratio is at least 4.5, muted text/background is at least 4.5, accent/on-accent is at least 4.5, and focus/background is at least 3.0.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `npm test -- --run tests/lib/coach-visuals.test.ts tests/lib/theme-contrast.test.ts`

Expected: FAIL because visual metadata and contrast helpers do not exist.

- [ ] **Step 4: Add coach visual metadata and contrast helper**

Use identity-specific camera values but keep the same public asset filenames. The helper parses six-digit hex colors and implements WCAG relative luminance.

- [ ] **Step 5: Replace pastel tokens with material-derived palettes**

Use eucalyptus/mineral/graphite for River, ochre/bone/graphite for Jax, oxide/copper/charcoal for Sol, and indigo/ultraviolet/cool mineral for Nova. Choose final hex values that satisfy Step 2 rather than preserving a hue that fails contrast.

- [ ] **Step 6: Consume visual metadata in `CoachModelPreview`**

Remove hard-coded paths, orbit, FOV, and animation strings. Preserve the current `replying` interface by mapping it to `Reply` and use `Idle` otherwise; preserve the reduced-motion still state. Task 5 adds the active-composer `Listen` state after the final assets contain that clip.

- [ ] **Step 7: Run focused, theme, and build checks**

Run: `npm test -- --run tests/lib/coach-visuals.test.ts tests/lib/theme-contrast.test.ts tests/lib/theme.test.ts tests/components/coach-stage.test.ts && npm run lint && npx tsc --noEmit && npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/coaches/visuals.ts lib/theme/contrast.ts lib/coaches/presets.ts app/globals.css components/coach/CoachModelPreview.tsx tests/lib/coach-visuals.test.ts tests/lib/theme-contrast.test.ts
git commit -m "Align coach palettes and visual metadata"
```

---

### Task 2: GLB asset audit and source-of-truth documentation

**Files:**
- Create: `lib/coaches/model-audit.ts`
- Create: `scripts/audit-coach-models.mjs`
- Create: `design/coaches/README.md`
- Create: `tests/lib/coach-model-audit.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `parseGlb(bytes: Uint8Array): ParsedGlbSummary`.
- Produces: `auditCoachModel(summary: ParsedGlbSummary, byteLength: number): ModelAuditResult`.
- Produces: npm script `audit:coaches` that checks all four production GLBs and WebP byte sizes.

- [ ] **Step 1: Write a failing GLB parser/audit test**

Use minimal in-memory GLB fixtures. Assert rejection for invalid header/version/declared length, more than 35k triangles, more than two materials, missing `Idle`/`Listen`/`Reply`, and files above 1.5 MB. Assert a valid fixture reports triangle, material, animation, node, and byte counts.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --run tests/lib/coach-model-audit.test.ts`

Expected: FAIL because the parser and audit do not exist.

- [ ] **Step 3: Implement the dependency-free GLB parser and audit**

Read the GLB header and JSON chunk only. Calculate rendered triangles from mesh primitive modes and accessor counts; count unique material indices and animation names. Return all failures, not only the first.

- [ ] **Step 4: Add CLI and npm script**

The CLI reads `public/coaches/{river,jax,sol,nova}.glb` and corresponding WebPs, prints a compact table, and exits nonzero on any failure.

- [ ] **Step 5: Document the asset contract and provenance template**

Record required source files, concept inputs, tool/service and version, generation settings, commercial-use confirmation, cleanup date, material count, texture size, triangle count, clip names, and export settings.

- [ ] **Step 6: Run focused tests and audit the current assets**

Run: `npm test -- --run tests/lib/coach-model-audit.test.ts && npm run audit:coaches`

Expected: unit tests PASS; current assets may FAIL the new `Listen`/provenance contract, establishing the replacement gate.

- [ ] **Step 7: Commit**

```bash
git add lib/coaches/model-audit.ts scripts/audit-coach-models.mjs design/coaches/README.md tests/lib/coach-model-audit.test.ts package.json
git commit -m "Add coach model quality gate"
```

---

### Task 3: River one-coach model pilot

**Gate:** Do not begin external generation, uploads, account creation, installation, or paid work until the user explicitly approves the pilot method and budget.

**Files:**
- Create: `design/coaches/concepts/river-front.png`
- Create: `design/coaches/concepts/river-side.png`
- Create: `design/coaches/concepts/river-back.png`
- Create: `design/coaches/concepts/river-three-quarter.png`
- Create: `design/coaches/source/river.blend`
- Replace: `public/coaches/river.glb`
- Replace: `public/coaches/river.webp`
- Modify: `design/coaches/README.md`

**Interfaces:**
- Consumes: approved lineup, asset contract, and audit CLI.
- Produces: approved River production source, GLB, fallback, provenance, and performance measurements that gate the remaining three models.

- [ ] **Step 1: Confirm the pilot method and budget at the gate**

Preferred method: Tripo P2 multiview native-quad base mesh followed by Blender cleanup. Accept a fully local/manual Blender path if the user chooses it. Record the decision in `design/coaches/README.md` before uploading or purchasing anything.

- [ ] **Step 2: Produce consistent River turnarounds**

Front, side, back, and three-quarter views must preserve three or four broad volumes, one light seam, the same proportions, and a neutral pose/background. Reject any view that introduces a face, clothing, tiny parts, or asymmetry inconsistent with the lineup.

- [ ] **Step 3: Generate or model the base mesh**

For Tripo P2, request quad topology and a face limit appropriate to a final 15k–35k triangle GLB. Treat service output as an intermediate asset only.

- [ ] **Step 4: Finish River in Blender**

Remove internal/hidden geometry, repair intersections and normals, establish scale/origin, create one or two satin PBR materials, and rig only the volumes needed for the three clips.

- [ ] **Step 5: Animate and export**

Create slow compression/light-breathing `Idle`, attentive settling `Listen`, and one restrained response gesture `Reply`. Export GLB with named clips and render a transparent WebP fallback.

- [ ] **Step 6: Run automated audit**

Run: `npm run audit:coaches -- river`

Expected: River passes all size, geometry, material, and animation checks.

- [ ] **Step 7: Inspect River in the live app**

At 320px, 390px, and 430px verify light/dark material readability, silhouette, camera crop, drag interaction, reduced motion, load state, fallback, and no UI obstruction.

- [ ] **Step 8: Obtain explicit River visual approval**

Do not produce the other coaches until River's simplicity, material quality, scale, and motion are approved. If rejected, revise River and repeat Steps 6–8.

- [ ] **Step 9: Commit the approved pilot**

```bash
git add design/coaches/concepts/river-*.png design/coaches/source/river.blend design/coaches/README.md public/coaches/river.glb public/coaches/river.webp
git commit -m "Replace River with simple kinetic model"
```

---

### Task 4: Jax, Sol, and Nova production models

**Files:**
- Create: `design/coaches/concepts/{jax,sol,nova}-{front,side,back,three-quarter}.png`
- Create: `design/coaches/source/{jax,sol,nova}.blend`
- Replace: `public/coaches/{jax,sol,nova}.glb`
- Replace: `public/coaches/{jax,sol,nova}.webp`
- Replace: `design/coaches/build_models.py`
- Modify: `design/coaches/README.md`

**Interfaces:**
- Consumes: approved River pilot standards and audit contract.
- Produces: complete approved four-coach asset family and a non-chibi export helper.

- [ ] **Step 1: Produce and review all three turnaround sets**

Preserve the approved simple volumes: Jax broad tension bands and one ring; Sol three or four monolithic planes and one seam; Nova clean shells, one core, one orbit.

- [ ] **Step 2: Generate/model and clean Jax**

Use the approved pilot method. Create stored-energy `Idle`, ready `Listen`, and quick tension-release `Reply`. Run `npm run audit:coaches -- jax` and inspect in app.

- [ ] **Step 3: Generate/model and clean Sol**

Use the approved pilot method. Create nearly still `Idle`, exact orientation `Listen`, and one decisive pivot `Reply`. Run `npm run audit:coaches -- sol` and inspect in app.

- [ ] **Step 4: Generate/model and clean Nova**

Use the approved pilot method. Create slow core/orbit `Idle`, controlled alignment `Listen`, and one exploratory shell/orbit movement `Reply`. Run `npm run audit:coaches -- nova` and inspect in app.

- [ ] **Step 5: Retire the chibi procedural builder**

Replace `build_models.py` with an export/validation helper that operates on the committed Blender sources; it must not recreate faces, bodies, clothing, or the removed UV-sphere character system.

- [ ] **Step 6: Run the family audit and visual lineup check**

Run: `npm run audit:coaches`

Expected: all four pass. Also render a neutral lineup and verify that silhouettes remain identifiable in grayscale and at 96px height.

- [ ] **Step 7: Commit**

```bash
git add design/coaches public/coaches
git commit -m "Replace remaining coach models"
```

---

### Task 5: Viewer integration and cross-device verification

**Files:**
- Modify: `components/coach/CoachModelPreview.tsx`
- Modify: `components/coach/CoachAvatar.tsx`
- Modify: `components/coach/CoachStage.tsx`
- Modify: `app/globals.css`
- Modify: `tests/components/coach-stage.test.ts`
- Create: `tests/components/coach-model-motion.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: final models, fallbacks, and `COACH_VISUALS`.
- Produces: production viewer behavior for `Idle`, `Listen`, `Reply`, reduced motion, and fallback.

- [ ] **Step 1: Extend viewer tests**

Assert identity-specific source/camera values, `Listen` while composing, `Reply` while streaming, `Idle` otherwise, no autoplay under reduced motion, and accessible fallback after load/WebGL failure.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --run tests/components/coach-stage.test.ts tests/components/coach-model-motion.test.ts`

Expected: FAIL until the final motion state and visual metadata are integrated.

- [ ] **Step 3: Integrate final model states and loading behavior**

Preload only the selected coach. Never load all four production GLBs on Coach. Keep controls available while loading and after failure.

- [ ] **Step 4: Tune stage lighting and camera per coach**

Use one restrained studio environment if it improves all four materials. Do not add an HDR dependency if it materially delays first render or washes out coach colors.

- [ ] **Step 5: Run the complete automated gate**

Run: `npm run audit:coaches && npm test && npm run lint && npx tsc --noEmit && npm run build && git diff --check`

Expected: all assets pass, 0 test/lint/type failures, successful build, and clean diff check.

- [ ] **Step 6: Verify all routes and themes at mobile widths**

At 320px, 390px, and 430px inspect Coach landing, active chat, coach picker, More, quiz selection, and workout coach note for all four coaches in light/dark/system modes. Verify no crop, overflow, illegible fallback, or palette/model mismatch.

- [ ] **Step 7: Profile load behavior**

Record GLB bytes, first model paint on the local preview, and interaction readiness. Confirm changing coaches loads only the newly selected GLB and releases the old presentation without console errors.

- [ ] **Step 8: Update README and request fresh whole-branch review**

Document asset provenance, audit command, optional external service, source locations, and export workflow. Address all Critical/Important findings, then rerun Step 5.

- [ ] **Step 9: Commit verification fixes and docs**

```bash
git add components/coach app/globals.css tests README.md
git commit -m "Integrate simple kinetic coach models"
```

