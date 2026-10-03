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
level, including `blown`. Only one tyre can be blown at a time; blowing another corner turns the previous one
into `heavy`.

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
| Blown | one corner `blown` (default physical **rear left**; pick another in the Corner selector), the others medium wear | delaminated tread with torn rubber flaps, exposed carcass cords, deflated and flattened at the contact patch (rim flange ~28 mm off the ground), car tilted so it sits ~92 mm lower on that corner, flaps flutter with speed (toggle) |
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
T.setBlownCorner('RL');
T.setWeather('wet');                   // or 'dry'
T.setOptions({ flap: true, spray: true, wetTrack: true });
T.get();                               // { corners: {FL: {compound, wear}, …}, weather, blown, options, grip }
window.addEventListener('tyrestatechange', (e) => console.log(e.detail));
```

URL parameters: `?tyre=<state>&compound=<compound>&blown=<corner>&weather=<dry|wet>`,
e.g. `?tyre=blown&blown=RR` or `?compound=soft&tyre=new`.

## Drive mode

`state.tyreGrip` (compound × wear × weather, 0.48 … 1.03; a blown tyre caps it at 0.62) scales cornering grip
and braking in `cad/track/track_mode.js`; the autopilot slows down accordingly (× √grip).
The blown corner stays flat at the bottom while the wheel spins (vertex-shader deflation in the
non-spinning frame), the torn flaps flutter harder with speed (full amplitude from ~140 km/h), and with rain the circuit asphalt, kerbs and
lines turn dark and glossy while spray trails behind all four tyres.

## Performance

* Textures are painted once and cached: sidewall colour per (compound, wear level), sidewall height per
  wordmark (P ZERO / CINTURATO), tread per (pattern, wear), one droplet normal map, one damage overlay.
  The original medium artwork from `wheels_tyres.js` is reused, so the default state adds one texture.
* Materials are cached per (compound, wear, weather) and shared by every tyre in that state; only the blown
  corner has its own material instances (+ a shadow depth material).
* The worn (flat-crown) tyre geometry is built once per size the first time it's needed.
* Per frame: one matrix inverse for the blown corner and, in the rain while moving, one 3000-point spray
  draw call updated on the CPU.
