# 2026 Formula 1 Powertrain & Energy Store Regulatory Concordance

## Governing Regulations
* **FIA 2026 Formula 1 Technical Regulations — Section PU (Power Unit Framework)**:
  * **Article C5.1 (Engine Architecture & Dimensions)**:
    * 1.6-liter ($1,600\text{ cm}^3$) 90° V6 four-stroke turbocharged engine.
    * Bore fixed at $\varnothing 80.0\text{ mm} \pm 0.05\text{ mm}$; stroke $53.05\text{ mm}$.
    * Crankshaft centerline datum: $Y = 0.0\text{ mm}$, $Z = 90.0\text{ mm} \pm 0.5\text{ mm}$ above the reference plane.
    * Minimum Power Unit dry mass: raised to $185.0\text{ kg}$.
  * **Article C5.4.1 (Fuel Energy Flow Rate Constraint)**:
    * Replaces mass flow limit ($100\text{ kg/h}$) with chemical energy flow rate limit:
      $$EF(N) = \begin{cases} 0.27 \times N + 165.0\text{ [MJ/h]}, & N < 10,500\text{ rpm} \\ 3,000.0\text{ [MJ/h]} \ (833.33\text{ kW}), & N \ge 10,500\text{ rpm} \end{cases}$$
    * Fuel must be 100% advanced sustainable (e-fuel synthesized from $CO_2/H_2$ or non-food 2nd-gen biofuel) with $\ge 65\%$ GHG lifecycle reduction.
  * **Article C5.4.3 (Compression Ratio Ceiling)**:
    * Maximum compression ratio reduced from $18.0:1$ to $16.0:1$, verified at ambient $20^\circ\text{C}$ and $130^\circ\text{C}$ hot soak ($\Delta h \le 0.08\text{ mm}$).
  * **Article C5.7.3 (Induction System)**:
    * Variable intake trumpets banned; fixed-geometry runners only.
  * **Article C5.8 (Exhaust & Turbocharger)**:
    * MGU-H abolished; single turbocharger with maximum rotational inertia $I_{\text{rot}} \le 2.45 \times 10^{-4}\text{ kg}\cdot\text{m}^2$.
    * Twin electronic poppet wastegates with $<15\text{ ms}$ response.
    * Single circular tailpipe exit $\varnothing 100.0\text{--}130.0\text{ mm}$ with $0^\circ\text{--}2.5^\circ$ upward inclination.
  * **Article C5.2 (350 kW MGU-K & Inverter)**:
    * Maximum mechanical shaft output: $350\text{ kW}$ ($\approx 469\text{ hp}$), up from $120\text{ kW}$.
    * Shaft speed capped at $60,000\text{ rpm}$; peak torque $420\text{--}480\text{ Nm}$.
    * Dual 3-phase Silicon Carbide (SiC) MOSFET inverters ($25\text{--}40\text{ kHz}$).
  * **Article C5.3 (High-Voltage Energy Store / Battery)**:
    * 4.0 MJ usable delta per lap; kinetic recovery ceiling raised to $8.5\text{ MJ/lap}$ standard / $9.0\text{ MJ/lap}$ Overtake Mode.
    * Operational voltage: $800\text{ V to } 900\text{ V DC}$ bus ($230\text{S}$).
    * Continuous discharge current up to $440\text{ A}$, regeneration spikes $\ge 500\text{ A}$.
    * Minimum battery pack mass: $35.0\text{ kg}$.
    * Dielectric immersion cooling (synthetic PAO-2 / esters) maintaining $45^\circ\text{C}\text{ to }55^\circ\text{C}$ ($\Delta T \le 1.8^\circ\text{C}$).
    * Safety: Solid-state pyrofuse isolation in $<10\text{ ms}$; capacitor bleed-down $<60\text{V}$ in $<2.0\text{ s}$.
