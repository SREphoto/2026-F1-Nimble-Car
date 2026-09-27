/**
 * procedural_livery.js — Procedural Livery & Typography Engine
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 * 
 * Generates dynamic high-DPI CanvasTextures with zero external asset dependencies:
 * - Pirelli P Zero 18-Inch Sidewall Decals with Yellow Striping
 * - Sidepod Flank Sponsor Livery: Giant White ORACLE & Stylized Red Bull
 * - Engine Cover Dorsal Livery: Charging Bull Silhouette, Sun Disc & Red Speed Pinstripes
 * - Drooping Nosecone Livery: Racing Yellow Tip, Driver #1, Bull Flanks & Mobil 1
 * - Rear Wing Flap: Massive Bold White ORACLE Typography
 * - Front & Rear Wing Endplates: Mobil 1 & Red Bull Racing Accents
 */

import * as THREE from 'three';

/**
 * Helper to configure high-fidelity CanvasTexture
 */
function finalizeTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/**
/**
 * 1. Pirelli 18-Inch Sidewall Texture (Yellow Medium Compound)
 * Matches reference photos media_1790507833839.webp & media_1790507835807.webp:
 * - Electric blue outer rim bead ring
 * - Official Pirelli yellow typography with horizontal top bar and red accent in P
 * - FSC certified tree eco-logo
 * - Curved checkered flag yellow ribbon arc with concentric inner dashed line
 * - White barcode sticker with "C3303" and barcode stripes
 * - Bold italic yellow "P ZERO" lettering
 * - Fine white technical serial text ("18 INCH - FOR RACING USE ONLY - MADE IN ROMANIA")
 */
export function createPirelliSidewallTexture(isLeft = true) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Dark matte scrubbed rubber base with micro-radial noise
  ctx.fillStyle = '#16181c';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.495, 0, Math.PI * 2);
  ctx.fill();

  // Subtle radial rubber scrub texture
  ctx.strokeStyle = '#1b1d22';
  ctx.lineWidth = 1.5;
  for (let a = 0; a < Math.PI * 2; a += 0.03) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (size * 0.33), cy + Math.sin(a) * (size * 0.33));
    ctx.lineTo(cx + Math.cos(a) * (size * 0.49), cy + Math.sin(a) * (size * 0.49));
    ctx.stroke();
  }

  // Outer Bead & Inner Rim Shadows
  ctx.strokeStyle = '#0a0c0e';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.485, 0, Math.PI * 2);
  ctx.stroke();

  // ELECTRIC BLUE RIM BEAD FLANGE RING (From reference photos media_1790507833839 & media_1790507835807)
  ctx.strokeStyle = '#0055ff';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.332, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#1a88ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.338, 0, Math.PI * 2);
  ctx.stroke();

  // Helper to draw curved text along an arc
  function drawCurvedText(text, radius, startAngle, letterSpacing = 0.045, isTop = true, font = '900 48px "Arial Black", sans-serif', color = '#f6b800') {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = text.split('');
    const totalAngle = (chars.length - 1) * letterSpacing;
    const baseAngle = isTop ? (startAngle - totalAngle / 2) : (startAngle + totalAngle / 2);

    chars.forEach((ch, idx) => {
      const angle = isTop ? (baseAngle + idx * letterSpacing) : (baseAngle - idx * letterSpacing);
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.rotate(angle + (isTop ? Math.PI / 2 : -Math.PI / 2));
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  // 1. TOP SECTION: "PIRELLI" LOGO (At -Math.PI / 2)
  drawCurvedText('P I R E L L I', size * 0.425, -Math.PI / 2, 0.048, true, '900 52px "Arial Black", sans-serif', '#f6b800');

  // Red Accent Stripe inside P
  ctx.save();
  const pAngle = -Math.PI / 2 - 0.12;
  ctx.translate(cx + Math.cos(pAngle) * size * 0.425, cy + Math.sin(pAngle) * size * 0.425);
  ctx.rotate(pAngle + Math.PI / 2);
  ctx.fillStyle = '#d90429';
  ctx.fillRect(-10, -3, 20, 6);
  ctx.restore();

  // FSC Certified Tree Eco-Logo (Beside Pirelli)
  ctx.save();
  const fscAngle = -Math.PI / 2 - 0.22;
  ctx.translate(cx + Math.cos(fscAngle) * size * 0.422, cy + Math.sin(fscAngle) * size * 0.422);
  ctx.rotate(fscAngle + Math.PI / 2);
  ctx.fillStyle = '#f6b800';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌲', 0, -4);
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('FSC', 0, 12);
  ctx.restore();

  // 2. YELLOW CHECKERED FLAG ARC WITH CONCENTRIC DASHED LINE (Right quadrant)
  const chkRadius = size * 0.412;
  const startChk = -Math.PI / 2 + 0.25;
  const endChk = Math.PI / 2 - 0.25;
  const numCols = 22;
  const colStep = (endChk - startChk) / numCols;

  for (let c = 0; c < numCols; c++) {
    const a1 = startChk + c * colStep;
    const a2 = a1 + colStep * 0.85;

    // Outer row
    if (c % 2 === 0) {
      ctx.strokeStyle = '#f6b800';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, cy, chkRadius + 5, a1, a2);
      ctx.stroke();
    }
    // Inner row
    if (c % 2 === 1) {
      ctx.strokeStyle = '#f6b800';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(cx, cy, chkRadius - 5, a1, a2);
      ctx.stroke();
    }
  }

  // Inner dashed yellow line running along checkered ribbon
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = '#f6b800';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, chkRadius - 13, startChk, endChk);
  ctx.stroke();
  ctx.restore();

  // 3. WHITE BARCODE STICKER WITH "C3303" (Near lower-right shoulder)
  ctx.save();
  const bcAngle = Math.PI / 2 - 0.38;
  ctx.translate(cx + Math.cos(bcAngle) * size * 0.43, cy + Math.sin(bcAngle) * size * 0.43);
  ctx.rotate(bcAngle + Math.PI / 2);
  // White rectangular sticker backing
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-18, -26, 36, 52);
  // Barcode stripes
  ctx.fillStyle = '#000000';
  const barWidths = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 3, 2];
  let curX = -15;
  barWidths.forEach(bw => {
    ctx.fillRect(curX, -22, bw, 28);
    curX += bw + 1.5;
  });
  // "C3303" text
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('C3303', 0, 18);
  ctx.restore();

  // 4. BOTTOM SECTION: "P ZERO" (At Math.PI / 2)
  drawCurvedText('P  Z E R O', size * 0.425, Math.PI / 2, 0.055, false, 'italic 900 54px "Arial Black", sans-serif', '#f6b800');

  // 5. TECHNICAL SERIAL LETTERING IN CRISP WHITE
  drawCurvedText('18" FOR RACING USE ONLY · MAXIMUM LOAD 850 KG · 2026 SPEC', size * 0.368, -Math.PI / 2, 0.024, true, 'bold 13px monospace', '#b0bec5');
  drawCurvedText('SAFETY WARNING · DO NOT MOUNT ON 17" RIMS · FIA HOMOLOGATION', size * 0.368, Math.PI / 2, 0.023, false, 'bold 13px monospace', '#b0bec5');

  // Center Rim Opening (Transparent hole for carbon wheel dish cover)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return finalizeTexture(canvas);
}


/**
 * 2. Sidepod Flank Sponsor Livery: ORACLE & Red Bull Racing
 */
export function createSidepodLiveryTexture(isLeft = true) {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Base Red Bull Deep Metallic Navy
  ctx.fillStyle = '#0c1626';
  ctx.fillRect(0, 0, w, h);

  // Dynamic Aero Flow Streaks (Subtle metallic highlights)
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0.0, '#10203a');
  grad.addColorStop(0.5, '#0c1626');
  grad.addColorStop(1.0, '#080e18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Flow Lines
  ctx.strokeStyle = '#182b48';
  ctx.lineWidth = 4;
  for (let y = 150; y < h; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + 40, w * 0.7, y - 60, w, y - 20);
    ctx.stroke();
  }

  // Red Bull Yellow & Red Speed Swoosh along shoulder
  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.moveTo(100, 200);
  ctx.lineTo(w - 200, 280);
  ctx.lineTo(w - 250, 320);
  ctx.lineTo(80, 240);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d90429';
  ctx.beginPath();
  ctx.moveTo(80, 240);
  ctx.lineTo(w - 250, 320);
  ctx.lineTo(w - 300, 360);
  ctx.lineTo(60, 280);
  ctx.closePath();
  ctx.fill();

  // GIANT BOLD WHITE "ORACLE" WORDMARK
  ctx.save();
  ctx.font = 'bold 220px "Arial Black", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 10;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORACLE', w * 0.52, 540);
  ctx.restore();

  // Stylized "Red Bull" Racing Text
  ctx.save();
  ctx.font = 'italic 900 130px "Arial Black", sans-serif';
  ctx.fillStyle = '#d90429';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.textAlign = 'left';
  ctx.strokeText('Red Bull', 380, 740);
  ctx.fillText('Red Bull', 380, 740);
  ctx.restore();

  // Minor Sponsor Badges
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = '#b0c4de';
  ctx.textAlign = 'left';
  ctx.fillText('Mobil 1', 1200, 720);
  ctx.fillText('ROKT', 1450, 720);
  ctx.fillText('SIEMENS', 1200, 780);
  ctx.fillText('CLEAR', 1450, 780);
  ctx.fillText('HONDA', 1200, 840);
  ctx.fillText('Player 0.0', 1450, 840);

  // Carbon Edge Trim on Bottom
  ctx.fillStyle = '#06090d';
  ctx.fillRect(0, h - 80, w, 80);
  ctx.fillStyle = '#f6b800';
  ctx.fillRect(0, h - 90, w, 10);

  return finalizeTexture(canvas);
}

/**
 * 3. Engine Cover Dorsal Livery: Charging Bull, Sun & Shark Fin Accents
 */
export function createEngineCoverLiveryTexture(isLeft = true) {
  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Deep Navy Base
  ctx.fillStyle = '#0c1626';
  ctx.fillRect(0, 0, w, h);

  // BRIGHT YELLOW SUN DISC (Behind the bull)
  const sunX = w * 0.44;
  const sunY = h * 0.46;
  const sunRadius = 240;

  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Sun Rim Glow
  ctx.strokeStyle = '#ffdd44';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius + 8, 0, Math.PI * 2);
  ctx.stroke();

  // RED CHARGING BULL GRAPHIC
  ctx.save();
  ctx.translate(sunX - 160, sunY + 60);
  ctx.scale(isLeft ? 1 : -1, 1);

  ctx.fillStyle = '#d90429';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;

  ctx.beginPath();
  // Muscular Charging Bull Body Contour
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(40, -80, 120, -110, 200, -90);  // Back crest
  ctx.bezierCurveTo(240, -80, 280, -30, 320, 20);   // Haunches
  ctx.lineTo(340, 120);                             // Rear legs
  ctx.bezierCurveTo(310, 140, 260, 110, 240, 60);
  ctx.bezierCurveTo(200, 70, 150, 80, 100, 60);     // Belly
  ctx.lineTo(60, 130);                              // Front legs
  ctx.bezierCurveTo(30, 120, 10, 90, -20, 50);
  ctx.bezierCurveTo(-60, 30, -100, -10, -130, -50); // Lower head & neck
  ctx.bezierCurveTo(-150, -80, -140, -120, -110, -130); // Forehead
  ctx.bezierCurveTo(-80, -140, -40, -110, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bull Horns (Vibrant Yellow)
  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.moveTo(-110, -130);
  ctx.quadraticCurveTo(-140, -190, -190, -180);
  ctx.quadraticCurveTo(-140, -150, -100, -120);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // Red Bull Typography below Bull
  ctx.save();
  ctx.font = 'italic 900 110px "Arial Black", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('Red Bull', w * 0.44, sunY + sunRadius + 110);
  ctx.restore();

  // Shark Fin Yellow Edge along Top
  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.lineTo(w, 160);
  ctx.lineTo(w, 200);
  ctx.lineTo(0, 80);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d90429';
  ctx.beginPath();
  ctx.moveTo(0, 80);
  ctx.lineTo(w, 200);
  ctx.lineTo(w, 230);
  ctx.lineTo(0, 110);
  ctx.closePath();
  ctx.fill();

  return finalizeTexture(canvas);
}

/**
 * 4. Drooping Nosecone Livery: Racing Yellow Tip, Driver #1, Bull Flanks
 */
export function createNoseconeLiveryTexture() {
  const w = 1024;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Navy Upper Deck
  ctx.fillStyle = '#0c1626';
  ctx.fillRect(0, 0, w, h);

  // Bright Yellow Nose Tip Wedge
  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.moveTo(w * 0.15, 0);
  ctx.lineTo(w * 0.85, 0);
  ctx.lineTo(w * 0.65, h * 0.48);
  ctx.lineTo(w * 0.35, h * 0.48);
  ctx.closePath();
  ctx.fill();

  // Red Accent Border
  ctx.strokeStyle = '#d90429';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(w * 0.15, 0);
  ctx.lineTo(w * 0.35, h * 0.48);
  ctx.lineTo(w * 0.65, h * 0.48);
  ctx.lineTo(w * 0.85, 0);
  ctx.stroke();

  // Driver #1 (World Champion Max Verstappen)
  ctx.save();
  ctx.font = 'italic 900 130px "Arial Black", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#d90429';
  ctx.lineWidth = 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText('1', w / 2, h * 0.24);
  ctx.fillText('1', w / 2, h * 0.24);
  ctx.restore();

  // ORACLE Sponsor Logo on Nose
  ctx.save();
  ctx.font = 'bold 74px "Arial Black", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('ORACLE', w / 2, h * 0.65);
  ctx.restore();

  // Mobil 1 & TAG Heuer Sponsors
  ctx.font = 'bold 42px sans-serif';
  ctx.fillStyle = '#b0c4de';
  ctx.textAlign = 'center';
  ctx.fillText('Mobil 1', w / 2, h * 0.77);
  ctx.fillText('TAG HEUER', w / 2, h * 0.86);

  // Red Bull Charging Bull on Left Flank
  ctx.save();
  ctx.translate(w * 0.18, h * 0.75);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#d90429';
  ctx.fillText('Red Bull', 0, 0);
  ctx.restore();

  // Red Bull Charging Bull on Right Flank
  ctx.save();
  ctx.translate(w * 0.82, h * 0.75);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#d90429';
  ctx.fillText('Red Bull', 0, 0);
  ctx.restore();

  return finalizeTexture(canvas);
}

/**
 * 5. Rear Wing Flap: Massive Bold White ORACLE Typography
 */
export function createRearWingOracleTexture() {
  const w = 2048;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Carbon Texture Background
  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, 0, w, h);

  // Carbon Crosshatch Pattern
  ctx.strokeStyle = '#1b1f26';
  ctx.lineWidth = 3;
  for (let i = 0; i < w + h; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - h, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i - h, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }

  // Upper Red Highlight Line
  ctx.fillStyle = '#d90429';
  ctx.fillRect(0, 0, w, 14);

  // GIANT BOLD WHITE "ORACLE" WORDMARK
  ctx.save();
  ctx.font = 'bold 240px "Arial Black", "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORACLE', w / 2, h / 2 + 10);
  ctx.restore();

  // Lower Yellow Highlight Line
  ctx.fillStyle = '#f6b800';
  ctx.fillRect(0, h - 14, w, 14);

  return finalizeTexture(canvas);
}

/**
 * 6. Wing Endplate Texture: Mobil 1 & Red Bull Accents
 */
export function createEndplateTexture(isLeft = true) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Deep Navy Background
  ctx.fillStyle = '#0c1626';
  ctx.fillRect(0, 0, size, size);

  // Mobil 1 Bold Logo (White 'Mobil' with Red '1')
  ctx.save();
  ctx.translate(size * 0.48, size * 0.45);
  ctx.font = 'bold 120px "Arial Black", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Mobil', -40, 0);

  ctx.fillStyle = '#d90429';
  ctx.fillText('1', 140, 0);
  ctx.restore();

  // Red Bull Accent Swoop on bottom
  ctx.fillStyle = '#d90429';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.75);
  ctx.quadraticCurveTo(size * 0.5, size * 0.65, size, size * 0.85);
  ctx.lineTo(size, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f6b800';
  ctx.beginPath();
  ctx.moveTo(0, size * 0.72);
  ctx.quadraticCurveTo(size * 0.5, size * 0.62, size, size * 0.82);
  ctx.lineTo(size, size * 0.85);
  ctx.quadraticCurveTo(size * 0.5, size * 0.65, 0, size * 0.75);
  ctx.closePath();
  ctx.fill();

  return finalizeTexture(canvas);
}

/**
 * 7. Halo Apex Decal Texture (TAG Heuer Crest + 1Password)
 * Matching reference photo media_1790507836542.webp
 */
export function createHaloApexDecalTexture() {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, w, h);

  // TAG Heuer Shield Crest (Center Apex)
  ctx.save();
  ctx.translate(w / 2, 85);

  // Shield boundary
  ctx.beginPath();
  ctx.moveTo(-75, -55);
  ctx.lineTo(75, -55);
  ctx.lineTo(75, 5);
  ctx.lineTo(0, 65);
  ctx.lineTo(-75, 5);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Green upper section (TAG)
  ctx.beginPath();
  ctx.moveTo(-70, -50);
  ctx.lineTo(70, -50);
  ctx.lineTo(70, 0);
  ctx.lineTo(-70, 0);
  ctx.closePath();
  ctx.fillStyle = '#00843d';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 36px "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TAG', 0, -25);

  // Red lower section (HEUER)
  ctx.beginPath();
  ctx.moveTo(-70, 0);
  ctx.lineTo(70, 0);
  ctx.lineTo(70, 5);
  ctx.lineTo(0, 58);
  ctx.lineTo(-70, 5);
  ctx.closePath();
  ctx.fillStyle = '#d90429';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Arial Black", sans-serif';
  ctx.fillText('HEUER', 0, 24);
  ctx.restore();

  // 1Password Logo & Text (Lower Lip)
  ctx.save();
  ctx.translate(w / 2, 205);
  // Keyhole/padlock circle icon
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-95, 0, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-97, -6, 4, 12);

  // "1Password" text
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('1Password', -65, 0);
  ctx.restore();

  return finalizeTexture(canvas);
}

/**
 * 8. Halo Arm Sponsor Decal (AT&T on Left, ORACLE on Right)
 * Matching reference photo media_1790507836542.webp
 */
export function createHaloArmDecalTexture(isLeft = true) {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (isLeft) {
    // Driver's Left Arm: AT&T Globe + Text
    ctx.save();
    ctx.translate(w / 2, h / 2);
    // Globe symbol
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-90, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    // Globe horizontal bands
    for (let b = -18; b <= 18; b += 9) {
      const bw = Math.sqrt(Math.max(0, 28 * 28 - b * b));
      ctx.beginPath();
      ctx.moveTo(-90 - bw, b);
      ctx.lineTo(-90 + bw, b);
      ctx.stroke();
    }
    // "AT&T" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('AT&T', -45, 0);
    ctx.restore();
  } else {
    // Driver's Right Arm: ORACLE White Text
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ORACLE', 0, 0);
    ctx.restore();
  }

  return finalizeTexture(canvas);
}

/**
 * 9. Cockpit Rim Driver & Sponsor Decals
 * Matching reference photo media_1790507836542.webp
 */
export function createCockpitRimDecals(isLeft = true) {
  const w = 512;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  if (isLeft) {
    // Left Rim: M. VERSTAPPEN + Dutch Flag
    ctx.save();
    ctx.translate(60, h / 2);
    // Dutch Flag (Red, White, Blue horizontal stripes)
    const fw = 42;
    const fh = 28;
    ctx.fillStyle = '#ae1c28'; // Dutch Red
    ctx.fillRect(0, -fh / 2, fw, fh / 3);
    ctx.fillStyle = '#ffffff'; // White
    ctx.fillRect(0, -fh / 2 + fh / 3, fw, fh / 3);
    ctx.fillStyle = '#21468b'; // Dutch Blue
    ctx.fillRect(0, -fh / 2 + (2 * fh) / 3, fw, fh / 3);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -fh / 2, fw, fh);

    // "M. VERSTAPPEN" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('M. VERSTAPPEN', fw + 16, 0);
    ctx.restore();
  } else {
    // Right Rim: #1 + Dutch Flag + Pepe Jeans
    ctx.save();
    ctx.translate(60, h / 2);
    // Driver Number 1 in Red Bull font
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 0, 0);

    // Dutch Flag
    const fw = 38;
    const fh = 26;
    const fx = 35;
    ctx.fillStyle = '#ae1c28';
    ctx.fillRect(fx, -fh / 2, fw, fh / 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx, -fh / 2 + fh / 3, fw, fh / 3);
    ctx.fillStyle = '#21468b';
    ctx.fillRect(fx, -fh / 2 + (2 * fh) / 3, fw, fh / 3);

    // "Pepe Jeans"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 24px sans-serif';
    ctx.fillText('Pepe Jeans', fx + fw + 18, 0);
    ctx.restore();
  }

  return finalizeTexture(canvas);
}

/**
 * 10. Rear Wing Endplate Inner Gradient (Red-to-Blue Fade)
 * Matching reference photo media_1790507837418.webp
 */
export function createRearWingEndplateInnerTexture(isLeft = true) {
  const w = 512;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Red-to-Deep-Navy gradient fade running down the inner endplate
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0.0, '#d90429'); // Vibrant Red Bull red at top
  grad.addColorStop(0.35, '#880c28');
  grad.addColorStop(0.70, '#0c1626'); // Transition into deep metallic navy
  grad.addColorStop(1.0, '#060a12');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Carbon twill weave micro-pattern
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + 24);
    ctx.stroke();
  }

  return finalizeTexture(canvas);
}
