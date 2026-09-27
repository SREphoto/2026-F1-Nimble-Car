# 2026 Formula 1 Floor & Underbody Aerodynamics Regulatory Concordance

## Governing Regulations
* **FIA 2026 Formula 1 Technical Regulations — Article C3.5 (Floor, Underbody, and Diffuser)**:
  * **Floor Envelope Division**: Nine regulated sub-components: `Main Floor`, `Floor Board`, `Floor Body`, `Floor Foot`, `Floor Sidewall`, `Floor Leading Edge Device`, `Floor Fence`, `Floor Winglet`, `Floor Corner`.
  * **Maximum Floor Width**: Reduced by $150\text{ mm}$ to $1,450\text{ mm}$ ($Y \in [-725, +725\text{ mm}]$).
  * **"Dark Floor" Bottom Obscuration Rule**: Floor surface must completely obscure the underfloor body, internal engine cavity, and internal diffuser volume from direct view below ($Z < 0$).
  * **Underfloor Fences (Article C3.5.7)**: Maximum of 5 strakes per side within bounding volume $[X, Y, Z] = [450, 40, 200\text{ mm}]$. Maximum strake height $200\text{ mm}$; fillet radius to floor deck $\le 30\text{ mm}$.
  * **Skid Block & Plank (Article C3.6)**:
    * Material: Densified beechwood laminate (**Jabroc**) or resin-bonded glass laminate (**Permaglass**).
    * Nominal thickness: $10.0\text{ mm} \pm 0.2\text{ mm}$.
    * Minimum post-race thickness: $8.0\text{ mm}$ ($2.0\text{ mm}$ allowable wear limit, relaxed from $1.0\text{ mm}$ in 2022–2025).
    * Metal skid pucks: Grade 5 Titanium (Ti-6Al-4V) or 17-4PH stainless steel flush-mounted inserts.
    * Three $\varnothing 34\text{ mm}$ FIA inspection holes on vehicle centerline.
  * **Diffuser Architecture (Article C3.5.9)**:
    * Rearward-shifted kick-line ($X \approx X_R - 500\text{ to } -700\text{ mm}$).
    * Ramp expansion angle: $\theta_{\text{diff}} \approx 8^\circ\text{ to }12^\circ$ (down from $18^\circ\text{--}22^\circ$).
    * Diffuser exit width: maximum $1,000\text{ mm}$ between suspension upright envelopes.
    * Lower beam wing cascade: **Completely banned**.
  * **Static Deflection Requirements (Article C3.18)**:
    * Floor outer edge: $60\text{ N}$ point load $\implies \text{Deflection} \le 7.0\text{ mm}$.
    * Floor board $[695, \pm 720]$: $100\text{ N}$ point load $\implies \text{Deflection} \le 5.0\text{ mm}$.
    * Mid-plank vertical stiffness: $> 3.0\text{ kN/mm}$ under $6\text{ kN}$ load.
    * Rear-plank vertical stiffness: $> 6.0\text{ kN/mm}$ under $10\text{ kN}$ load.

## Anti-Porpoising Dynamics
* In 2026, the floor generates approximately **$40\%\text{--}45\%$ of total car downforce** (down from $60\%\text{--}65\%$).
* Linearized ground effect derivative $\frac{\partial C_L}{\partial h}$ eliminates the sudden choke stall threshold ($h_{\text{crit}} \approx 15\text{ mm}$ in 2022), enabling stable running at $30\text{--}40\text{ mm}$ front ride height without limit-cycle bouncing.
