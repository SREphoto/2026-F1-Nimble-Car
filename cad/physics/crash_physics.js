/**
 * crash_physics.js — Impulse collision dynamics, spin-outs, wing damage, sparks & debris particle emitters.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

import * as THREE from 'three';

const CAR_LENGTH = 5.0; // Metres
const CAR_WIDTH = 2.0;  // Metres
const DM = 10;          // Decimetres per metre

export class CrashPhysicsEngine {
  constructor({ scene, track }) {
    this.scene = scene;
    this.track = track;

    this.sparksGroup = new THREE.Group();
    this.sparksGroup.name = 'Physics_Sparks_System';
    this.debrisGroup = new THREE.Group();
    this.debrisGroup.name = 'Physics_Debris_System';
    this.scene.add(this.sparksGroup, this.debrisGroup);

    this.activeSparks = [];
    this.activeDebris = [];

    this.initParticlePools();
  }

  initParticlePools() {
    // 1. Sparks geometry and material
    const maxSparks = 200;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(maxSparks * 3);
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));

    const sparkMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 2.2,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    this.sparksGroup.add(this.sparkPoints);

    // 2. Debris fragment geometry and material
    const maxDebris = 120;
    const debrisGeo = new THREE.BufferGeometry();
    const debrisPos = new Float32Array(maxDebris * 3);
    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPos, 3));

    const debrisMat = new THREE.PointsMaterial({
      color: 0x111115,
      size: 3.5,
      transparent: true,
      opacity: 0.95,
    });

    this.debrisPoints = new THREE.Points(debrisGeo, debrisMat);
    this.debrisGroup.add(this.debrisPoints);
  }

  emitSparks(x, y, z, vx, vy, vz, count = 15) {
    for (let i = 0; i < count; i++) {
      this.activeSparks.push({
        x: x * DM,
        y: y * DM,
        z: z * DM,
        vx: (vx + (Math.random() - 0.5) * 8) * DM,
        vy: (vy + Math.random() * 4 + 1) * DM,
        vz: (vz + (Math.random() - 0.5) * 8) * DM,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
      });
    }
  }

  emitDebris(x, y, z, count = 10) {
    for (let i = 0; i < count; i++) {
      this.activeDebris.push({
        x: x * DM,
        y: (y + 0.3) * DM,
        z: z * DM,
        vx: (Math.random() - 0.5) * 16 * DM,
        vy: (Math.random() * 8 + 3) * DM,
        vz: (Math.random() - 0.5) * 16 * DM,
        life: 1.2 + Math.random() * 0.8,
      });
    }
  }

  /**
   * Check and resolve collisions between Player car and AI cars, and between AI cars
   */
  checkCollisions(playerCar, aiCars, onCrashCallback) {
    const allCars = [];
    if (playerCar) {
      allCars.push({ isPlayer: true, car: playerCar });
    }
    aiCars.forEach((c) => allCars.push({ isPlayer: false, car: c }));

    const n = allCars.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const itemA = allCars[i];
        const itemB = allCars[j];
        const carA = itemA.car;
        const carB = itemB.car;

        if (carA.retired || carB.retired) continue;

        // Euclidean distance check in metres
        const dx = carA.x - carB.x;
        const dz = carA.z - carB.z;
        const distSq = dx * dx + dz * dz;

        // Collision threshold (approx 4.5m longitudinal, 2.0m lateral)
        if (distSq < 14.0) {
          const dist = Math.sqrt(distSq) || 0.001;
          const nx = dx / dist;
          const nz = dz / dist;

          // Relative velocity
          const vAx = Math.cos(carA.h) * carA.v;
          const vAz = Math.sin(carA.h) * carA.v;
          const vBx = Math.cos(carB.h) * carB.v;
          const vBz = Math.sin(carB.h) * carB.v;

          const relVx = vAx - vBx;
          const relVz = vAz - vBz;
          const relSpeedNorm = relVx * nx + relVz * nz;

          // Only apply impulse if closing in
          if (relSpeedNorm < 0) {
            const restitution = 0.45;
            const impulse = -(1 + restitution) * relSpeedNorm * 0.5;

            // Apply linear push
            carA.v += impulse * 0.6;
            carB.v -= impulse * 0.6;

            // Lateral separation push
            const overlap = Math.max(0.2, 3.8 - dist);
            carA.x += nx * overlap * 0.5;
            carA.z += nz * overlap * 0.5;
            carB.x -= nx * overlap * 0.5;
            carB.z -= nz * overlap * 0.5;

            // Spin-out torque if off-center
            const headingDelta = Math.abs(carA.h - carB.h);
            if (headingDelta > 0.25) {
              const spinTorque = (Math.random() - 0.5) * 0.8;
              carA.h += spinTorque;
              carB.h -= spinTorque;
            }

            // High impact speed triggers damage and debris
            const impactSpeed = Math.abs(relSpeedNorm);
            if (impactSpeed > 6.0) {
              const midX = (carA.x + carB.x) * 0.5;
              const midZ = (carA.z + carB.z) * 0.5;
              const midY = (carA.y + carB.y) * 0.5;

              this.emitSparks(midX, midY, midZ, nx * 5, 2, nz * 5, 25);
              this.emitDebris(midX, midY, midZ, 18);

              // Damage front wing of trailing car
              if (carA.v > carB.v + 4.0) {
                carA.wingHealth = Math.max(0.3, (carA.wingHealth || 1.0) - 0.35);
              } else if (carB.v > carA.v + 4.0) {
                carB.wingHealth = Math.max(0.3, (carB.wingHealth || 1.0) - 0.35);
              }

              if (onCrashCallback) {
                onCrashCallback({ carA, carB, impactSpeed, isPlayerInvolved: itemA.isPlayer || itemB.isPlayer });
              }
            }
          }
        }
      }
    }
  }

  /**
   * Update particle lifetimes and buffer attributes
   */
  updateParticles(dt) {
    // 1. Update Sparks
    const sparkPos = this.sparkPoints.geometry.attributes.position.array;
    let sIdx = 0;
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const p = this.activeSparks[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.activeSparks.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * DM * dt; // Gravity

      sparkPos[sIdx * 3] = p.x;
      sparkPos[sIdx * 3 + 1] = p.y;
      sparkPos[sIdx * 3 + 2] = p.z;
      sIdx++;
      if (sIdx >= 200) break;
    }
    // Clear remaining
    for (let k = sIdx * 3; k < sparkPos.length; k++) sparkPos[k] = 0;
    this.sparkPoints.geometry.attributes.position.needsUpdate = true;

    // 2. Update Debris
    const debrisPos = this.debrisPoints.geometry.attributes.position.array;
    let dIdx = 0;
    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const p = this.activeDebris[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.activeDebris.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 9.8 * DM * dt;

      debrisPos[dIdx * 3] = p.x;
      debrisPos[dIdx * 3 + 1] = p.y;
      debrisPos[dIdx * 3 + 2] = p.z;
      dIdx++;
      if (dIdx >= 120) break;
    }
    for (let k = dIdx * 3; k < debrisPos.length; k++) debrisPos[k] = 0;
    this.debrisPoints.geometry.attributes.position.needsUpdate = true;
  }
}
