# 2026 Formula 1 Unified Front End Dimensional Architecture

## Universal Reference Datum
* **Origin $[0,0,0]$:** Front Axle Centerline along vehicle centerline on the Reference Plane ($Z = 0$).
* **$X$-axis:** Longitudinal coordinate ($X < 0$ forwards to nose tip at $-1250\text{ mm}$, $X > 0$ rearwards to rear bulkhead at $+2200\text{ mm}$).
* **$Y$-axis:** Vertical coordinate ($Y = 0$ at ground skid block datum, $Y = 460\text{ mm}$ at bulkhead crown, $Y = 950\text{ mm}$ at roll hoop).
* **$Z$-axis:** Transverse coordinate ($Z = 0$ at vehicle centerline, $Z = \pm 700\text{ mm}$ at wheel centerlines, $Z = \pm 950\text{ mm}$ at wing endplate outer edges).

```
              UNIFIED 2026 F1 FRONT QUARTER TOP-DOWN DATUM
  
       [X = -1250 mm] Nose Tip & FIS Stage 1
             |
             v
       +---------------------------------------------+  [Z = +950 mm: LH Wing Endplate]
       |         Active Front Wing Mainplane         |
       +---------------------------------------------+
             |                               \
             v                                v
       [X = -850 to 0 mm] FIS Stage 2   [Z = +700 mm: LH Wheel Centerline]
             |                                |
             v                                v
       [X = 0 mm] BULKHEAD A-A <======== [Suspension Wishbones & Pull-Rod]
             |                                |
             v                                v
       [X = 0 to +2200 mm] SURVIVAL CELL  [Titanium Upright Carrier]
       - Titanium Halo [X = +650 to +1450 mm] |
       - Driver Bead Seat & Cockpit           v
       - Roll Hoop & Airbox [+1850 mm]    [345 mm Carbon Disc & Caliper]
```

## Integrated Mechanical Subsystems
1. **Survival Cell Monocoque:** Length $2,200\text{ mm}$, width $570\text{ mm}$ at Bulkhead A-A tapering to $730\text{ mm}$ at cockpit rim.
2. **Active Front Wing:** Span $1,900\text{ mm}$, chord footprint $775\text{ mm}$, active flap range $6.0^\circ\text{ to }24.0^\circ$.
3. **Front Suspension:** Upper wishbone span $520\text{ mm}$, lower wishbone span $540\text{ mm}$ with $14.2^\circ$ anti-dive rake, pull-rod angle $28.5^\circ$.
4. **Brake Corner:** $345\text{ mm} \times 34\text{ mm}$ carbon disc, 6-piston monobloc caliper, 18-inch BBS magnesium wheel.
