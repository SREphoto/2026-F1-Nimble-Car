import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { load, components, T } from './comps.mjs';
const DEBUG=process.argv.includes('--debug');
const CUT=2.0, TCUT=38.3; // dm: body starts here, a lofted collar (cad/rb22_body.js) joins it to our nose
const doc=await load(); const root=doc.getRoot(); const buf=root.listBuffers()[0];
const mesh0=root.listMeshes()[0]; const prims=mesh0.listPrimitives();
const DROP_PRIM=new Set([12,13,14,15,16,17,19,20,21,22,23,24,25,26]);
const MIRROR_PRIM=new Set([2,4,10]); const DECAL_PRIM=new Set([8,11]);
const parts=new Map(); // name -> [{prim, tris:[]}]
const stats={};
function add(name,pi,t){if(!parts.has(name))parts.set(name,new Map());const m=parts.get(name);if(!m.has(pi))m.set(pi,[]);m.get(pi).push(t);stats[name]=(stats[name]||0)+1;}
for(let pi=0;pi<prims.length;pi++){
  if(DROP_PRIM.has(pi)) continue;
  const p=prims[pi]; const a=p.getAttribute('POSITION'); const idx=p.getIndices().getArray(); const v=[];
  const comps=components(p);
  for(const c of comps){
    const sx=c.mx[0]-c.mn[0], sy=c.mx[1]-c.mn[1], sz=c.mx[2]-c.mn[2];
    const maxAY=Math.max(Math.abs(c.mn[1]),Math.abs(c.mx[1])), minAY=(c.mn[1]>0)?c.mn[1]:(c.mx[1]<0?-c.mx[1]:0);
    const nearAxle=(x)=>(x>-4.5&&x<6.5)||(x>29&&x<39.5);
    // whole-component drops
    let compDrop=null;
    if(c.mx[0]<CUT) compDrop='nose';
    else if(c.mn[0]>35.0 && c.mx[2]>4.0 && maxAY>2.6) compDrop='rearwing';
    else if(c.mn[0]>35.0 && c.mn[2]>6.0) compDrop='rearwing';
    else if(c.mn[0]>TCUT) compDrop='tailbeyond';
    else if(nearAxle((c.mn[0]+c.mx[0])/2) && maxAY>5.2 && minAY<4.5 && c.mn[2]>1.0 && sx<7 && sz<5 && c.tris.length<4000 && !(c.mx[0]-c.mn[0]>20)) compDrop='suspension';
    else if(nearAxle((c.mn[0]+c.mx[0])/2) && minAY>4.6 && c.mn[2]>0.4 && sx<8 && c.tris.length<4000) compDrop='wheelcorner';
    for(const t of c.tris){
      const w=[0,0,0];let mxX=-1e9;for(let j=0;j<3;j++){a.getElement(idx[t*3+j],v);const q=T(v);mxX=Math.max(mxX,q[0]);w[0]+=q[0]/3;w[1]+=q[1]/3;w[2]+=q[2]/3;}
      if(mxX<CUT && (!compDrop||compDrop==='nose')){const ay0=Math.abs(w[1]);const cx0=w[0],cz0=w[2];add((!MIRROR_PRIM.has(pi)&&!DECAL_PRIM.has(pi)&&(ay0<2.1&&(cx0>=-4.2?cz0>1.0:cz0>2.45)))?'Body_RB22_Nose':(DECAL_PRIM.has(pi)&&ay0<2.1&&cz0>2.45?'Body_RB22_BakedDecals':'nose'),pi,t);continue;}
      w[0]=Math.max(w[0],CUT+0.01);
      const [cx,cy,cz]=w; const ay=Math.abs(cy);
      let part=compDrop;
      if(!part){
        if(cx>35.2 && cz>5.6) part='rearwing';
        else if(cx>TCUT) part='tailbeyond';
        else if(MIRROR_PRIM.has(pi)) part='Body_RB22_Mirrors';
        else if(DECAL_PRIM.has(pi)) part='Body_RB22_BakedDecals';
        else if(cz<1.25 || (ay>4.7 && cz<2.7 && cx<30)) part= cx>28.5?'Body_RB22_Diffuser':'Body_RB22_Floor';
        else if(cx>28.5 && cz<3.0 && ay>1.2) part='Body_RB22_Diffuser';
        else if(cz>7.5 && cx>5 && cx<16.6) part='Body_RB22_Halo';
        else if(ay>2.45 && cx>8.5 && cx<31.5) part= cy>0?'Body_RB22_Sidepod_LH':'Body_RB22_Sidepod_RH';
        else if(cx>=31.5) part='Body_RB22_Tail';
        else if(cx>=16.4) part='Body_RB22_EngineCover_Airbox';
        else part='Body_RB22_Chassis_Tub';
      }
      add(part,pi,t);
    }
  }
}
console.log(stats);
// Build output doc
const out=new Document(); const ob=out.createBuffer(); const scene=out.createScene('RB22_Body'); const rootNode=out.createNode('Body_RB22_Shell'); scene.addChild(rootNode);
const matMap=new Map(); const texMap=new Map();
const cloneTex=(t)=>{if(!t)return null;if(texMap.has(t))return texMap.get(t);const n=out.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType());texMap.set(t,n);return n;};
const DCOL={nose:[1,0,0],rearwing:[0,1,0],suspension:[1,0,1],wheelcorner:[0,1,1],tailbeyond:[1,1,0]};
function getMat(m){ if(matMap.has(m))return matMap.get(m); const n=out.createMaterial(m.getName().replace(/\.\d+$/,'')).setBaseColorFactor(m.getBaseColorFactor()).setRoughnessFactor(m.getRoughnessFactor()).setMetallicFactor(m.getMetallicFactor()).setDoubleSided(m.getDoubleSided()).setAlphaMode(m.getAlphaMode()).setAlphaCutoff(m.getAlphaCutoff());
  if(m.getBaseColorTexture()){n.setBaseColorTexture(cloneTex(m.getBaseColorTexture()));}
  if(m.getNormalTexture()){n.setNormalTexture(cloneTex(m.getNormalTexture())).setNormalScale(m.getNormalScale());}
  matMap.set(m,n);return n;}
for(const [name,byPrim] of parts){
  if(!name.startsWith('Body_') && !DEBUG) continue;
  const mesh=out.createMesh(name); 
  for(const [pi,tris] of byPrim){const p=prims[pi]; const idx=p.getIndices().getArray(); const remap=new Map(); const P=[],N=[],UV=[],I=[];
    const pa=p.getAttribute('POSITION'),na=p.getAttribute('NORMAL'),ua=p.getAttribute('TEXCOORD_0'); const v=[];
    const vert=(k)=>{let r=remap.get(k);if(r===undefined){r=P.length/3;remap.set(k,r);pa.getElement(k,v);P.push(...T(v));na.getElement(k,v);N.push(-v[1],-v[0],-v[2]);if(ua){ua.getElement(k,v);UV.push(v[0],v[1]);}else UV.push(0,0);}return r;};
    const isBody=name.startsWith('Body_');
    for(const t of tris){const ks=[idx[t*3],idx[t*3+1],idx[t*3+2]];const r=ks.map(vert);
      const xs=r.map(i=>P[i*3]);
      if(!isBody||name==='Body_RB22_Nose'||(Math.min(...xs)>=CUT&&Math.max(...xs)<=TCUT)){I.push(...r);continue;}
      const clip=(poly,inside,X)=>{const out=[];for(let j=0;j<poly.length;j++){const A=poly[j],B=poly[(j+1)%poly.length];const xa=P[A*3],xb=P[B*3];
        if(inside(xa))out.push(A);
        if(inside(xa)!==inside(xb)){const f=(X-xa)/(xb-xa);const ni=P.length/3;
          for(let d=0;d<3;d++)P.push(P[A*3+d]+f*(P[B*3+d]-P[A*3+d]));P[ni*3]=X;
          const nn=[0,1,2].map(d=>N[A*3+d]+f*(N[B*3+d]-N[A*3+d]));const l=Math.hypot(...nn)||1;N.push(...nn.map(x=>x/l));
          UV.push(UV[A*2]+f*(UV[B*2]-UV[A*2]),UV[A*2+1]+f*(UV[B*2+1]-UV[A*2+1]));out.push(ni);}}return out;};
      let poly=clip(r,x=>x>=CUT,CUT); if(poly.length>=3) poly=clip(poly,x=>x<=TCUT,TCUT);
      for(let j=1;j+1<poly.length;j++)I.push(poly[0],poly[j],poly[j+1]);}
    // winding: mapping det=+1 so keep
    const np=out.createPrimitive().setAttribute('POSITION',out.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(ob)).setAttribute('NORMAL',out.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(ob)).setIndices(out.createAccessor().setType('SCALAR').setArray(new Uint32Array(I)).setBuffer(ob));
    if(ua)np.setAttribute('TEXCOORD_0',out.createAccessor().setType('VEC2').setArray(new Float32Array(UV)).setBuffer(ob));
    if(DEBUG&&DCOL[name]){np.setMaterial(out.createMaterial(name).setBaseColorFactor([...DCOL[name],1]));}else np.setMaterial(getMat(p.getMaterial()));
    mesh.addPrimitive(np);}
  rootNode.addChild(out.createNode(name).setMesh(mesh));
}
await new NodeIO().registerExtensions(ALL_EXTENSIONS).write(process.argv[2]||'/workspace/f1-refs-body/rb22/rb22_body_raw.glb',out);
