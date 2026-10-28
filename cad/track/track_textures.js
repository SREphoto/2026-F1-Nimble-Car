/**
 * track_textures.js — procedural canvas textures for the Red Bull Ring circuit build.
 * SREdesigns - Samuel R Erwin III
 * All textures are generated at runtime (no image downloads, no third-party logos).
 */
import * as THREE from 'three';

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvasTex(w, h, draw, { repeat = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

function speckle(ctx, w, h, n, colors, rMin, rMax, rand) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[(rand() * colors.length) | 0];
    const r = rMin + rand() * (rMax - rMin);
    ctx.fillRect(rand() * w, rand() * h, r, r);
  }
}

export function makeTrackTextures() {
  const rand = rng(1234);

  // 1. Photorealistic Alpine Meadow Grass & Infield Turf (1024x1024)
  const grass = canvasTex(1024, 1024, (ctx, w, h) => {
    // Rich Austrian alpine green base
    ctx.fillStyle = '#456f2d';
    ctx.fillRect(0, 0, w, h);

    // Multi-tone soil, moss and clover undertones
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '40,65,25' : '85,130,45'},${0.08 + rand() * 0.14})`;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 30 + rand() * 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dense grass blade speckle matrix (45,000 blade clumps)
    const bladeColors = [
      '#3b5e25', '#48762f', '#548738', '#5e963e', '#66a243',
      '#345421', '#416a2a', '#72af4d', '#2d471b', '#4f8034'
    ];
    speckle(ctx, w, h, 45000, bladeColors, 1.2, 3.2, rand);

    // Styrian alpine meadow wildflowers (tiny white clover & yellow buttercup flecks)
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = rand() < 0.65 ? 'rgba(255,255,245,0.7)' : 'rgba(255,225,50,0.75)';
      ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
    }
  }, { aniso: 16 });

  // Tangent-space Normal Map for Grass (512x512) for sunlit blade relief
  const grassNormal = canvasTex(512, 512, (ctx, w, h) => {
    const imgData = ctx.createImageData(w, h), pix = imgData.data;
    const rN = rng(55);
    for (let i = 0; i < w * h; i++) {
      const nx = (rN() - 0.5) * 0.45;
      const ny = (rN() - 0.5) * 0.45;
      const nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      const pIdx = i * 4;
      pix[pIdx] = Math.floor((nx / len * 0.5 + 0.5) * 255);
      pix[pIdx + 1] = Math.floor((ny / len * 0.5 + 0.5) * 255);
      pix[pIdx + 2] = Math.floor((nz / len * 0.5 + 0.5) * 255);
      pix[pIdx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }, { srgb: false, aniso: 8 });

  // Manicured F1 Mower Striped Turf (1024x1024) for infield lawn along the straight
  const mowerGrass = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#487532';
    ctx.fillRect(0, 0, w, h);
    // Alternating 128px mower stripe bands (light vs dark emerald)
    for (let y = 0; y < h; y += 128) {
      if ((y / 128) % 2 === 0) {
        ctx.fillStyle = 'rgba(110,175,70,0.18)';
        ctx.fillRect(0, y, w, 128);
      } else {
        ctx.fillStyle = 'rgba(25,50,15,0.18)';
        ctx.fillRect(0, y, w, 128);
      }
    }
    speckle(ctx, w, h, 28000, ['#3e652c', '#508137', '#5f9742', '#365925'], 1.2, 2.8, rand);
  }, { aniso: 16 });

  // 2. Authentic Raked FIA Gravel Trap with Combed Furrows (1024x1024)
  const gravel = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#b3a17e';
    ctx.fillRect(0, 0, w, h);

    // Wavy raked furrow lines (mechanically combed by circuit maintenance tractors)
    const furrowStep = 32;
    for (let y = 0; y < h; y += furrowStep) {
      // Dark shadow trough
      ctx.fillStyle = 'rgba(115,95,65,0.45)';
      ctx.beginPath();
      ctx.moveTo(0, y + 10);
      for (let x = 0; x <= w; x += 32) {
        ctx.lineTo(x, y + 10 + Math.sin((x / 64) * Math.PI) * 4);
      }
      ctx.lineTo(w, y + 18);
      ctx.lineTo(0, y + 18);
      ctx.fill();

      // Light crest highlight
      ctx.fillStyle = 'rgba(235,220,185,0.35)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) {
        ctx.lineTo(x, y + Math.sin((x / 64) * Math.PI) * 4);
      }
      ctx.lineTo(w, y + 5);
      ctx.lineTo(0, y + 5);
      ctx.fill();
    }

    // Dense pea-gravel matrix (35,000 pebbles)
    const pebbleColors = [
      '#998765', '#bead8d', '#867657', '#cfc09f',
      '#a89774', '#746447', '#ddd0b2', '#8c7d5f'
    ];
    speckle(ctx, w, h, 35000, pebbleColors, 1.4, 3.8, rand);
  }, { aniso: 16 });

  // 3. Asphalt Runoff with Fine Aggregates and Rubber Dust (512x512)
  const runoff = canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4c5056';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '15,16,18' : '180,185,190'},${0.01 + rand() * 0.02})`;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, 20 + rand() * 50, 0, Math.PI * 2);
      ctx.fill();
    }
    speckle(ctx, w, h, 18000, ['#3d4046', '#595d64', '#45484e', '#656a72', '#2f3136'], 1, 2.2, rand);
    // Skidded rubber dust streaks
    ctx.fillStyle = 'rgba(20,20,22,0.12)';
    for (let i = 0; i < 20; i++) {
      ctx.fillRect(rand() * w, 0, 8 + rand() * 15, h);
    }
  }, { aniso: 16 });

  // Kerb: Red and White blocks with bevel shading
  const kerb = canvasTex(128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d4202c'; ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, h / 2, w, h / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, 10, h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(10, 0, 6, h);
  });

  // Chequered finish strip: 2 rows across
  const chequer = canvasTex(256, 64, (ctx, w, h) => {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#141416' : '#f5f5f5';
      ctx.fillRect(i * 16, j * 16, 16, 16);
    }
  });

  // Catch fence: diamond wire mesh with alpha
  const fence = canvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(190,195,200,0.95)'; ctx.lineWidth = 2.5;
    const m = 4;
    ctx.beginPath();
    for (let k = -m; k <= 2 * m; k++) {
      const o = (k * w) / m;
      ctx.moveTo(o, 0); ctx.lineTo(o + w, h);
      ctx.moveTo(o, 0); ctx.lineTo(o - w, h);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(165,170,175,1)';
    ctx.fillRect(0, 0, w, 4); // top tension cable
    ctx.fillRect(0, h / 2 - 1, w, 2); // middle cable
  });

  // Tyres: Tyre barrier conveyor belt wrap
  const tyres = canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#141518'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < 4; x++) for (let y = 0; y < 2; y++) {
      const cx = 32 + x * 64, cy = 32 + y * 64;
      ctx.fillStyle = '#26282c'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0a0c'; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(215,25,35,0.7)'; ctx.fillRect(0, 0, w / 2, 10);
    ctx.fillStyle = 'rgba(245,245,245,0.7)'; ctx.fillRect(w / 2, 0, w / 2, 10);
  });

  // 4. Vibrant High-Density Spectator Crowd (1024x256)
  const crowd = canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#424852'; // concrete tier underlay
    ctx.fillRect(0, 0, w, h);

    // Dedicated fan apparel blocks:
    // Sections of Dutch Orange Army (famous Austrian GP fixture!), Red Bull Navy/Red, Ferrari Scarlet, Mercedes Teal, McLaren Papaya
    const fanPalettes = [
      ['#ff5900', '#ff7700', '#ff8c00', '#ffffff', '#e85000'], // Orange Army block
      ['#0c1938', '#d4202c', '#ffffff', '#f4c400', '#142248'], // Red Bull Racing block
      ['#df111d', '#ffffff', '#f8d000', '#181818', '#b50d18'], // Ferrari block
      ['#00a19c', '#222222', '#ffffff', '#silver', '#007b77'], // Mercedes block
      ['#ff8000', '#111111', '#0090ff', '#ffffff', '#e07000'], // McLaren block
      ['#00594f', '#ffffff', '#d6ff00', '#222222', '#00473f'], // Aston Martin block
    ];

    const skinTones = ['#f5d0b0', '#e0b088', '#c49265', '#8d5524', '#fbe0c8'];

    // Draw 8 tiered rows of spectators
    const rows = 8;
    const rowH = h / rows;
    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const yBase = rIdx * rowH;
      // Step riser shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, yBase, w, 3);

      for (let x = 0; x < w; x += 5) {
        if (rand() < 0.88) {
          // Determine team block across the grandstand width
          const blockIdx = Math.floor((x / w) * fanPalettes.length);
          const palette = fanPalettes[blockIdx];
          const shirtCol = palette[(rand() * palette.length) | 0];
          const skinCol = skinTones[(rand() * skinTones.length) | 0];

          const pW = 3.5 + rand() * 1.5;
          const pH = rowH * 0.65;
          const pY = yBase + rowH * 0.28;

          // Torso / Shirt
          ctx.fillStyle = shirtCol;
          ctx.fillRect(x, pY, pW, pH);

          // Head & Hair / Cap
          ctx.fillStyle = skinCol;
          ctx.fillRect(x + 0.5, pY - 5, pW - 1, 4.5);

          // 70% wearing team caps / hats
          if (rand() < 0.7) {
            ctx.fillStyle = rand() < 0.5 ? shirtCol : '#ffffff';
            ctx.fillRect(x, pY - 7, pW, 2.5);
            ctx.fillRect(x + (rand() < 0.5 ? 1 : -1), pY - 5, pW + 1, 1.2); // brim
          }

          // Arms raised cheering / waving flags (every few spectators)
          if (rand() < 0.18) {
            ctx.fillStyle = skinCol;
            ctx.fillRect(x - 1, pY - 6, 1.5, 6);
            ctx.fillRect(x + pW - 0.5, pY - 6, 1.5, 6);
            // Miniature fan flag waving
            if (rand() < 0.4) {
              ctx.fillStyle = shirtCol;
              ctx.fillRect(x + pW + 1, pY - 10, 4, 3);
            }
          }
        }
      }
    }
  }, { aniso: 16 });

  // 5. Individual Bucket Stadium Seats (512x128) in Austrian GP Colors with Yellow Aisles
  const seats = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a505b'; // concrete riser
    ctx.fillRect(0, 0, w, h);

    const seatCols = ['#c8102e', '#0c1938', '#d0d4dc']; // Austrian red, Red Bull navy, VIP silver
    const rows = 4;
    const rowH = h / rows;

    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const y = rIdx * rowH;
      for (let x = 0; x < w; x += 10) {
        // Yellow safety stairway aisles every 128px
        if (x % 128 < 16) {
          ctx.fillStyle = '#f8d000';
          ctx.fillRect(x, y + 2, 10, rowH - 4);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x, y + 2, 10, 2); // step tread shadow
        } else {
          // Individual bucket seat shell
          const col = seatCols[Math.floor(x / 40) % seatCols.length];
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(x + 1, y + 4, 7.5, rowH - 7, 2) : ctx.fillRect(x + 1, y + 4, 7.5, rowH - 7);
          ctx.fill();

          // Seat backrest highlight
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.fillRect(x + 2, y + 5, 5.5, 3);
          // Seat shadow
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + 1, y + rowH - 3, 7.5, 2);
        }
      }
    }
  }, { aniso: 16 });

  // 6. Modern Architectural Garage Facade & Overhead Doors (1024x256)
  const garage = canvasTex(1024, 256, (ctx, w, h) => {
    ctx.fillStyle = '#d5d9df'; // architectural concrete fascia
    ctx.fillRect(0, 0, w, h);

    const bayW = 256;
    for (let i = 0; i < 4; i++) {
      const bx = i * bayW;

      // Heavy industrial structural portal frame
      ctx.fillStyle = '#1c2026';
      ctx.fillRect(bx + 8, 40, bayW - 16, h - 40);

      // Sectional motorized roll-up doors (open / half-open positions)
      const openHeight = [180, 80, 210, 140][i];
      const doorY = 50 + (h - 50 - openHeight);

      // Interior garage glow when door is open
      const interiorGrad = ctx.createLinearGradient(0, doorY, 0, h);
      interiorGrad.addColorStop(0, '#151922');
      interiorGrad.addColorStop(0.5, '#222834');
      interiorGrad.addColorStop(1, '#181c24');
      ctx.fillStyle = interiorGrad;
      ctx.fillRect(bx + 16, doorY, bayW - 32, openHeight);

      // Overhead door corrugated horizontal panels
      if (doorY > 52) {
        ctx.fillStyle = '#424852';
        ctx.fillRect(bx + 16, 50, bayW - 32, doorY - 50);
        for (let py = 50; py < doorY; py += 12) {
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(bx + 16, py, bayW - 32, 2);
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillRect(bx + 16, py + 2, bayW - 32, 1);
        }
      }

      // Overhead LED lighted signage banner
      ctx.fillStyle = '#0f141d';
      ctx.fillRect(bx + 12, 10, bayW - 24, 24);
      ctx.fillStyle = '#00d4e8';
      ctx.fillRect(bx + 12, 32, bayW - 24, 2); // cyan accent bar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`PIT GARAGE ${i + 1}`, bx + bayW / 2, 26);
    }
  }, { repeat: true, aniso: 16 });

  // 7. Paddock Club Hospitality Glass Curtin-Wall (512x128)
  const glass = canvasTex(512, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5a82a6');
    g.addColorStop(0.5, '#274461');
    g.addColorStop(1, '#172738');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Warm VIP lounge interior lights visible behind glass
    for (let x = 16; x < w; x += 64) {
      const lg = ctx.createRadialGradient(x + 20, 40, 5, x + 20, 40, 35);
      lg.addColorStop(0, 'rgba(255,240,200,0.55)');
      lg.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x, 10, 45, 60);
    }

    // Architectural aluminum mullions & transom bars
    ctx.fillStyle = '#d0d7de';
    for (let x = 0; x < w; x += 32) {
      ctx.fillRect(x, 0, 3, h);
    }
    ctx.fillRect(0, h / 2 - 2, w, 4);
    ctx.fillRect(0, h - 5, w, 5);
  }, { repeat: true, aniso: 16 });

  // 8. Trackside Giant LED Jumbotron Broadcast Screen (1024x512)
  const jumbotron = canvasTex(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#0a0d14'; // carbon bezel
    ctx.fillRect(0, 0, w, h);

    // Header bar: Formula 1 Austrian Grand Prix - Spielberg
    ctx.fillStyle = '#e10600';
    ctx.fillRect(16, 16, w - 32, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FORMULA 1 GROSSER PREIS VON ÖSTERREICH 2026', 36, 52);

    // Live timing leaderboard
    ctx.fillStyle = '#141a24';
    ctx.fillRect(16, 80, 420, h - 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('POS   DRIVER             GAP      INT     TYRE', 28, 108);

    const drivers = [
      { pos: '1', name: 'VERSTAPPEN', team: 'RED BULL', gap: 'LEADER', tyr: 'SOFT' },
      { pos: '2', name: 'NORRIS', team: 'McLAREN', gap: '+1.428', tyr: 'MEDIUM' },
      { pos: '3', name: 'LECLERC', team: 'FERRARI', gap: '+3.105', tyr: 'MEDIUM' },
      { pos: '4', name: 'HAMILTON', team: 'FERRARI', gap: '+4.890', tyr: 'HARD' },
      { pos: '5', name: 'PIASTRI', team: 'McLAREN', gap: '+6.211', tyr: 'MEDIUM' },
      { pos: '6', name: 'RUSSELL', team: 'MERCEDES', gap: '+8.450', tyr: 'HARD' },
      { pos: '7', name: 'ANTONELLI', team: 'MERCEDES', gap: '+11.20', tyr: 'MEDIUM' },
      { pos: '8', name: 'ALONSO', team: 'ASTON MARTIN', gap: '+14.77', tyr: 'MEDIUM' },
    ];

    drivers.forEach((d, idx) => {
      const y = 142 + idx * 42;
      ctx.fillStyle = idx % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.2)';
      ctx.fillRect(20, y - 24, 412, 38);
      ctx.fillStyle = idx === 0 ? '#ff8000' : '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`${d.pos}    ${d.name.padEnd(14)} ${d.gap.padStart(7)}  ${d.tyr}`, 28, y);
    });

    // Right panel: 3D circuit minimap & telemetry graphic
    ctx.fillStyle = '#10141d';
    ctx.fillRect(450, 80, w - 466, h - 96);
    ctx.strokeStyle = '#e10600';
    ctx.lineWidth = 4;
    ctx.strokeRect(450, 80, w - 466, h - 96);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SPIELBERG · 4.318 KM · 10 TURNS', 475, 120);

    // Live speed trap & lap time display
    ctx.fillStyle = '#f8d000';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('SPEED TRAP: 326.4 KM/H', 475, 200);
    ctx.fillStyle = '#00d4e8';
    ctx.fillText('FASTEST LAP: 1:04.288', 475, 260);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '22px sans-serif';
    ctx.fillText('WEATHER: DRY · AIR 24°C · TRACK 41°C', 475, 340);
    ctx.fillText('WIND: 3.2 M/S NW · HUMIDITY 48%', 475, 380);

    // SREdesigns Nimble Car badge
    ctx.fillStyle = '#00d4e8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('SREdesigns 2026 NIMBLE CAR ACTIVE SIMULATION', 475, 450);
  }, { aniso: 16 });

  // 9. Fluttering Trackside Flags Texture Atlas (512x256)
  const flags = canvasTex(512, 256, (ctx, w, h) => {
    // 4 Flag cells:
    // Cell 0: Austrian Flag (Rot-Weiß-Rot)
    ctx.fillStyle = '#c8102e'; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 42, 256, 44);

    // Cell 1: Dutch Flag (Rood-Wit-Blauw for Verstappen fans)
    ctx.fillStyle = '#ae1c28'; ctx.fillRect(256, 0, 256, 128);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(256, 42, 256, 44);
    ctx.fillStyle = '#21468b'; ctx.fillRect(256, 86, 256, 42);

    // Cell 2: Red Bull Racing Flag
    ctx.fillStyle = '#0c1938'; ctx.fillRect(0, 128, 256, 128);
    ctx.fillStyle = '#e10600'; ctx.fillRect(0, 185, 256, 14);
    ctx.fillStyle = '#f8d000'; ctx.beginPath(); ctx.arc(128, 180, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GIVES YOU WINGS', 128, 235);

    // Cell 3: Chequered Flag
    for (let x = 0; x < 8; x++) for (let y = 0; y < 4; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#111111';
      ctx.fillRect(256 + x * 32, 128 + y * 32, 32, 32);
    }
  }, { aniso: 8 });

  return {
    asphalt: runoff, // fallback
    runoff,
    gravel,
    grass,
    grassNormal,
    mowerGrass,
    kerb,
    chequer,
    fence,
    tyres,
    crowd,
    seats,
    garage,
    glass,
    jumbotron,
    flags
  };
}

/**
 * Sign atlas: every trackside board shares ONE texture so all signs merge into one draw call.
 * Only plain text — the circuit name, place names, turn numbers and marshal/pit info. No third-party logos.
 */
export const SIGN_CELLS = [
  { key: 'RBR', text: 'RED BULL RING', bg: '#0b1630', fg: '#ffffff', sub: 'SPIELBERG' },
  { key: 'SPIELBERG', text: 'SPIELBERG', bg: '#ffffff', fg: '#0b1630', sub: 'STEIERMARK · AUSTRIA' },
  { key: 'STYRIA', text: 'STEIERMARK', bg: '#1f6b34', fg: '#ffffff', sub: 'AUSTRIA' },
  { key: 'SF', text: 'START · FINISH', bg: '#111111', fg: '#ffffff', sub: 'RED BULL RING' },
  { key: 'PITIN', text: 'PIT IN', bg: '#f4f4f4', fg: '#111111', sub: '80 KM/H' },
  { key: 'PITOUT', text: 'PIT EXIT', bg: '#f4f4f4', fg: '#111111', sub: 'BLEND LINE' },
  { key: 'PIT80', text: '80', bg: '#ffffff', fg: '#111111', ring: true },
  { key: 'B100', text: '100', bg: '#ffffff', fg: '#111111' },
  { key: 'B200', text: '200', bg: '#ffffff', fg: '#111111' },
  { key: 'B300', text: '300', bg: '#ffffff', fg: '#111111' },
  { key: 'B50', text: '50', bg: '#ffffff', fg: '#111111' },
  { key: 'SRE', text: 'SREdesigns', bg: '#0c1626', fg: '#00d4e8', sub: '2026 NIMBLE CAR' },
  { key: 'GRANDPRIX', text: 'GRAND PRIX', bg: '#c8102e', fg: '#ffffff', sub: 'SPIELBERG 2026' },
  { key: 'DRSDET', text: 'DRS', bg: '#111111', fg: '#ffffff', sub: 'DETECTION' },
  { key: 'DRSACT', text: 'DRS', bg: '#ffffff', fg: '#111111', sub: 'ACTIVATION' },
  { key: 'S1', text: 'SECTOR 1', bg: '#f2c200', fg: '#111111' },
  { key: 'S2', text: 'SECTOR 2', bg: '#f2c200', fg: '#111111' },
  { key: 'TRAP', text: 'SPEED TRAP', bg: '#f2c200', fg: '#111111' },
];
// corner names from the FIA circuit map (2025)
const TURN_NAME = { 1: 'NIKI LAUDA', 3: 'REMUS', 4: 'RAUCH', 9: 'JOCHEN RINDT' };
for (let i = 1; i <= 10; i++) SIGN_CELLS.push({ key: 'T' + i, text: String(i), bg: '#0b1630', fg: '#ffffff', sub: TURN_NAME[i] || 'TURN', turn: true });

/** extraCells: more cells from circuit style data, e.g. sponsor billboards { key, text, bg, fg, accent } */
export function makeSignAtlas(extraCells = []) {
  const CELLS = [...SIGN_CELLS, ...extraCells];
  const cw = 512, ch = 128, cols = 4;
  const rows = Math.ceil(CELLS.length / cols);
  const c = document.createElement('canvas');
  c.width = cw * cols; c.height = ch * rows;
  const ctx = c.getContext('2d');
  const uv = {};
  CELLS.forEach((cell, idx) => {
    const x = (idx % cols) * cw, y = Math.floor(idx / cols) * ch;
    ctx.fillStyle = cell.bg; ctx.fillRect(x, y, cw, ch);
    const dist = /^B\d+$/.test(cell.key);
    ctx.strokeStyle = dist ? '#111111' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = dist ? 10 : 6; ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
    if (cell.accent) { ctx.fillStyle = cell.accent; ctx.fillRect(x, y + ch - 16, cw, 16); }
    ctx.fillStyle = cell.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (cell.ring) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, cw, ch);
      ctx.strokeStyle = '#d0021b'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.arc(x + cw / 2, y + ch / 2, 50, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = 'bold 54px sans-serif'; ctx.fillText(cell.text, x + cw / 2, y + ch / 2 + 2);
    } else if (cell.turn) {
      ctx.font = `bold ${cell.sub.length > 8 ? 26 : 30}px sans-serif`; ctx.fillText(cell.sub, x + 150, y + ch / 2 + 2, 270);
      ctx.font = 'bold 96px sans-serif'; ctx.fillText(cell.text, x + 340, y + ch / 2 + 6);
    } else if (cell.sub) {
      ctx.font = 'bold 56px sans-serif'; ctx.fillText(cell.text, x + cw / 2, y + 50);
      ctx.font = 'bold 26px sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(cell.sub, x + cw / 2, y + 100); ctx.globalAlpha = 1;
    } else {
      ctx.font = `bold ${cell.text.length > 6 ? 64 : 100}px "Helvetica Neue", Arial, sans-serif`; ctx.fillText(cell.text, x + cw / 2, y + ch / 2 + 6, cw - 40);
    }
    uv[cell.key] = [x / c.width, 1 - (y + ch) / c.height, (x + cw) / c.width, 1 - y / c.height];
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, uv };
}
