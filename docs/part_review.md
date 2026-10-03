# 2026 F1 Nimble Car: part-by-part review

Branch `fix/part-review-engine-helmet`. Units are decimetres (dm, 1 dm = 100 mm). X runs from the nose to the tail, with the front axle at x 0 and the rear axle at x 34. Y is the car's left (+) and right (-) side, and Z points up from the ground.

The scene has about 5,400 separate 3D pieces ("meshes"). Many of them are small repeats, such as bolts, brake pins and gear teeth, so this review groups them by assembly and by repeated part, with counts. Every count and position here comes from a scene dump taken before the work (`review2/scene_before.json`) and one taken after it (`review2/scene_after.json`).

## Summary of findings

| Category | Found | Fixed | Left alone |
|---|---|---|---|
| Floating parts (touching nothing) | 14 | 13 | 1 (a gear part with a 1 cm gap, hidden inside the gearbox) |
| True duplicates (same part twice in the same place) | 16 ball joints, plus doubled nuts and pistons in the old engine | all | none |
| Parts poking through the bodywork | 6 groups (steering rack, pedal rails, engine banks, camshafts, small clutch/diff/wastegate bits, the old radiator block) | 5 | gearbox casing shows at the very rear, which is normal |
| Parts facing or lying the wrong way | 4 (nose camera pods, pitot mast, Camloc fastener heads, radio antenna) | 4 | none |
| Parts in the wrong material | 3 big ones (helmet in car paint, engine all in titanium colours, radiator in bright titanium) | 3 | none |
| Wrong design or shape | 8 (engine, helmet, nose join, rear wing, front wing, driveshafts, ride height in Drive mode, missing favicon) | 8 | the beam wing (see the note on the rules) |
| Shape updates from Samuel's round 3 references | 8 (halo, mirrors, airbox, rear wing, front wing, driver seating, rain light, tailpipe) | 8 | none |
| Wasted parts (built, then thrown away) | 5 old decal panels | 1 (the front endplate panel) | the other 4 are kept for now, they are cheap and the livery removes them (see below) |

After the fixes the scene has 4,783 meshes, down from 5,405. That is 622 fewer, mostly because the old engine had about 560 tiny repeated parts that nobody could see. The surface-contact test went from 14 floating meshes to 1, and the outside-visibility test no longer shows any engine, camshaft or steering rack part through the bodywork. The car is 1,884 mm wide (the limit is 1,900 mm), nothing sits below the ground, and all 29 livery decals still land with none skipped.

**The biggest issues were:**
1. **The engine.** It was a flat box with bare camshafts on top, a turbo floating above the gearbox, no air intake, no exhaust pipes and no coolers. Most of it was coloured like titanium, which is not what an engine block is made of.
2. **The helmet.** It used the car's matte camouflage paint, and it had loose carbon fins on top, a tear-off post sticking out, vent boxes poking through the shell and a chin piece hanging off it.
3. **Stray parts.** Four tiny fins floated above the halo, the side crash tubes floated off the tub wall, the radio antenna and the nose air-speed probe were lying on their sides in mid-air, and sixteen suspension ball joints were doubled.
4. **The steering rack.** Its tube stuck about 110 mm out of each side of the chassis.
5. **The rear wing.** It was too narrow and stood on two thin round posts.
6. **The cockpit area (round 3 references).** The halo was two thin poles, the mirrors were plain boxes on one stalk, and the airbox was a flat-fronted yellow box.

---

## 1. Survival cell (monocoque), 235 meshes before, 229 after

### 1.1 Carbon tub (`Body_Monocoque_CarbonTub`, 68 meshes)
- **What it is:** the carbon fibre shell the driver sits in. It is the backbone of the car.
- **Real job:** it protects the driver in a crash and carries the front suspension, the nose, the fuel tank and the engine.
- **Where it should sit:** from just behind the nose (x 0) to the engine (x 22). Its top edge runs around the cockpit opening.
- **Now:** x -0.8 to 22.2, z 0.6 to 5.8. It was 7.2 dm wide before and is 6.4 dm wide now. The old width came from the floating crash tubes, and the shell itself has not changed.
- **Material:** it should be carbon, painted on the outside. Now the upper skin gets the livery paint and the inside bulkheads stay bare carbon, which is correct.
- **Problems:**
  - The flat front wall ("bulkhead A-A") was a square box, so a square edge showed behind the nose.
  - The lower side crash tubes (the anti-intrusion tubes) floated 40 mm off the wall.
- **Fix:**
  - The front wall is now an oval that matches the tub, and the nose skin now runs back over the tub and blends in smoothly (see 9.2).
  - The crash tubes now sit on the tub wall.

### 1.2 Halo (`Body_Halo_Titanium_Assembly`, 23 meshes before, 5 after)
- **What it is:** the titanium hoop over the driver's head, with a moulded carbon cover.
- **Real job:** it stops wheels and debris from hitting the driver's head.
- **Where it should sit:** a front centre post on the tub top at about x 7.3, a wide wishbone hoop around the helmet, and two rear feet on the chassis shoulders behind the headrest.
- **Before:** two 30 mm round tubes and a thin front post, with separate box brackets and bolts at the back. From the front it read as thin poles. Four "micro-vane" fins floated inboard of the hoop and grabbed the AT&T decal.
- **Now:** one smooth moulded mesh (`Halo_Moulded_Shell`), built from `HALO_SPEC` in `cad/monocoque_cockpit.js` with the new reusable sweep builder `cad/sweep_section.js`:
  - a flattened oval section, about 100 mm wide and 50 mm tall, with a fuller front edge
  - the hoop is widest beside the helmet (y ±2.5) and narrows to the apex over the front post
  - the rear legs grow deeper as they drop and blend into the chassis shoulders at x 16.4 to 17.2
  - the front post widens into a broad foot on the tub top
  - x 6.9 to 17.2, y ±3.0, z 4.8 to 7.6
- **Clearance:** 89 mm from the helmet at the closest point, beside the driver's head.
- **Material:** gloss carbon cover (the livery switches it from the titanium placeholder), which is correct.
- **Decals:** TAG Heuer, 1Password, ORACLE and AT&T are projected straight onto the top of the hoop. The old flat decal quads on the halo were removed.

### 1.3 Roll hoop (3 meshes)
- **What it is:** the strong loop above and behind the driver's head, which also holds the air intake.
- **Real job:** it protects the driver if the car turns over.
- **Where it should sit:** x 16.6 to 17.7, z 5.8 to 9.4, inside the airbox, with a carbon blade on top that carries the FIA camera (see 9.4).
- **Now:** in that position, which is correct. The marshal status lights moved onto the new airbox crown at x 16.6.
- **Material:** carbon, which is correct.
- **Problems:** none.

### 1.4 Seat (`Body_Cockpit_BeadSeat_Assembly`, 7 meshes)
- **What it is:** a moulded seat with the belt mounts.
- **Where it sits now:** x 9.2 to 15.8, z 0.7 to about 3.9. It was lowered for Samuel's R9 reference so its back stays under the cockpit rim (z 4.2), and the shoulder belts now run over the shoulders under the rim too.
- **Material:** carbon with a padded cover, which is correct.
- **Problems:** none.

### 1.5 Steering wheel (`Pivot_Steering_Wheel_Assembly`, 121 meshes)
- **What it is:** the wheel and its screen, buttons, paddles and column. Most of the 121 pieces are buttons and knobs.
- **Real job:** the driver steers with it and controls the car from it.
- **Now:** x 5.9 to 10.2, z 2.9 to 5.2. It is 313 mm from the helmet, which is correct.
- **Material:** carbon body with black rubber grips and a dark screen, which is correct.
- **Problems:** none.

### 1.6 Pedal box (`Body_PedalSled_Assembly`, 11 meshes)
- **What it is:** the brake and throttle pedals on two sliding rails.
- **Where it should sit:** on the floor of the tub, near the front (x 1.3 to 3.7).
- **Problems:** the two rails sat at y ±1.2, where the tub floor curves up, so they stuck out under the car (about 990 visible pixels each). The float test also showed them below the floor.
- **Fix:**
  - raised the box by 11 mm
  - moved the rails inboard to y ±0.7
  - gave the rails names
- **Material:** aluminium rails and pedals, which is correct.

### 1.7 Fire extinguisher (2 meshes)
- **What it is:** the fire suppression bottle under the driver's legs.
- **Where it sits now:** x 5.2 to 6.9, z 0.9 to 1.6, which is correct.
- **Problems:** none.

## 2. Driver and cockpit accessories, 164 meshes before, 157 after

### 2.1 Helmet and driver (`Assembly_Driver_Helmet`, 28 meshes before, 21 after)
- **What it is:** the driver's crash helmet, plus the HANS neck restraint and the neck.
- **Real job:**
  - The helmet protects the head.
  - The HANS device is a carbon collar on the shoulders, tied to the helmet with two straps, so the head cannot whip forward in a crash.
- **Where it should sit:** inside the headrest, below the halo, clear of the steering wheel, with the visor at eye level.
- **Before:** x 11.7 to 14.8, centre at x 13.2. That was too far forward, and the head sat partly in front of the headrest.
- **Now (R9, "our driver looks super awkward"):** the driver sits much lower in the tub. The helmet centre moved from x 14.0, z 6.15 to x 13.75, z 5.05 (110 mm lower). Only the helmet shows above the cockpit sides, tucked between the padded headrest wings, with the visor just above the cockpit edge. The HANS collar and neck now sit under the cockpit rim, out of sight.
- **Clearances now** (closest points between the meshes):

  | To | Clearance |
  |---|---|
  | halo | about 137 mm |
  | headrest wings | about 24 mm |
  | tub | about 32 mm |
  | seat | the helmet's lower edge sits just above the lowered seat back |
  | steering wheel | about 380 mm |

- **Hands:** the gloves and forearms are fixed to the steering wheel, so they still hold it.

- **Material:** a helmet has its own gloss clear-coat paint, a dark tinted visor, black rubber trim and carbon parts.
  - **Before:** it wore the car's matte camouflage paint.
  - **Now:** it has its own gloss paint scheme (yellow crown, navy, red swoosh), a smoked iridium visor and black rubber trim.
- **Odd parts found and removed:**
  - loose carbon "chimney" fins on top that were not attached
  - a Zylon (anti-penetration) strip on one side only
  - square vent slots sticking out of the shell
  - a separate chin spoiler piece
  - a visor pivot with a tear-off post sticking out sideways, which was floating
- **Rebuilt as a real F1 helmet** (new file `cad/driver_helmet.js`, all measurements in `HELMET_SPEC`):
  - one smooth shell, wider at the back and lower at the chin
  - a wide visor with rounded corners and a rubber seal
  - a full-width Zylon strip above the visor
  - a small peak above the visor
  - flush visor pivots
  - two chin vents and a small rear spoiler
  - two HANS posts with their straps down to the carbon HANS collar
  - a fireproof balaclava at the neck

### 2.2 Headrest (`Cockpit_Headrest_Assembly`, 9 meshes before, 7 after)
- **What it is:** the padded cushion around the back and sides of the helmet.
- **Real job:** it stops the head from moving sideways.
- **Before:** a grey carbon block, x 12.8 to 16.6, z 4.1 to 5.3. It stood up above the cockpit around the driver's neck, and the helmet sat on top of it. That was the "grey block" in Samuel's R9 note.
- **Now (`HEADREST_SPEC`):** two rounded, padded wings either side of the helmet (lower at the front) and a lower pad behind it, all painted navy like the tub. It sits down in the cockpit opening, x 13.4 to 16.2, z 4.15 to 5.35, with quick-release pins on the wings.

### 2.3 Mirrors (35 meshes each before, 20 after)
- **What they are:** the two rear-view mirrors.
- **Real job:** they let the driver see behind. They also carry amber marshal lights.
- **Where they should sit:** just outboard of the cockpit and ahead of the halo's rear feet, on thin stalks from the sidepod and the tub top.
- **Before:** a narrow box on one L-shaped stalk at x 8.8 to 10.2, too far forward, with flat chrome glass.
- **Now:** built from `MIRROR_SPEC` in `cad/cockpit_accessories_driver.js`:
  - a rounded pod (150 mm wide, 66 mm tall) at x 15.1, y ±3.65, z 5.3, turned slightly toward the driver. Samuel's R11 top view moved it in, from y ±4.1 at x 14.0, so it sits just outboard of the cockpit, alongside the halo's side (its inner edge is just outside the halo) and a little ahead of the halo's rear legs.
  - the glass is recessed behind a thick carbon lip and is a real planar mirror (it reflects the car and the track live). Set `realReflection: false` for a cheaper chrome look.
  - an amber LED block on the outboard end of the front face (as in R3 and R4), plus a slim amber strip under the glass on the rear face
  - two thin curved aerofoil stalks from the sidepod top (z 3.8 here), tied together by a small flat vane
  - x 14.85 to 15.35, y ±2.9 to 4.4, z 3.7 to 5.65
- **Material:** painted pod, gloss carbon lip, stalks and vane, which is correct.

### 2.4 FIA camera on the air intake (28 meshes)
- **Now:** x 16.6 to 18.0, z 9.6 to 10.7. It now sits on the new roll-hoop blade above the airbox, which is correct.

### 2.5 Instruments on top of the chassis (29 meshes)
- **What they are:** the radio antenna, the GPS, the light panel and the fasteners on top of the tub.
- **Problems:**
  - The UHF radio blade antenna was lying flat and floating above the tub.
  - The Camloc quick-release fastener heads were lying on their sides. They were cylinders built along the wrong axis.
- **Fix:** stood the antenna up, renamed it `Antenna_UHF_Blade`, and turned the fastener heads the right way.

## 3. Brakes, 3,476 meshes (869 per corner)
- **What they are:** carbon discs, six-piston calipers, pads, cooling ducts, the brake-by-wire unit, plus hundreds of bolts and cooling holes.
- **Real job:** they slow the car. The discs run red hot.
- **Now:**

  | Brakes | Range |
  |---|---|
  | front | x -1.9 to 1.9 |
  | rear | x 32 to 36 |
  | all corners | z 1.7 to 5.8, inside the wheels |

- **Material:** carbon discs that glow under braking and aluminium calipers, which is correct.
- **Problems:** none found.
- **Note:** this is 64% of all meshes. For the game, this is the first place to merge small parts into one mesh per corner to save drawing time.

## 4. Electrical system, 176 meshes
- **High-voltage cables (orange, 20 meshes).**
  - **Problems:** before, they ran through the cylinder heads and ended at a turbo-side spot with no inverter, so they plugged into nothing.
  - **Fix:**
    - They now run from the battery, through the rear bulkhead and along the valley of the engine, to two new inverter boxes on top of the bellhousing.
    - The three motor cables now run behind the engine to a terminal box on the new MGU-K.
- **Low-voltage harness (58 meshes):**
  - **Engine looms:** they ran through the space where an intake plenum belongs. They now run in the engine valley and branch to each ignition coil, using the cylinder positions from `PU_SPEC`.
  - **Rear spine loom:** it ran inside where the exhaust downpipe now is. It is now beside the gearbox.
  - **Rear wing light cables:** they hung in the open air between the diffuser and the wing. They now run up inside each twin pylon, along the inside of the mainplane and into the endplates (the swan-neck route is kept for that setting).
  - **Engine computer (SECU) plugs:** three plugs floated inside the fuel tank, about 290 mm below the computer. They now sit on its sockets.
- **Battery (energy store, 83 meshes):** x 17.5 to 20.9, under the fuel tank, inside the tub. This is correct and has no problems.
- **Fuel cell (3 meshes):** x 16.9 to 21.6, behind the seat, which is correct.

## 5. Power unit, 766 meshes before, 204 after (rebuilt)

### 5.1 What a 2026 power unit is
- a 1.6 litre V6 petrol engine with one turbocharger
- an electric motor (the MGU-K) that drives the crankshaft, recovers braking energy and is worth about 350 kW
- a battery pack

The engine is bolted straight to the back of the tub and to the front of the gearbox, so it is part of the car's structure.

### 5.2 What was wrong
- **The block** was a flat box with bare camshafts on top. It was 4.4 dm wide, and its heads and cams showed through the engine cover (about 1,200 visible pixels).
- **The turbo** floated above the gearbox and connected to nothing.
- **Missing parts:** there was no intake plenum, no exhaust pipes, no airbox duct and no coolers. The only "radiator" was an unnamed bright titanium box inside each sidepod.
- **About 560 hidden repeats:**
  - bolts, valve springs and chain links
  - doubled nuts and pistons sitting in the same place
- **Materials:** almost everything was coloured titanium.
- **Animation:** the whole turbo and the whole MGU-K spun, housings and all.

### 5.3 What it is now
New `cad/powertrain_moving_internals.js`. Every position comes from `PU_SPEC` and `COOLING_SPEC`, so another engine or cooler layout is just new data.

| Part | Where (dm) | Material |
|---|---|---|
| Crankcase and sump | x 22.45 to 26.85, bottom z 0.68 | cast aluminium |
| Two cylinder banks at 90 degrees, 3 cylinders each, the right bank set back by 22 mm | crank at z 1.45, heads reach about y ±1.9, z 3.4 | cast aluminium barrels and heads |
| Cam covers, with six ignition coils | on top of each head | dark painted magnesium, black coils |
| Front cover, water pumps, dry-sump oil pumps | x 22.14 to 22.45, bolted to the tub's rear wall at x 22.12 | cast aluminium |
| Rear flange and bellhousing adapter | x 26.85 to 27.45, bolted to the clutch housing and gearbox | cast aluminium, steel studs |
| Crankshaft, 3 throws at 120 degrees (spins) | along x at z 1.45 | forged steel |
| Pistons and rods (move up and down with the crank) | inside the cylinders | forged aluminium pistons, titanium rods |
| Four camshafts (spin at half the crank speed) | inside the heads | steel |
| Carbon intake plenum with six runners and a throttle | in the V between the banks, z 3.2 to 4.05 | gloss carbon |
| Airbox duct from the roll-hoop intake to the turbo | x 17.5 to 27 | satin carbon |
| Exhaust: three pipes per bank joining into one collector per side | outside each bank, into the turbo | Inconel with a bronze heat tint |
| One turbocharger: compressor in front, turbine behind, wastegate on top, gold heat shield | x 26.9 to 28.4, z 3.9 to 5.1, centred | aluminium compressor housing, dark Inconel turbine housing |
| One downpipe to the single tailpipe | x 28.3 to 34.15 | Inconel |
| MGU-K motor with a gear case to the front of the engine | x 22.2 to 24.5, low on the right | aluminium housing with cooling ribs, copper windings |
| Two ERS inverter boxes | x 28.45 to 29.4, on the bellhousing | aluminium with fins |
| Two water radiators | x about 11, angled, in each sidepod | aluminium fin core and end tanks |
| Charge-air cooler (cools the air from the turbo) | x 22.3 to 24.6, left sidepod | aluminium |
| Oil cooler and ERS cooler | x about 15.4, right and left sidepods | aluminium |
| Water hoses, oil hose, charge-air pipes | between the coolers and the engine | black rubber, steel braid, aluminium |

**Fit checks:**
- The downpipe has 15 mm of room under the engine cover. The cover's back end was raised by up to 60 mm to make that room.
- The turbo has 13 mm of room to the engine cover.
- The block has 35 mm of room to the engine cover.
- From outside, only 215 pixels of power unit show (the inverter tops and the bellhousing low at the back), compared with 1,227 before.

**Animation:** only the turbo rotor and the MGU-K rotor spin now. The pistons and rods follow the crank angle.

**Left alone:**
- There is no oil tank between the fuel cell and the engine, because there is no room in this layout (the fuel cell ends at x 21.6 and the tub at x 22).
- The engine is a little narrower than a real one, about 380 mm across the heads instead of roughly 550 mm, because the existing engine cover and sidepods are that tight.

## 6. Gearbox and drivetrain, 163 meshes
- **Gearbox casing:** x 27.4 to 35.0, z 1.2 to 3.8. It is correct. A little of it shows at the very back, which is normal on a real car.
- **Clutch:** x 27.0 to 28.1. It is correct, and the new bellhousing adapter now covers it.
- **Differential (LSD):** x 33.1 to 34.9. It is correct.
- **Gear train:** one gear part at x 32.81 to 32.99 sits about 1 cm from the differential, so the float test lists it. It is sealed inside the gearbox and cannot be seen. Left alone and noted.
- **Driveshafts:** they were fixed at one angle, so when the wheel moved up and down the shaft stayed put and its outer end left the wheel. They now tilt with the wheel travel at each rear corner (`userData.driveshaft` plus `updateKinematics`).
- **Crash structure and rain light (`RIS_SPEC`, R10 and R6):**
  - **Before:** a short, stubby crash structure (x 34.9 to 37.4) with a round, flat yellow light.
  - **Now:** a long, slim crash structure. It is flat on top under the pylon feet, then tapers back to a small square tip at x 38.45, low and on the centre line (z 2.4 to 2.9).
  - **Rain light:** a square-ended box at the very tip. R10 shows the box shape and R6 shows a yellow safety frame, so it has both: a yellow frame, a glowing red lens and a 4 by 3 grid of LEDs, plus a faint red glow light. The 2026-style red LED strips on the rear endplates are unchanged.

## 7. Suspension and steering, 207 meshes before, 191 after
- **Wishbones, pushrods and pullrods:** carbon, in the right places.
  - **R11 ("look at thickness"):** every link, front and rear, is now a wide, flat carbon aerofoil blade instead of a thin rod. The wishbones are about 80 to 90 mm wide and 12 mm thick. The pull rods, push rods and track rods are about 50 mm wide, and they are now carbon instead of titanium. All sizes are in `SUSPENSION_SPEC`. The inner mounts are still fixed to the chassis, and the outer ends still follow the uprights.
- **Duplicates:** at 8 outer joints, both legs of a wishbone had each added their own ball joint, so 16 ball joints were doubled. Each joint is now added once (`sharedOuter` option).
- **Steering rack:**
  - **Problem:** its tube was 5.6 dm long (y ±2.8), so about 110 mm stuck out of each side of the tub.
  - **Fix:** it is now y ±1.6 (`RACK_HALF` = 1.45), inside the tub, and its links still reach the wheels.
- **Uprights and wheel spindles:** the `Wheel_Spindle_*` names are mirrored on purpose (`Rear_Left` is physically on the right). The names are kept.

## 8. Floor and diffuser, 122 meshes
- **Floor:** x 4.5 to 36.9, wide and flat, with tunnels underneath and the diffuser at the back. It is correct.
- **Floor edge fins:** five fins per side. The earlier pass flagged `Floor_Edge_Fin_5_L`, but it no longer shows as floating in the new contact test. It is unchanged.

## 9. Bodywork and wings, 96 meshes

### 9.1 Front wing (`FrontWing_Aerofoil_Assembly`)
- **Real job:** it makes downforce at the front and steers air around the front tyres. On a 2026 car the top two flaps tilt flatter on straights (X-mode) and steeper in corners (Z-mode).
- **Before:**
  - one thick mainplane and two simple flaps per side, built from straight extrusions
  - the flaps were navy-painted shapes that the livery had to find by size
- **Now:** a real layered wing, built by a reusable wing tool (`cad/aero_profiles.js`) from `FRONT_WING_SPEC`, reshaped to Samuel's round 3 outlines (R7 and R8):
  - **Three elements**, stacked from front to back: the mainplane is lowest and furthest forward and runs the full width, the middle element sits in the middle, and the top element sits furthest back. Each one sweeps back and changes chord from the nose out to the endplate, and the upper two climb toward the endplate.
  - **Centre section:** a plain mainplane under the nose, as the 2026 rules ask. The middle and top elements start at y ±1.15.
  - **Risers:** three thin vertical risers per side tie the top and middle elements together over the slot.
  - **Nose brackets (R8):** three short angled carbon brackets under the nose join the wing to the nose. One sits on the centre line under the nose tip, and one per side angles up and inward from the mainplane into each nose pillar. They are fixed parts, because the mainplane does not move.
  - **Endplate (R7 and R8):** two moulded shells per side.
    - A tall curved wall rises from the wing, curves inward toward the tyre, and flares back out at its top edge. It is lower at the front and full height at the back.
    - A separate scrolled foot curls out, over and down at the base. It kicks out like a fin, widest and tipped up at its front.
    - **R11 top view:** the endplate no longer sticks out far ahead. The wall now starts at x -9.75 (was -10.4) and the foot at x -9.9 (was -11.35). That is just ahead of the mainplane's tip leading edge, and about level with the nose tip.
    - The two references read differently at the top of the wall (R7 says it turns inward, R8 says it flares outward). The wall does both: it leans inward, then the top lip turns back out. The profile is the `endplate.wall` list in `FRONT_WING_SPEC`, so it is easy to change.
  - **Width:** the outer edge of the foot is the widest point, inside y ±9.5, so the car stays inside the 1,900 mm limit.
- **Movement:** the middle and top elements are the adjustable flaps. They pivot at the front of the middle element. Each flap group carries its own mode angles (`userData.modeAngles`), and the animation reads them. The risers move with the flaps.
- **Materials:** carbon mainplane, bare carbon flaps (flagged for the livery), carbon risers and brackets, and painted endplates.
- **Decals:** Red Bull lands on the mainplane, VISA on the top element and Mobil 1 on the endplate wall. The old flat Mobil 1 panel on the front endplate is no longer built, because the livery now places the decal on the wall itself.

### 9.2 Nose (`Nosecone_MainBody_Navy`)
- **Problems:**
  - A square step showed where the nose met the front of the tub.
  - The two camera pods stood upright.
  - The pitot (air speed) mast lay sideways.
- **Fix:**
  - The nose skin now matches the tub's oval shape and runs 120 mm back over it, then blends to the full nose shape over 180 mm.
  - The camera pods lie along the nose.
  - The pitot mast stands up.
- **Material:** painted carbon, which is correct.

### 9.3 Sidepods (14 meshes before, 12 after)
- **Real job:** they hold the radiators and guide air along the car.
- **Now:** x 8.5 to 29.6. The two unnamed bright titanium "radiator" boxes inside them were removed. The real coolers are now in the power unit cooling system (5.3).

### 9.4 Engine cover (12 meshes) and airbox (`Airbox_RollHoop_Intake`, 2 meshes before, 5 after)
- **Engine cover now:** x 15.6 to 34.6. Its rear end was raised slightly so the new single downpipe fits inside it.
- **Airbox, what it is:** the air intake above the driver's head that feeds the engine.
- **Airbox before:** a flat-fronted yellow box with a black panel painted on the front.
- **Airbox now:** rebuilt from `AIRBOX_SPEC` (refs R3 to R5):
  - a big rounded mouth with a thick rolled lip
  - a vertical carbon divider inside the mouth, and a dark duct behind it
  - a broad pillar behind the halo that blends down into the engine cover and tapers back along the spine
  - a carbon roll-hoop blade on top, carrying the FIA T-camera
  - x 15.85 to 20.4, y ±1.08, z 6.4 to 9.9 (the lower part is hidden inside the cover)
- **Material:** painted carbon (yellow livery), with a dark duct and carbon divider and blade, which is correct.

### 9.5 Rear wing (`Assembly_Active_Rear_Wing`, 36 meshes before, 48 after)
- **Real job:** it makes downforce at the back. Its top flap opens on straights in X-mode.
- **Before:**
  - only y ±4.9 wide (the mainplane was y ±4.5)
  - it stood on two thin round posts
  - the light cables hung in the air beside it
- **Now:** all from `REAR_WING_SPEC` (refs round 3, R6):
  - **Width:** the endplates reach y ±5.2 at the wing and the mainplane y ±4.8. There is 26 mm of room to the rear tyres. The car stays 1,884 mm wide (limit 1,900 mm).
  - **Pylons (Samuel's choice, the 2026 rules layout):** two slim carbon blades with a lens-shaped section, from the top of the crash structure up into the underside of the mainplane at y ±0.62. Their inner faces are 11 mm clear of the tailpipe on each side, and they are about 4.7 dm inboard of the tyres.
  - **Endplates:** full height at the wing, then they sweep down and inboard to land on the diffuser side walls at y ±4.1, z 2.2, ending at the diffuser's trailing edge.
  - **Lights:** a red LED strip (16 LEDs in a dark bar) runs down the upper trailing edge of each endplate.
  - **Flap:** 25% deeper chord for a bigger sponsor area seen from behind, and the ORACLE panel is taller to match.
  - **Actuator:** the flap actuator sits in a small fairing on top of the mainplane, between the pylons, with a push rod to the flap.
  - **Exhaust (`EXHAUST_SPEC`, R10):** the single round tailpipe sits above the crash structure, between the pylons. It now tilts up 3 degrees toward the back and pivots on the downpipe joint, so the two still meet. It is 355 mm long, ending at x 37.7, under the beam wing. It has a heat-tinted finish (straw gold, bronze, then purple and blue at the lip), a sooty inside and a blued lip.
  - **Rain light:** at the tip of the crash structure, below and behind the tailpipe (see 6).
  - **Shape changes from R10:**
    - The mainplane and flap now share a deep spoon: they are 50 mm lower at the centre than at the tips (`spoonDip`). Before, only the mainplane dipped, by 25 mm.
    - The endplates are thicker (27 mm), with a rounded top front corner and a leading edge that curls inward.
    - The mainplane tips now end inside the endplate walls.
    - One slim actuator pod sits on a thin mast that rises from the mainplane, through the slot, to just above the flap at the centre line.
    - The twin pylons were lengthened to meet the lower mainplane centre.
- **Setting:** `pylon.style` is now `'underslung_twin'`. The single swan neck from Samuel's first reference car is still there as `'swan_neck'`.
- **Beam wing:**
  - The 2026 rules remove the lower "beam wing" element (only a plain stay is allowed).
  - It is left in place because removing it changes the look of the car, and that was not asked for. It was moved 25 mm forward and its span now follows the swept endplates, so its tips end inside them.
  - It is flagged here for Samuel to decide.

### 9.6 Wasted decal panels (left alone)
Four old flat decal panels are still built and then removed straight away by the new livery at start-up (the fifth, the front endplate panel, was removed in the front wing rebuild):
- `EngineCover_LiveryDecal`
- `RearWing_LiveryDecal`
- `RearWing_InnerGradient`
- the rear wing Oracle panel

They cost very little, and removing them touches the livery code, so they are left for a later cleanup.

## 10. Other fixes
- **Drive / track mode:**
  - **Problem:** the suspension never moved while driving.
  - **Fix:** a new ride model (`cad/track/ride_model.js`, all numbers in `RIDE_SPEC`) turns acceleration, braking, cornering and speed into body pitch, roll and per-corner wheel travel, and passes that travel to the suspension.
  - **Test (autopilot lap):** the rear wheels moved up about 10 mm under acceleration, the uprights and driveshafts followed, and the left and right sides differed in corners.
- **Favicon:** added `favicon.svg`. The browser console now shows no errors and no 404s.

## 11. Image sheets
All the before and after sheets are in `/workspace/f1-audit/review2/`. The raw single views are in `before_raw/` and `after_raw/`. Round 3 added `sheet_08_halo.png`, `sheet_09_mirrors.png` and `sheet_10_airbox.png`, and updated `sheet_01_whole_car.png` and `sheet_06_rear_wing.png`.
