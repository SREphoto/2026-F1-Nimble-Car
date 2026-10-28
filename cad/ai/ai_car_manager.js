/**
 * ai_car_manager.js — 21 AI Opponent Cars: Visuals, Kinematics, Wheel Rotation & Grid Management.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

import * as THREE from 'three';
import { AiRacingCorridor } from './ai_racing_corridor.js';

const DM = 10;            // Scene units per metre (decimetres)
const WHEELBASE = 3.4;    // 34 dm
const WHEEL_R = 0.36;     // 3.6 dm
const TRACK_WIDTH = 1.8;  // 18 dm

export class AiCarManager {
  constructor({ scene, circuit, gridConfig, playerConfig }) {
    this.scene = scene;
    this.circuit = circuit;
    this.track = circuit.track;
    this.raceline = circuit.raceline;
    this.gridConfig = gridConfig;
    this.playerConfig = playerConfig || { replaces: 'Max Verstappen' };

    this.group = new THREE.Group();
    this.group.name = 'AI_Opponents_Grid';
    this.scene.add(this.group);

    this.corridor = new AiRacingCorridor({ circuit, gridConfig });
    this.cars = [];
    this.tmpBasis = {
      f: new THREE.Vector3(),
      r: new THREE.Vector3(),
      u: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      front: new THREE.Vector3(),
      rear: new THREE.Vector3(),
    };

    this.initOpponents();
  }

  initOpponents() {
    const teams = this.gridConfig.teams || [];
    let carIndex = 0;

    teams.forEach((t) => {
      const drivers = t.drivers || [];
      drivers.forEach((d) => {
        // Skip player car
        if (d.name === this.playerConfig.replaces) return;

        const carData = {
          id: `#${d.no}`,
          no: d.no,
          name: d.name,
          team: t.team,
          teamSlug: t.slug,
          colour: t.colour || '#00d4e8',
          accentColour: t.accent || '#ffffff',
          pacePct: t.sim_pace_pct || 0,
          driverPct: (Math.sin(d.no * 97) * 0.15), // Repeatable driver variation
          x: 0,
          z: 0,
          y: 0,
          h: 0,
          v: 0,
          sp: 0,
          rlIdx: 0,
          latOffset: 0,
          lap: 0,
          sector: 0,
          sectors: [null, null, null],
          lapStart: null,
          lastLap: null,
          bestLap: null,
          inPit: false,
          retired: false,
          wingHealth: 1.0,
          tyreCompound: 'soft',
          tyreWear: 0,
          wheelRot: 0,
          steerAngle: 0,
        };

        const carMesh = this.createCarMesh(carData);
        carData.mesh = carMesh;
        this.group.add(carMesh);
        this.cars.push(carData);
        carIndex++;
      });
    });

    console.info(`[AiCarManager] Initialized ${this.cars.length} AI opponent cars on track.`);
    // Immediately position all 21 cars on the starting grid slots
    this.alignToGrid();
  }

  createCarMesh(carData) {
    const carRoot = new THREE.Group();
    carRoot.name = `AI_Car_${carData.no}_${carData.teamSlug}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(carData.colour),
      roughness: 0.35,
      metalness: 0.25,
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(carData.accentColour),
      roughness: 0.35,
      metalness: 0.35,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x151618,
      roughness: 0.75,
      metalness: 0.1,
    });

    const haloMat = new THREE.MeshStandardMaterial({
      color: 0x222428,
      roughness: 0.4,
      metalness: 0.8,
    });

    // 1. Monocoque Tub & Nose (dm coordinates)
    const noseGeo = new THREE.ConeGeometry(3.5, 15, 8);
    noseGeo.rotateZ(Math.PI / 2);
    noseGeo.translate(-4.5, 2.5, 0);
    const noseMesh = new THREE.Mesh(noseGeo, bodyMat);
    carRoot.add(noseMesh);

    const tubGeo = new THREE.BoxGeometry(22, 5.0, 7.2);
    tubGeo.translate(14, 2.8, 0);
    const tubMesh = new THREE.Mesh(tubGeo, bodyMat);
    carRoot.add(tubMesh);

    // 2. Engine Cover & Shark Fin
    const finShape = new THREE.Shape();
    finShape.moveTo(10, 5.0);
    finShape.lineTo(33, 5.0);
    finShape.lineTo(33, 9.5);
    finShape.lineTo(16, 9.0);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.3, bevelEnabled: false });
    finGeo.translate(0, 0, -0.15);
    const finMesh = new THREE.Mesh(finGeo, accentMat);
    carRoot.add(finMesh);

    // 3. Sidepods
    const podGeo = new THREE.BoxGeometry(16, 4.2, 5.0);
    const podLeft = new THREE.Mesh(podGeo, bodyMat);
    podLeft.position.set(16, 2.4, 5.2);
    const podRight = new THREE.Mesh(podGeo, bodyMat);
    podRight.position.set(16, 2.4, -5.2);
    carRoot.add(podLeft, podRight);

    // 4. Front Wing Assembly
    const fwMainGeo = new THREE.BoxGeometry(2.5, 0.4, 18.0);
    const fwMain = new THREE.Mesh(fwMainGeo, bodyMat);
    fwMain.position.set(-11.5, 1.2, 0);

    const fwPlateGeo = new THREE.BoxGeometry(4.0, 3.0, 0.3);
    const fwPlateL = new THREE.Mesh(fwPlateGeo, accentMat);
    fwPlateL.position.set(-11.5, 2.2, 9.0);
    const fwPlateR = new THREE.Mesh(fwPlateGeo, accentMat);
    fwPlateR.position.set(-11.5, 2.2, -9.0);
    carRoot.add(fwMain, fwPlateL, fwPlateR);
    carData.frontWingMesh = fwMain;

    // 5. Rear Wing Assembly
    const rwMainGeo = new THREE.BoxGeometry(3.2, 0.5, 14.0);
    const rwMain = new THREE.Mesh(rwMainGeo, accentMat);
    rwMain.position.set(38.0, 8.8, 0);

    const rwPlateGeo = new THREE.BoxGeometry(6.0, 7.5, 0.3);
    const rwPlateL = new THREE.Mesh(rwPlateGeo, bodyMat);
    rwPlateL.position.set(38.0, 6.0, 7.0);
    const rwPlateR = new THREE.Mesh(rwPlateGeo, bodyMat);
    rwPlateR.position.set(38.0, 6.0, -7.0);
    carRoot.add(rwMain, rwPlateL, rwPlateR);

    // 6. Halo
    const haloTorusGeo = new THREE.TorusGeometry(3.5, 0.45, 8, 16, Math.PI);
    haloTorusGeo.rotateX(Math.PI / 2);
    haloTorusGeo.rotateZ(Math.PI);
    haloTorusGeo.translate(14, 7.2, 0);
    const haloMesh = new THREE.Mesh(haloTorusGeo, haloMat);
    carRoot.add(haloMesh);

    // 7. Driver Helmet
    const helmetGeo = new THREE.SphereGeometry(1.4, 12, 10);
    helmetGeo.scale(1, 1.15, 1);
    const helmetMesh = new THREE.Mesh(helmetGeo, accentMat);
    helmetMesh.position.set(13.5, 6.2, 0);
    carRoot.add(helmetMesh);

    // 8. Floor / Underbody
    const floorGeo = new THREE.BoxGeometry(36, 0.6, 17.5);
    floorGeo.translate(15, 0.5, 0);
    const floorMesh = new THREE.Mesh(floorGeo, carbonMat);
    carRoot.add(floorMesh);

    // 9. Wheels & Spindles
    const wheelMats = this.createWheelMaterials(carData.tyreCompound);
    const wheelData = this.buildWheelCorners(carRoot, wheelMats);
    carData.steerPivots = wheelData.steerPivots;
    carData.wheelRollers = wheelData.wheelRollers;

    // Decal Number Badge on Nose
    const badgeTexture = this.createNumberBadgeTexture(carData.no, carData.colour, carData.accentColour);
    const badgeGeo = new THREE.PlaneGeometry(2.4, 2.4);
    badgeGeo.rotateX(-Math.PI / 2);
    badgeGeo.rotateZ(Math.PI / 2);
    const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTexture, transparent: true });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(-5.5, 3.8, 0);
    carRoot.add(badgeMesh);

    return carRoot;
  }

  createWheelMaterials(compound) {
    const compoundColors = {
      soft: 0xe3122b,
      medium: 0xf5c400,
      hard: 0xffffff,
      inter: 0x25a84a,
      wet: 0x1d6fe8,
    };
    const cColor = compoundColors[compound] || 0xf5c400;

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      roughness: 0.85,
      metalness: 0.1,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.4,
      metalness: 0.8,
    });

    const stripeMat = new THREE.MeshBasicMaterial({
      color: cColor,
    });

    return { rubberMat, rimMat, stripeMat };
  }

  buildWheelCorners(carRoot, { rubberMat, rimMat, stripeMat }) {
    const steerPivots = [];
    const wheelRollers = [];

    // Corner positions: [x, z (horizontal lateral), isFront, isLeft]
    const corners = [
      { name: 'FL', x: 0, z: 7.2, isFront: true, isLeft: true },
      { name: 'FR', x: 0, z: -7.2, isFront: true, isLeft: false },
      { name: 'RL', x: 34, z: 6.8, isFront: false, isLeft: true },
      { name: 'RR', x: 34, z: -6.8, isFront: false, isLeft: false },
    ];

    const tyreGeo = new THREE.CylinderGeometry(WHEEL_R * DM, WHEEL_R * DM, 3.2, 18);
    tyreGeo.rotateX(Math.PI / 2);

    const rimGeo = new THREE.CylinderGeometry(WHEEL_R * DM * 0.65, WHEEL_R * DM * 0.65, 3.25, 14);
    rimGeo.rotateX(Math.PI / 2);

    corners.forEach((c) => {
      const pivot = new THREE.Group();
      pivot.name = `Pivot_${c.name}`;
      pivot.position.set(c.x, WHEEL_R * DM, c.z);

      const roller = new THREE.Group();
      roller.name = `Roller_${c.name}`;

      const tMesh = new THREE.Mesh(tyreGeo, rubberMat);
      const rMesh = new THREE.Mesh(rimGeo, rimMat);
      roller.add(tMesh, rMesh);

      pivot.add(roller);
      carRoot.add(pivot);

      wheelRollers.push(roller);
      if (c.isFront) steerPivots.push(pivot);
    });

    return { steerPivots, wheelRollers };
  }

  createNumberBadgeTexture(no, bgColor, textColor) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(4, 4, 120, 120, 20);
    } else {
      ctx.rect(4, 4, 120, 120);
    }
    ctx.fill();

    ctx.strokeStyle = textColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 72px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(no), 64, 66);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Set starting grid positions (2-by-2 staggered FIA grid) matching painted boxes
   */
  alignToGrid(startingOrder = null) {
    const list = startingOrder || [
      { id: 'player', no: 3 },
      ...this.cars.map((c) => ({ id: c.id, no: c.no })),
    ];

    const poleSide = (this.circuit?.data?.meta?.pole_side === 'right') ? -1 : 1;
    const gridHalf = this.circuit?.data?.meta?.grid_half_m ?? 2.6;

    list.forEach((entry, k) => {
      const isPlayer = entry.id === 'player';
      const sp = -8 * k;
      const F = this.track.at(sp);
      const mid = (F.wr - F.wl) / 2;
      const cL = mid + (k % 2 === 0 ? poleSide : -poleSide) * gridHalf;

      if (!isPlayer) {
        const car = this.cars.find((c) => c.id === entry.id || c.no === entry.no);
        if (car) {
          car.sp = ((sp % this.track.length) + this.track.length) % this.track.length;
          car.latOffset = cL;
          car.v = 0;
          car.lap = 0;
          car.sector = 0;
          car.sectors = [null, null, null];
          car.retired = false;
          car.wingHealth = 1.0;
          this.poseCarOnTrack(car);
        }
      }
    });
  }

  /**
   * Update all 21 AI cars each frame
   */
  update(dt, playerCar, raceControl) {
    const allCars = [...this.cars];

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (car.retired) continue;

      // 1. AI Decision Making via Corridor
      this.corridor.updateCarDecision(car, dt, allCars, playerCar, raceControl);

      // 2. Advance car position along circuit
      car.sp = (car.sp + car.v * dt) % this.track.length;

      // 3. Pose car on track surface (pitch, roll, yaw)
      this.poseCarOnTrack(car);

      // 4. Spin wheels and steer front wheels
      const wheelTravel = (car.v * dt) / WHEEL_R;
      car.wheelRot += wheelTravel;
      car.wheelRollers.forEach((roller) => {
        roller.rotation.z = car.wheelRot;
      });

      // Front steering angle from yaw rate
      const steerRad = Math.atan2(car.latOffset, 15);
      car.steerPivots.forEach((pivot) => {
        pivot.rotation.y = steerRad;
      });

      // 5. Visual damage: front wing angle if broken
      if (car.frontWingMesh && car.wingHealth < 0.9) {
        car.frontWingMesh.rotation.x = 0.15;
        car.frontWingMesh.position.y = 0.8;
      }
    }
  }

  poseCarOnTrack(car) {
    const F = this.track.at(car.sp);
    if (!F) return;

    // Track tangent and right normal
    const tx = F.tx, tz = F.tz;
    const rx = -tz, rz = tx;

    // Position of car front axle and rear axle using lateral offset
    const frontX = F.x + rx * car.latOffset;
    const frontZ = F.z + rz * car.latOffset;
    const rearX = frontX - tx * WHEELBASE;
    const rearZ = frontZ - tz * WHEELBASE;

    car.x = rearX;
    car.z = rearZ;
    car.h = Math.atan2(tz, tx);

    const Lr = this.track.locate(rearX, rearZ, car.idx);
    const Lf = this.track.locate(frontX, frontZ, Lr.i);
    car.idx = Lr.i;
    car.y = (Lr.y + Lf.y) * 0.5;

    const tmp = this.tmpBasis;
    tmp.rear.set(rearX, Lr.y, rearZ);
    tmp.front.set(frontX, Lf.y, frontZ);

    tmp.f.subVectors(tmp.front, tmp.rear).normalize();
    tmp.r.set(-tz, 0, tx).normalize();
    tmp.u.crossVectors(tmp.r, tmp.f).normalize();
    tmp.m.makeBasis(tmp.f.clone().negate(), tmp.r, tmp.u);

    car.mesh.quaternion.setFromRotationMatrix(tmp.m);
    car.mesh.position.set(frontX * DM, Lf.y * DM, frontZ * DM);
  }
}
