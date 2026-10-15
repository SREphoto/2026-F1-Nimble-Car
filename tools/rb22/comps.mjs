import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
export const T=(v)=>[(1.701-v[1])*10,-v[0]*10,-v[2]*10+0.38];
export async function load(){const doc=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read('/workspace/f1-refs-body/rb22/source/untitled.glb');return doc;}
export function components(p){const a=p.getAttribute('POSITION');const n=a.getCount();const par=new Int32Array(n).map((_,i)=>i);
const f=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};const u=(x,y)=>{x=f(x);y=f(y);if(x!==y)par[x]=y;};
const map=new Map();const v=[];for(let k=0;k<n;k++){a.getElement(k,v);const key=v.map(x=>Math.round(x*1e4)).join(',');if(map.has(key))u(k,map.get(key));else map.set(key,k);}
const idx=p.getIndices().getArray();for(let t=0;t<idx.length;t+=3){u(idx[t],idx[t+1]);u(idx[t],idx[t+2]);}
const comps=new Map();for(let t=0;t<idx.length;t+=3){const r=f(idx[t]);if(!comps.has(r))comps.set(r,{tris:[],mn:[1e9,1e9,1e9],mx:[-1e9,-1e9,-1e9]});const c=comps.get(r);c.tris.push(t/3);for(let j=0;j<3;j++){a.getElement(idx[t+j],v);const w=T(v);for(let d=0;d<3;d++){c.mn[d]=Math.min(c.mn[d],w[d]);c.mx[d]=Math.max(c.mx[d],w[d]);}}}
return [...comps.values()];}
if(process.argv[1].endsWith("comps.mjs")&&process.argv[2]){const doc=await load();const ps=doc.getRoot().listMeshes()[0].listPrimitives();const i=+process.argv[2];const cs=components(ps[i]).sort((a,b)=>b.tris.length-a.tris.length);
console.log('prim',i,ps[i].getMaterial().getName(),'comps',cs.length);for(const c of cs.slice(0,+process.argv[3]||40))console.log(c.tris.length,c.mn.map(x=>x.toFixed(1)).join(','),'|',c.mx.map(x=>x.toFixed(1)).join(','));}
