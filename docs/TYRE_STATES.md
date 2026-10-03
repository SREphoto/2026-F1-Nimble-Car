# Tyre compounds, wear states and weather

`cad/tyre_states.js` (initialised from `app.js` after the car, wheels, livery and Red Bull Ring are built)
adds Pirelli compounds, wear states and wet weather to the four tyres built by `cad/wheels_tyres.js`.
It only swaps materials / geometry on the tyre meshes inside each `Wheel_Spindle_*` group; group names,
hub centres, pivots and the spin axis are unchanged.

## Model

Each corner has two independent settings, plus one global weather flag:

| Axis | Values |
|---|---|
| **compound** | `soft` (red band, P ZERO, C4) · `medium` (yellow, C3) · `hard` (white, C2) · `inter` (green band, shallow-grooved CINTURATO intermediate tread) · `wet` (blue band, deep-grooved CINTURATO full-wet tread) |
| **wear** | `new` · `laps` · `medium` · `heavy` · `blown` |
| **weather** | `dry` · `wet` (water film + droplets on every tyre, wet track sheen, spray behind the car when moving) |

The three slicks differ only in the sidewall band colour and compound text. Any compound can have any wear
level, including `blown`, and any combination of corners can be blown at the same time.

The intermediate and full-wet grooves are **real geometry**: those treads use a finer lathe (768 segments
around × 84 across) displaced inward from the same groove mask that drives the colour/bump maps, so the
grooves show as cuts in the silhouette and in close-ups (3 mm intermediate, 5 mm full wet when new, shallower
as they wear). Built once per pattern / size / wear depth and shared by every tyre using it.

### Corners are physical

`FL`, `FR`, `RL`, `RR` are the corners as seen from the driver's seat. The CAD frame is x = back,
y = driver's **right**, z = up, so the legacy group names are mirrored: `Wheel_Spindle_Rear_Left` is the
physical rear **right** tyre. The names were kept as they are (other code depends on them).
`carModel.userData.wheels.corners[i]` has both `key` (physical) and `kinKey` (the name-based key that
`updateKinematics({ suspensionTravel })` uses).

### UI presets ("Tyre state" dropdown)

| State | What it sets | Look |
|---|---|---|
| Brand new | wear `new` | glossy smooth rubber, mould-release sheen (clear coat + sheen), vent nibs, crisp bright lettering |
| A few laps | wear `laps` | shine gone, uniformly matte, light scuffing and fine graining |
| Medium wear | wear `medium` (default) | graining across the tread, marbles, darker scrubbed outer shoulder, slightly dulled lettering |
| Heavy wear | wear `heavy` | deep graining + blisters, heavily worn outer shoulder (6 mm geometric chamfer), flatter crown, dirty sidewalls, faded and chipped lettering |
| Blown | with Corner = *All 4*: the physical **rear left** goes flat, the others become medium wear. With a single corner selected, that corner is **added** to the flats (pick several corners one after another for multiple flats); choosing another state for a corner repairs it | delaminated tread with torn rubber flaps, exposed carcass cords, deflated and flattened at the contact patch (rim flange ~28 mm off the ground), car lowered / tilted onto the flat tyre(s), flaps flutter with speed (toggle) |
| Rainy weather | weather `wet`, compound `wet` (an `inter` stays inter); new / heavy / blown tyres become "a few laps" | full wet tread, blue band, water film + droplets; wet track sheen and spray in Drive mode (toggle) |

The Corner selector (All 4 / Front L / Front R / Rear L / Rear R) chooses which tyre(s) the state and compound
apply to. Leaving Rainy for a dry state puts back the last slick fitted to each corner.

## API

```js
const T = window.tyreStates;
T.setTyreState('heavy');               // new | laps | medium | heavy | blown | rainy, corner defaults to 'all'
T.setTyreState('blown', 'FR');         // blow the front right instead of the rear left
T.setTyreCompound('FL', 'soft');       // corner: FL | FR | RL | RR | 'all' (or an array); compound: soft | medium | hard | inter | wet
window.setTyreCompound('all', 'inter');// same function, global alias
T.setTyreWear('RR', 'new');            // wear only
T.setBlown('RL');                     // blow a tyre (any combination: T.setBlown(['RL', 'FR']))
T.setBlown('RL', false);              // repair it (back to the wear it had before)
T.setBlownCorner('RL');               // legacy: makes RL the ONLY flat tyre
T.setWeather('wet');                   // or 'dry'
T.setOptions({ flap: true, spray: true, wetTrack: true });
T.get();                               // { corners: {FL: {compound, wear}, …}, weather, blown, options, grip }
window.addEventListener('tyrestatechange', (e) => console.log(e.detail));
```

URL parameters: `?tyre=<state>&compound=<compound>&blown=<corner[,corner…]>&weather=<dry|wet>`,
e.g. `?tyre=blown&blown=RR`, `?tyre=blown&blown=RL,FR` or `?compound=soft&tyre=new`.

### Ride height with flat tyres

Each flat corner wants its axle 92 mm lower. The chassis is treated as a rigid plane fitted (least squares)
to those target drops and then lowered so no corner rises above its static height; each wheel's suspension
travel (`updateKinematics({ suspensionTravel })`) takes up the remainder so every tyre still touches the ground.
One flat: the car rolls/pitches onto it with the diagonal corner unchanged. Two on one side or one axle: an exact
roll or pitch. Two diagonal flats: the car sits 46 mm lower and the suspension takes the twist. All four: the
whole car is 92 mm lower. `tyreStates.get().stance` returns the solved plane and travel.

## Drive mode

`state.tyreGrip` (compound × wear × weather, 0.48 … 1.03; a blown tyre caps it at 0.62) scales cornering grip
and braking in `cad/track/track_mode.js`; the autopilot slows down accordingly (× √grip).
The blown corner stays flat at the bottom while the wheel spins (vertex-shader deflation in the
non-spinning frame), the torn flaps flutter harder with speed (full amplitude from ~140 km/h), and with rain the circuit asphalt, kerbs and
lines turn dark and glossy while spray trails behind all four tyres. The sun's direct specular on wet
surfaces is clamped in the shader, so you get a wet sheen (soft env reflection) instead of a blown-out
streak. The classic finish-line set (tarmac, pit lane, finish line, grid boxes, kerbs) gets the same wet look.

Wireframe mode also applies to tyre materials swapped in after it was switched on.

## Performance

* Textures are painted once and cached: sidewall colour per (compound, wear level), sidewall height per
  wordmark (P ZERO / CINTURATO), tread per (pattern, wear), one droplet normal map, one damage overlay.
  The original medium artwork from `wheels_tyres.js` is reused, so the default state adds one texture.
* Materials are cached per (compound, wear, weather) and shared by every tyre in that state; only the blown
  corner has its own material instances (+ a shadow depth material).
* The worn (flat-crown) tyre geometry is built once per size the first time it's needed; grooved inter/wet
  treads (~129k triangles each) are built once per pattern / size / wear depth.
* Per frame: one matrix inverse per blown corner and, in the rain while moving, one 3000-point spray
  draw call updated on the CPU.
