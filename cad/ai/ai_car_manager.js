/**
 * ai_car_manager.js — Photorealistic 2026 F1 AI Opponent Cars with Real RB22 3D Geometry,
 * Authentic Team Liveries, Pirelli 18" Wheels, Rotating Spindles & Starting Grid Alignment.
 * 2026 Formula 1 "Nimble Car" · SREdesigns - Samuel R Erwin III
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { AiRacingCorridor } from './ai_racing_corridor.js';
import { F1_TEAMS } from '../../teams.js';
import { createTeamDecalTexture } from '../procedural_livery.js';
import { addCarbonSplit } from '../../materials.js';

const DM = 10;            // Scene units per metre (decimetres)
const WHEELBASE = 3.4;    // 34 dm
const WHEEL_R = 0.36;     // 3.6 dm
const BASE_MODELS = new URL('../../assets/models/', import.meta.url);

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
    this.rb22Template = null;
    this.teamMaterials = {};
    this.teamBodyTemplates = {};

    this.tmpBasis = {
      f: new THREE.Vector3(),
      r: new THREE.Vector3(),
      u: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      front: new THREE.Vector3(),
      rear: new THREE.Vector3(),
    };

    // Shared wheel geometries for all 84 AI wheels (shared VBOs = 0 extra VRAM)
    this.wheelGeos = this.createSharedWheelGeometries();

    this.initOpponents();
    this.loadHighFidelityRb22Model();
  }

  createSharedWheelGeometries() {
    // 18" bead seat (2.286 dm), 710mm tyre diameter (3.55 dm radius)
    // CylinderGeometry height is along local Y axis (matching the car lateral wheel axle)
    const frontTyre = new THREE.CylinderGeometry(3.55, 3.55, 2.80, 32);
    const rearTyre = new THREE.CylinderGeometry(3.55, 3.55, 3.75, 32);

    // Rim lip / aero disc cover: circle geometry in X-Z plane
    // Left side (+Y outboard): normal points along +Y
    const coverLeftGeo = new THREE.CircleGeometry(2.286, 32);
    coverLeftGeo.rotateX(-Math.PI / 2);

    // Right side (-Y outboard): normal points along -Y
    const coverRightGeo = new THREE.CircleGeometry(2.286, 32);
    coverRightGeo.rotateX(Math.PI / 2);

    // Pirelli yellow compound band (RingGeometry)
    const bandLeftGeo = new THREE.RingGeometry(2.35, 2.70, 32);
    bandLeftGeo.rotateX(-Math.PI / 2);

    const bandRightGeo = new THREE.RingGeometry(2.35, 2.70, 32);
    bandRightGeo.rotateX(Math.PI / 2);

    // Center lock nut (small cylinder along Y)
    const nutLeftGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
    nutLeftGeo.translate(0, 0.2, 0);

    const nutRightGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.4, 16);
    nutRightGeo.translate(0, -0.2, 0);

    return { frontTyre, rearTyre, coverLeftGeo, coverRightGeo, bandLeftGeo, bandRightGeo, nutLeftGeo, nutRightGeo };
  }

  initOpponents() {
    const teams = this.gridConfig.teams || [];

    teams.forEach((t) => {
      const drivers = t.drivers || [];
      drivers.forEach((d) => {
        // Skip player car (replaces Max Verstappen)
        if (d.name === this.playerConfig.replaces) return;

        const teamKey = t.slug === 'audi' ? 'sauber' : (F1_TEAMS[t.slug] ? t.slug : 'haas');
        const teamPreset = F1_TEAMS[teamKey] || F1_TEAMS['red-bull'];

        const carData = {
          id: `#${d.no}`,
          no: d.no,
          name: d.name,
          team: t.team,
          teamSlug: t.slug,
          colour: teamPreset.bodyColor ? '#' + teamPreset.bodyColor.toString(16).padStart(6, '0') : t.colour,
          accentColour: teamPreset.accentColor ? '#' + teamPreset.accentColor.toString(16).padStart(6, '0') : t.accent || '#ffffff',
          teamPreset,
          pacePct: t.sim_pace_pct || 0,
          driverPct: Math.sin(d.no * 97) * 0.15,
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

        // Create base car group
        const carRoot = new THREE.Group();
        carRoot.name = `AI_Car_${carData.no}_${carData.teamSlug}`;

        // Build authentic 18" wheels with Pirelli P Zero markings
        const wheelData = this.buildPirelliWheels(carRoot, carData);
        carData.steerPivots = wheelData.steerPivots;
        carData.wheelRollers = wheelData.wheelRollers;

        // Build driver helmet seated in cockpit
        this.buildCockpitDriver(carRoot, carData);

        carData.mesh = carRoot;
        this.group.add(carRoot);
        this.cars.push(carData);
      });
    });

    console.info(`[AiCarManager] Initialized ${this.cars.length} AI opponent cars on track.`);
    this.alignToGrid();
  }

  /**
   * Load the official 2026 Red Bull RB22 GLB model and clone it for every AI opponent
   */
  async loadHighFidelityRb22Model() {
    try {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.loadAsync(new URL('rb22_body.glb', BASE_MODELS).href);
      this.rb22Template = gltf.scene;
      console.info('[AiCarManager] Loaded 2026 RB22 3D mesh for AI grid. Upgrading all cars with photorealistic chassis...');

      this.cars.forEach((car) => {
        this.applyHighFidelityBody(car);
      });
    } catch (err) {
      console.warn('[AiCarManager] High-fidelity RB22 GLB load failed:', err.message);
    }
  }

  applyHighFidelityBody(carData) {
    if (!this.rb22Template || !carData.mesh) return;

    const isRedBull = carData.teamSlug === 'red-bull';
    const team = carData.teamPreset || {};

    let bodyClone;
    if (isRedBull) {
      bodyClone = this.rb22Template.clone(true);
      bodyClone.name = `Body_RB22_${carData.teamSlug}_${carData.no}`;
      bodyClone.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
    } else if (this.teamBodyTemplates[carData.teamSlug]) {
      // Re-use pre-configured and decorated template for teammates
      bodyClone = this.teamBodyTemplates[carData.teamSlug].clone(true);
      bodyClone.name = `Body_RB22_${carData.teamSlug}_${carData.no}`;
    } else {
      bodyClone = this.rb22Template.clone(true);
      bodyClone.name = `Body_RB22_${carData.teamSlug}_${carData.no}`;

      let teamPaintMat = this.teamMaterials[carData.teamSlug]?.paint;
      let teamAccentMat = this.teamMaterials[carData.teamSlug]?.accent;

      if (!teamPaintMat) {
        teamPaintMat = new THREE.MeshPhysicalMaterial({
          color: team.bodyColor ?? 0xd4001f,
          roughness: team.roughness ?? 0.32,
          metalness: team.metalness ?? 0.12,
          clearcoat: team.clearcoat ?? 0.95,
          clearcoatRoughness: team.clearcoatRoughness ?? 0.06,
          side: THREE.DoubleSide,
        });

        addCarbonSplit(teamPaintMat, {
          splitY: 1.45,
          stripeColor: team.stripeColor ?? team.accentColor ?? 0xffe500,
          stripeWidth: 0.08,
          camo: team.camo ?? 0.0,
        });

        teamAccentMat = new THREE.MeshStandardMaterial({
          color: team.accentColor ?? 0xffe500,
          roughness: 0.35,
          metalness: 0.25,
          side: THREE.DoubleSide,
        });

        this.teamMaterials[carData.teamSlug] = { paint: teamPaintMat, accent: teamAccentMat };
      }

      bodyClone.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          const mname = (o.material?.name || '').replace(/\.\d+$/, '');

          if (mname === 'redbull_paint') {
            o.material = teamPaintMat;
          } else if (mname === 'redbull_color') {
            o.material = teamAccentMat;
          } else if (mname === 'redbull_decals' || mname === 'redbull_number_3') {
            // Hide Red Bull specific sponsor decals on rival cars
            o.visible = false;
          }
        }
      });

      // Build and apply team livery decals on rival cars
      this.buildAiTeamDecals(bodyClone, carData.teamPreset);

      // Cache template for teammate car
      this.teamBodyTemplates[carData.teamSlug] = bodyClone.clone(true);
    }

    carData.mesh.add(bodyClone);
    carData.highFidelityBody = bodyClone;
    this.poseCarOnTrack(carData);
  }

  buildAiTeamDecals(bodyClone, teamPreset) {
    const data = teamPreset?.livery;
    if (!data || !data.decals || data.bespokeDecals) return;

    bodyClone.updateMatrixWorld(true);
    const worldToCar = bodyClone.matrixWorld.clone().invert();

    const findPaintMesh = (parentName) => {
      let found = null;
      const grp = bodyClone.getObjectByName(parentName);
      if (grp) {
        grp.traverse((o) => {
          if (!found && o.isMesh && (o.material?.name || '').startsWith('redbull_paint')) {
            found = o;
          }
        });
        if (!found) {
          grp.traverse((o) => {
            if (!found && o.isMesh) found = o;
          });
        }
      }
      return found;
    };

    const targetMeshes = {
      tub: findPaintMesh('Body_RB22_Chassis_Tub'),
      nose: findPaintMesh('Body_RB22_Nose'),
      engineCover: findPaintMesh('Body_RB22_EngineCover_Airbox'),
      sidepodL: findPaintMesh('Body_RB22_Sidepod_LH'),
      sidepodR: findPaintMesh('Body_RB22_Sidepod_RH'),
      frontEndplateL: findPaintMesh('Body_RB22_FrontWing_LH'),
      frontEndplateR: findPaintMesh('Body_RB22_FrontWing_RH'),
    };

    const targetFor = (t, s) => {
      if (t === 'sidepod' || t === 'sidepodRidge') return s > 0 ? targetMeshes.sidepodR : targetMeshes.sidepodL;
      if (t === 'frontEndplate') return s > 0 ? targetMeshes.frontEndplateR : targetMeshes.frontEndplateL;
      return targetMeshes[t] || null;
    };

    const raycaster = new THREE.Raycaster();
    const sides = [1, -1];

    (data.decals || []).forEach((spec, i) => {
      const faceSides = spec.face === 'top' && spec.target !== 'sidepod' ? [1] : sides;
      faceSides.forEach((s) => {
        const mesh = targetFor(spec.target, s);
        if (!mesh) return;

        mesh.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(mesh).applyMatrix4(worldToCar);
        const L = b.max.x - b.min.x;
        const H = b.max.z - b.min.z;
        const Wy = b.max.y - b.min.y;

        const frontIsLeft = s < 0;
        const { texture, aspect } = createTeamDecalTexture(spec, { frontIsLeft });
        if (!texture) return;

        let origin, dir, up, w, h;
        if (spec.face === 'top') {
          const span = spec.target === 'rearWingMain' ? Wy : L;
          w = span * spec.w;
          h = spec.h ? span * spec.h : w / (aspect || 4);
          const yc = spec.target === 'sidepod' ? (b.min.y + b.max.y) / 2 : 0;
          origin = [b.min.x + L * spec.x, yc, b.max.z + 5];
          dir = [0, 0, -1];
          up = spec.target === 'sidepod' ? [0, -s, 0] : (spec.target === 'nose' ? [1, 0, 0] : [-1, 0, 0]);
        } else {
          w = L * spec.w;
          h = spec.h ? H * spec.h : w / (aspect || 4);
          let zf = spec.z ?? 0.5;
          origin = [b.min.x + L * spec.x, s * (Math.max(Math.abs(b.min.y), Math.abs(b.max.y)) + 5), b.min.z + H * zf];
          dir = [0, -s, 0];
          up = [0, 0, 1];
        }

        const rayStart = new THREE.Vector3(...origin).applyMatrix4(bodyClone.matrixWorld);
        const rayDir = new THREE.Vector3(...dir).transformDirection(bodyClone.matrixWorld).normalize();
        raycaster.set(rayStart, rayDir);
        raycaster.far = 200;
        const hit = raycaster.intersectObject(mesh, false)[0];
        if (!hit) return;

        const zAxis = rayDir.clone().negate();
        const upW = new THREE.Vector3(...up).transformDirection(bodyClone.matrixWorld).normalize();
        const xAxis = new THREE.Vector3().crossVectors(upW, zAxis).normalize();
        const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
        const rotMat = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
        const rot = new THREE.Euler().setFromRotationMatrix(rotMat);

        const geo = new DecalGeometry(mesh, hit.point, rot, new THREE.Vector3(w, h, 1.2));
        if (!geo.attributes.position || geo.attributes.position.count === 0) {
          geo.dispose();
          return;
        }

        geo.applyMatrix4(mesh.matrixWorld.clone().invert());
        const decalMat = new THREE.MeshPhysicalMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -6,
          polygonOffsetUnits: -10,
          roughness: 0.45,
          metalness: 0.0,
          clearcoat: 0.4,
          side: THREE.FrontSide,
        });

        const decalMesh = new THREE.Mesh(geo, decalMat);
        decalMesh.name = `AI_Decal_${spec.kind}_${i}_${s > 0 ? 'R' : 'L'}`;
        decalMesh.renderOrder = spec.kind === 'panel' ? 1 : 3;
        mesh.add(decalMesh);
      });
    });
  }

  buildPirelliWheels(carRoot, carData) {
    const steerPivots = [];
    const wheelRollers = [];

    // Yellow Pirelli P Zero compound color & rubber
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.82,
      metalness: 0.1,
    });

    const sidewallBandMat = new THREE.MeshBasicMaterial({
      color: 0xf5c400, // Pirelli Yellow medium
    });

    const wheelCoverMat = new THREE.MeshStandardMaterial({
      color: 0x1d2127,
      roughness: 0.35,
      metalness: 0.75,
    });

    const nutMat = new THREE.MeshStandardMaterial({
      color: 0xe6d200,
      roughness: 0.3,
      metalness: 0.8,
    });

    // In CAD frame: X longitudinal (0=front axle, 34=rear axle), Y lateral (left=+Y, right=-Y), Z vertical (ground=0, axle=3.55)
    const corners = [
      { name: 'FL', x: 0.0, y: 7.8, z: 3.55, isFront: true, isLeft: true },
      { name: 'FR', x: 0.0, y: -7.8, z: 3.55, isFront: true, isLeft: false },
      { name: 'RL', x: 34.0, y: 7.4, z: 3.55, isFront: false, isLeft: true },
      { name: 'RR', x: 34.0, y: -7.4, z: 3.55, isFront: false, isLeft: false },
    ];

    corners.forEach((c) => {
      const pivot = new THREE.Group();
      pivot.name = `Pivot_${c.name}`;
      pivot.position.set(c.x, c.y, c.z);

      const roller = new THREE.Group();
      roller.name = `Roller_${c.name}`;

      const tGeo = c.isFront ? this.wheelGeos.frontTyre : this.wheelGeos.rearTyre;
      const tyreMesh = new THREE.Mesh(tGeo, rubberMat);

      const coverGeo = c.isLeft ? this.wheelGeos.coverLeftGeo : this.wheelGeos.coverRightGeo;
      const coverMesh = new THREE.Mesh(coverGeo, wheelCoverMat);
      const halfW = (c.isFront ? 2.80 : 3.75) * 0.5;
      const outSign = c.isLeft ? 1 : -1;
      coverMesh.position.y = outSign * (halfW + 0.01);

      const bandGeo = c.isLeft ? this.wheelGeos.bandLeftGeo : this.wheelGeos.bandRightGeo;
      const bandMesh = new THREE.Mesh(bandGeo, sidewallBandMat);
      bandMesh.position.y = outSign * (halfW + 0.02);

      const nutGeo = c.isLeft ? this.wheelGeos.nutLeftGeo : this.wheelGeos.nutRightGeo;
      const nutMesh = new THREE.Mesh(nutGeo, nutMat);
      nutMesh.position.y = outSign * halfW;

      roller.add(tyreMesh, coverMesh, bandMesh, nutMesh);
      pivot.add(roller);
      carRoot.add(pivot);

      wheelRollers.push(roller);
      if (c.isFront) steerPivots.push(pivot);
    });

    return { steerPivots, wheelRollers };
  }

  buildCockpitDriver(carRoot, carData) {
    const driverGroup = new THREE.Group();
    driverGroup.name = 'Driver_Cockpit';

    const helmetColours = carData.teamPreset?.driverHelmetColours || {
      base: carData.colour,
      crown: '#ffffff',
      stripe: carData.accentColour,
    };

    const helmetMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(helmetColours.base),
      roughness: 0.28,
      metalness: 0.2,
    });

    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x111115,
      roughness: 0.08,
      metalness: 0.95,
      clearcoat: 1.0,
      reflectivity: 1.0,
    });

    // Helmet dome (X longitudinal, Y lateral, Z vertical)
    const domeGeo = new THREE.SphereGeometry(1.4, 20, 16);
    domeGeo.scale(1.0, 0.95, 1.1);
    const dome = new THREE.Mesh(domeGeo, helmetMat);

    // Visor strip facing forward (-X)
    const visorGeo = new THREE.CylinderGeometry(1.42, 1.42, 0.5, 16, 1, false, -Math.PI / 3, (2 * Math.PI) / 3);
    visorGeo.rotateZ(Math.PI / 2);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(-0.3, 0, 0.15);

    driverGroup.add(dome, visor);
    // Position inside cockpit behind steering wheel (x=13.8, y=0, z=6.4)
    driverGroup.position.set(13.8, 0, 6.4);
    carRoot.add(driverGroup);
  }

  /**
   * Set starting grid positions (2-by-2 staggered FIA grid) matching painted boxes
   */
  alignToGrid(startingOrder = null) {
    const list = startingOrder || [
      { id: 'player', no: 3 },
      ...this.cars.map((c) => ({ id: c.id, no: c.no })),
    ];

    const poleSide = this.circuit?.data?.meta?.pole_side === 'right' ? -1 : 1;
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

      // 4. Spin wheels along local Y axle
      const wheelTravel = (car.v * dt) / WHEEL_R;
      car.wheelRot += wheelTravel;
      car.wheelRollers.forEach((roller) => {
        roller.rotation.y = -car.wheelRot;
      });

      // 5. Front steering angle around vertical Z kingpin
      const steerRad = Math.atan2(car.latOffset, 15);
      car.steerPivots.forEach((pivot) => {
        pivot.rotation.z = -steerRad;
      });
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
    tmp.u.set(Lf.normX || 0, Lf.normY || 1, Lf.normZ || 0).normalize();
    tmp.r.crossVectors(tmp.f, tmp.u).normalize();
    tmp.u.crossVectors(tmp.r, tmp.f).normalize();
    tmp.m.makeBasis(tmp.f.clone().negate(), tmp.r, tmp.u);

    car.mesh.quaternion.setFromRotationMatrix(tmp.m);
    car.mesh.position.set(frontX * DM, Lf.y * DM, frontZ * DM);
  }
}
