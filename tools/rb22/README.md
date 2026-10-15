# RB22 body pipeline

Source: "2026 Redbull RB22" by Dave (Tyler_Dave), https://sketchfab.com/3d-models/2026-redbull-rb22-0a3d24a58e0549d591a5a48c22eec383, CC BY 4.0.

1. `node split.mjs out_raw.glb` reads the original GLB, moves it to the CAD frame (dm, X nose-to-tail, Z up, axles on our Wheel_Spindle_* centres: X = (1.701 - y) * 10, Y = -x * 10, Z = -z * 10 + 0.38), drops the nose/front wing (cut cleanly at X = 2.0), rear wing, wheels, suspension and driver/steering wheel, and writes the body as named parts.
2. Compress: `gltf-transform dedup → prune → resize 2048 → webp 85 → meshopt medium` into `assets/models/rb22_body.glb`.
3. `assets/models/rb22_paint_plain.webp` is the paint map with the Red Bull art removed (black areas kept), tinted per team at runtime.
4. `app_shots.mjs` renders checks through Playwright (swiftshader).
