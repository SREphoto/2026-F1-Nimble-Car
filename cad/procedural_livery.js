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
 * 1. Pirelli 18-Inch Sidewall Texture (Yellow Medium Compound)
 */
export function createPirelliSidewallTexture(isLeft = true) {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Dark matte rubber base
  ctx.fillStyle = '#16181c';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.49, 0, Math.PI * 2);
  ctx.fill();

  // Outer Bead & Inner Rim Shadows
  ctx.strokeStyle = '#0d0f12';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.47, 0, Math.PI * 2);
  ctx.stroke();

  // Pirelli Bright Yellow Circular Stripe
  ctx.strokeStyle = '#f6b800';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.40, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Yellow Accent Line
  ctx.strokeStyle = '#f6b800';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Helper to draw curved text along an arc
  function drawCurvedText(text, radius, startAngle, letterSpacing = 0.045, isTop = true) {
    ctx.save();
    ctx.font = '900 52px "Arial Black", "Impact", sans-serif';
    ctx.fillStyle = '#f6b800';
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

  // Top Text: "P ZERO"
  drawCurvedText('P  Z E R O', size * 0.40, -Math.PI / 2, 0.055, true);

  // Bottom Text: "PIRELLI"
  drawCurvedText('P I R E L L I', size * 0.40, Math.PI / 2, 0.052, false);

  // Red Accent Tab next to Pirelli logo
  ctx.save();
  ctx.fillStyle = '#d90429';
  const redTabAng = Math.PI / 2 + 0.28;
  ctx.translate(cx + Math.cos(redTabAng) * size * 0.40, cy + Math.sin(redTabAng) * size * 0.40);
  ctx.rotate(redTabAng - Math.PI / 2);
  ctx.fillRect(-18, -10, 36, 20);
  ctx.restore();

  // Center Rim Opening (Transparent hole for carbon dish)
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
