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

  // 10. Photorealistic Austrian Norway Spruce Needle Foliage (512x512 with Organic Alpha Cutout)
  const pineFoliage = canvasTex(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = rng(777);

    // Main central woody stem & branching secondary twigs
    ctx.strokeStyle = '#3e2a17';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2, h);
    ctx.bezierCurveTo(w / 2 - 10, h * 0.65, w / 2 + 10, h * 0.35, w / 2, 20);
    ctx.stroke();

    // Secondary side twigs
    ctx.lineWidth = 6;
    for (let side of [-1, 1]) {
      for (let y = h * 0.85; y > 60; y -= 45) {
        ctx.beginPath();
        ctx.moveTo(w / 2, y);
        const targetX = w / 2 + side * (70 + (y / h) * 110 + r() * 40);
        const targetY = y - 35 - r() * 25;
        ctx.quadraticCurveTo(w / 2 + side * 40, y - 10, targetX, targetY);
        ctx.stroke();
      }
    }

    // High-density individual needle clusters (16,000 layered pine needles)
    const needleColors = [
      '#132b17', '#1a3a20', '#224d2b', '#2b5f36',
      '#357342', '#418a4f', '#18331d', '#285532'
    ];
    for (let i = 0; i < 16000; i++) {
      const t = r();
      const stemY = 40 + t * (h - 60);
      const spread = (1 - t * 0.65) * 190;
      const side = r() < 0.5 ? -1 : 1;
      const nx = w / 2 + side * (r() * spread);
      const ny = stemY + (r() - 0.5) * 45;

      const angle = (side > 0 ? 0.35 : -0.35) * Math.PI + (r() - 0.5) * 0.45;
      const len = 14 + r() * 18;

      ctx.strokeStyle = needleColors[(r() * needleColors.length) | 0];
      ctx.lineWidth = 1.4 + r() * 1.2;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + Math.cos(angle) * len, ny - Math.sin(Math.abs(angle)) * len);
      ctx.stroke();
    }

    // Sunlit fresh needle tips (bright lime flecks on outer periphery)
    ctx.strokeStyle = '#5bb862';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 1800; i++) {
      const t = r();
      const stemY = 40 + t * (h - 70);
      const spread = (1 - t * 0.65) * 195;
      const side = r() < 0.5 ? -1 : 1;
      const nx = w / 2 + side * (spread * (0.8 + r() * 0.25));
      const ny = stemY + (r() - 0.5) * 30;
      ctx.beginPath();
      ctx.moveTo(nx, ny);
      ctx.lineTo(nx + side * (6 + r() * 10), ny - 4 - r() * 8);
      ctx.stroke();
    }

    // Small Austrian pine cones hanging along lower boughs
    for (let c = 0; c < 6; c++) {
      const cx = w / 2 + (c % 2 === 0 ? 1 : -1) * (50 + r() * 70);
      const cy = h * 0.4 + r() * (h * 0.4);
      ctx.fillStyle = '#4a2c14';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 7, 13, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6b4322';
      for (let s = -8; s <= 8; s += 4) {
        ctx.fillRect(cx - 5, cy + s, 10, 2);
      }
    }
  }, { aniso: 16 });

  // 11. Photorealistic European Beech Foliage (512x512 with Organic Leaf Clump Cutout)
  const deciduousFoliage = canvasTex(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = rng(888);

    // Natural multi-fork woody branches
    ctx.strokeStyle = '#483c32';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w / 2, h);
    ctx.quadraticCurveTo(w / 2 - 20, h * 0.6, w * 0.35, h * 0.3);
    ctx.moveTo(w / 2, h * 0.7);
    ctx.quadraticCurveTo(w / 2 + 15, h * 0.5, w * 0.7, h * 0.25);
    ctx.moveTo(w / 2, h * 0.5);
    ctx.quadraticCurveTo(w / 2, h * 0.3, w / 2, 40);
    ctx.stroke();

    // Overlapping organic deciduous leaves (1,200 individual serrated leaves)
    const leafShades = [
      '#2d501c', '#396523', '#467d2d', '#549537',
      '#64ad42', '#72c24c', '#355c20', '#4a822f'
    ];
    for (let i = 0; i < 1400; i++) {
      const cx = 50 + r() * (w - 100);
      const cy = 30 + r() * (h - 70);
      const radX = 14 + r() * 18;
      const radY = 22 + r() * 26;
      const rot = (r() - 0.5) * Math.PI * 1.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      // Leaf body
      ctx.fillStyle = leafShades[(r() * leafShades.length) | 0];
      ctx.beginPath();
      ctx.ellipse(0, 0, radX, radY, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf center vein
      ctx.strokeStyle = 'rgba(160,220,120,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -radY * 0.9);
      ctx.lineTo(0, radY * 0.9);
      ctx.stroke();

      ctx.restore();
    }
  }, { aniso: 16 });

  // 12. Rough Furrowed Tree Bark (256x512)
  const treeBark = canvasTex(256, 512, (ctx, w, h) => {
    // Rich forest trunk base
    ctx.fillStyle = '#3c2e22';
    ctx.fillRect(0, 0, w, h);
    const r = rng(333);

    // Vertical furrowed dark fissures
    for (let x = 0; x < w; x += 12) {
      ctx.strokeStyle = '#1a130d';
      ctx.lineWidth = 3 + r() * 4;
      ctx.beginPath();
      ctx.moveTo(x + r() * 6, 0);
      for (let y = 0; y <= h; y += 40) {
        ctx.lineTo(x + (r() - 0.5) * 16, y);
      }
      ctx.stroke();
    }

    // Raised bark ridges with lichen and moss patches
    for (let i = 0; i < 4000; i++) {
      const c = r();
      ctx.fillStyle = c < 0.4 ? '#544234' : (c < 0.75 ? '#6a5442' : (c < 0.9 ? '#4a5b32' : '#2d2218'));
      ctx.fillRect(r() * w, r() * h, 2 + r() * 4, 8 + r() * 18);
    }
  }, { aniso: 16 });

  // 13. Soft Volumetric Celebratory Smoke Puff Texture (256x256)
  const smoke = canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = rng(444);

    // Multi-octave overlapping turbulent lobes with Gaussian radial falloff
    const lobes = [
      { x: 128, y: 128, rad: 110, op: 0.8 },
      { x: 110, y: 110, rad: 85, op: 0.65 },
      { x: 145, y: 115, rad: 80, op: 0.6 },
      { x: 115, y: 145, rad: 85, op: 0.65 },
      { x: 145, y: 145, rad: 75, op: 0.55 },
      { x: 128, y: 95, rad: 70, op: 0.5 },
      { x: 128, y: 160, rad: 70, op: 0.5 },
      { x: 95, y: 128, rad: 70, op: 0.5 },
      { x: 160, y: 128, rad: 70, op: 0.5 },
    ];

    for (const lb of lobes) {
      const g = ctx.createRadialGradient(lb.x, lb.y, 4, lb.x, lb.y, lb.rad);
      g.addColorStop(0, `rgba(255,255,255,${lb.op})`);
      g.addColorStop(0.35, `rgba(255,255,255,${lb.op * 0.7})`);
      g.addColorStop(0.7, `rgba(255,255,255,${lb.op * 0.25})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(lb.x, lb.y, lb.rad, 0, Math.PI * 2);
      ctx.fill();
    }
  }, { repeat: false, aniso: 8 });

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
    flags,
    pineFoliage,
    deciduousFoliage,
    treeBark,
    smoke
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
const TURN_NAME = {
  1: 'NIKI LAUDA', 2: 'TURN 2', 3: 'REMUS', 4: 'RAUCH',
  5: 'TURN 5', 6: 'TURN 6', 7: 'WÜRTH', 8: 'TURN 8',
  9: 'JOCHEN RINDT', 10: 'RED BULL MOBILE'
};
for (let i = 1; i <= 10; i++) SIGN_CELLS.push({ key: 'T' + i, text: String(i), bg: '#0b1630', fg: '#ffffff', sub: TURN_NAME[i] || 'TURN', turn: true });

/** extraCells: more cells from circuit style data, e.g. sponsor billboards { key, text, bg, fg, accent } */
export function makeSignAtlas(extraCells = []) {
  const CELLS = [...SIGN_CELLS, ...extraCells];
  const cw = 512, ch = 160, cols = 4;
  const rows = Math.ceil(CELLS.length / cols);
  const c = document.createElement('canvas');
  c.width = cw * cols; c.height = ch * rows;
  const ctx = c.getContext('2d');
  const uv = {};

  CELLS.forEach((cell, idx) => {
    const x = (idx % cols) * cw, y = Math.floor(idx / cols) * ch;

    // 1. Base card with subtle metallic bevel & carbon texture
    ctx.fillStyle = cell.bg || '#11151c';
    ctx.fillRect(x, y, cw, ch);

    // Carbon weave micro-texture for dark cards
    if (cell.bg === '#0b1630' || cell.bg === '#111111' || cell.bg === '#0c1626') {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let py = 0; py < ch; py += 4) {
        ctx.fillRect(x, y + py, cw, 2);
      }
    }

    const dist = /^B\d+$/.test(cell.key);
    const isSponsor = cell.key.startsWith('SP_');

    if (dist) {
      // ------------------------------------------------------------- BRAKING DISTANCE BOARD
      // Clean reflective white background with black FIA race border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 4, cw - 8, ch - 8);

      // Heavy race border
      ctx.strokeStyle = '#14171c';
      ctx.lineWidth = 10;
      ctx.strokeRect(x + 5, y + 5, cw - 10, ch - 10);

      // High-visibility yellow & black diagonal hazard stripes on side tabs
      const drawChevrons = (bx) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, y + 10, 24, ch - 20);
        ctx.clip();
        ctx.fillStyle = '#f5c400';
        ctx.fillRect(bx, y + 10, 24, ch - 20);
        ctx.fillStyle = '#111111';
        for (let cy = y; cy < y + ch + 30; cy += 18) {
          ctx.beginPath();
          ctx.moveTo(bx, cy);
          ctx.lineTo(bx + 24, cy - 14);
          ctx.lineTo(bx + 24, cy - 6);
          ctx.lineTo(bx, cy + 8);
          ctx.fill();
        }
        ctx.restore();
      };
      drawChevrons(x + 10);
      drawChevrons(x + cw - 34);

      // Bold distance numeral with subtle drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.font = '900 110px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.text, x + cw / 2 + 3, y + ch / 2 + 5);

      ctx.fillStyle = '#0f1218';
      ctx.fillText(cell.text, x + cw / 2, y + ch / 2 + 2);

      // Micro "METRES" subtitle and FIA track safety seal
      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#555e6d';
      ctx.fillText('METRES', x + cw / 2, y + ch - 18);
    } else if (cell.ring) {
      // ------------------------------------------------------------- PIT SPEED LIMIT (80 KM/H)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 4, cw - 8, ch - 8);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 4, y + 4, cw - 8, ch - 8);

      // International FIA Red Speed Ring
      ctx.strokeStyle = '#d5001c';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(x + 100, y + ch / 2, 58, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.font = '900 68px "Arial Black", Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cell.text, x + 100, y + ch / 2 + 4);

      ctx.textAlign = 'left';
      ctx.font = '900 38px "Arial Black", sans-serif';
      ctx.fillStyle = '#111111';
      ctx.fillText('PIT SPEED LIMIT', x + 185, y + ch / 2 - 10);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#d5001c';
      ctx.fillText('MAX 80 KM/H · STRICTLY ENFORCED', x + 185, y + ch / 2 + 28);
    } else if (cell.turn) {
      // ------------------------------------------------------------- TURN BOARD (T1 to T10)
      // Fluorescent green apex indicator strip along left border
      ctx.fillStyle = '#00e676';
      ctx.fillRect(x + 6, y + 6, 16, ch - 12);

      // Outer safety border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);

      // Giant corner numeral on the right
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 114px "Arial Black", Impact, sans-serif';
      ctx.fillText(cell.text, x + 380, y + ch / 2 + 6);

      // Corner name and FIA designation on the left
      ctx.textAlign = 'left';
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('FORMULA 1 AUSTRIAN GP', x + 40, y + 42);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px "Arial Black", sans-serif';
      ctx.fillText(cell.sub, x + 40, y + 84, 250);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('SPIELBERG · TURN ' + cell.text, x + 40, y + 122);
    } else if (isSponsor) {
      // ------------------------------------------------------------- AUTHENTIC SPONSOR BILLBOARDS
      const spName = cell.key.replace('SP_', '');
      ctx.fillStyle = cell.bg;
      ctx.fillRect(x + 4, y + 4, cw - 8, ch - 8);
      ctx.strokeStyle = cell.accent || 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (spName === 'ROLEX') {
        // Rolex Green & Gold Crown
        ctx.fillStyle = '#ffd700';
        // 5-point Rolex crown
        const cx = x + cw / 2, cy = y + 45;
        ctx.beginPath();
        ctx.moveTo(cx - 36, cy + 18);
        ctx.lineTo(cx - 44, cy - 8);
        ctx.lineTo(cx - 18, cy + 4);
        ctx.lineTo(cx, cy - 18);
        ctx.lineTo(cx + 18, cy + 4);
        ctx.lineTo(cx + 44, cy - 8);
        ctx.lineTo(cx + 36, cy + 18);
        ctx.closePath();
        ctx.fill();
        for (let pt of [-44, -18, 0, 18, 44]) {
          ctx.beginPath();
          ctx.arc(cx + pt, cy + (Math.abs(pt) === 44 ? -8 : (pt === 0 ? -18 : 4)), 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.font = '900 52px "Times New Roman", Georgia, serif';
        ctx.fillText('ROLEX', cx, y + 104);
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('OFFICIAL TIMEKEEPER', cx, y + 138);
      } else if (spName === 'PIRELLI') {
        // Red with Speed-Yellow stretched P
        const cx = x + cw / 2, cy = y + ch / 2;
        ctx.fillStyle = '#fdd400';
        ctx.font = '900 68px "Arial Black", Impact, sans-serif';
        ctx.fillText('PIRELLI', cx, cy - 8);
        ctx.fillRect(cx - 180, cy - 42, 360, 8); // iconic horizontal stretched P bar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('POWER IS NOTHING WITHOUT CONTROL', cx, cy + 40);
      } else if (spName === 'ARAMCO') {
        // Aramco dual-tone energy rays
        const cx = x + cw / 2, cy = y + ch / 2;
        ctx.fillStyle = '#00a3e0';
        ctx.font = '900 64px "Arial Black", sans-serif';
        ctx.fillText('aramco', cx, cy - 8);
        ctx.fillStyle = '#00b140';
        ctx.fillRect(cx - 160, cy + 30, 320, 8);
        ctx.fillStyle = '#0072ce';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('WHERE ENERGY IS OPPORTUNITY', cx, cy + 54);
      } else if (spName === 'DHL') {
        // DHL Yellow & Red Italic with speed cuts
        const cx = x + cw / 2, cy = y + ch / 2;
        ctx.fillStyle = '#d40511';
        ctx.font = 'italic 900 82px "Arial Black", Impact, sans-serif';
        ctx.fillText('DHL', cx, cy - 4);
        ctx.fillStyle = '#ffcc00';
        for (let l = 0; l < 4; l++) {
          ctx.fillRect(cx - 120 + l * 65, cy - 35, 12, 50);
        }
        ctx.fillStyle = '#d40511';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('EXCELLENCE. SIMPLY DELIVERED.', cx, cy + 48);
      } else {
        // Generic high-contrast sponsor
        ctx.fillStyle = cell.fg;
        ctx.font = `900 ${cell.text.length > 8 ? 48 : 64}px "Arial Black", sans-serif`;
        ctx.fillText(cell.text, x + cw / 2, y + ch / 2 - 10);
        if (cell.sub) {
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText(cell.sub, x + cw / 2, y + ch / 2 + 36);
        }
      }
    } else {
      // ------------------------------------------------------------- GENERAL TRACKSIDE SIGNS
      ctx.strokeStyle = cell.accent || 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 6, y + 6, cw - 12, ch - 12);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (cell.key === 'RBR' || cell.key === 'SPIELBERG') {
        // Circuit name header
        ctx.fillStyle = '#e10600';
        ctx.fillRect(x + 10, y + 10, cw - 20, 10);
        ctx.fillStyle = cell.fg;
        ctx.font = '900 52px "Arial Black", Impact, sans-serif';
        ctx.fillText(cell.text, x + cw / 2, y + ch / 2 - 8);
        ctx.fillStyle = cell.key === 'RBR' ? '#f5c400' : '#e10600';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(cell.sub, x + cw / 2, y + ch / 2 + 38);
      } else if (cell.key === 'PITIN' || cell.key === 'PITOUT') {
        ctx.fillStyle = cell.key === 'PITIN' ? '#f5c400' : '#00e676';
        ctx.fillRect(x + 10, y + 10, cw - 20, 12);
        ctx.fillStyle = cell.fg;
        ctx.font = '900 54px "Arial Black", sans-serif';
        ctx.fillText(cell.text, x + cw / 2, y + ch / 2 - 8);
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(cell.sub, x + cw / 2, y + ch / 2 + 36);
      } else if (cell.sub) {
        ctx.fillStyle = cell.fg;
        ctx.font = '900 50px "Arial Black", sans-serif';
        ctx.fillText(cell.text, x + cw / 2, y + 54);
        ctx.font = 'bold 24px sans-serif';
        ctx.globalAlpha = 0.85;
        ctx.fillText(cell.sub, x + cw / 2, y + 112);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = cell.fg;
        ctx.font = `900 ${cell.text.length > 6 ? 64 : 88}px "Arial Black", sans-serif`;
        ctx.fillText(cell.text, x + cw / 2, y + ch / 2 + 4, cw - 40);
      }
    }

    // Normalized UV coordinates for atlas cell
    uv[cell.key] = [x / c.width, 1 - (y + ch) / c.height, (x + cw) / c.width, 1 - y / c.height];
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, uv };
}
