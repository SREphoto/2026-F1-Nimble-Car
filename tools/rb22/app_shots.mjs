import { chromium } from 'playwright';
import fs from 'fs';
const OUT=process.argv[2]||'/workspace/f1-refs-body/rb22/renders'; fs.mkdirSync(OUT,{recursive:true});
const PORT=process.env.PORT||8851; const extra=process.env.Q||'';
const V={front34:[-30,12,-26, 14,4,0],rear34:[60,15,28, 18,4,0],side:[17,5,-62, 17,4.5,0],top:[17,72,0.01,17,0,0],nosejoin:[-8,9,-15,2,4,0],tailclose:[48,9,14,32,4,0],rearlow:[52,6,0.01,36,5,0],noseside:[-2,4.5,-26,-2,4,0],nose34:[-16,8,-16,-1,3.5,0],cockpit:[4,13,-9,12,5.5,0],cockpittop:[12,26,0.01,12,5,0],fwfront:[-30,5,0.01,-5,2.5,0],fw34:[-18,8,-14,-4,2.5,0],cockpitfront:[-6,8.5,0.01,13,7,0],cockpitside:[13,7,-14,13,7,0],side:[17,5,-62,17,4.5,0],under:[14,-38,-22,14,1,0],fcorner:[-9,7,-17,0,3.5,-5],rearstraight:[78,7,0.01,30,4,0]};
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1400,height:860}});
const errs=[];p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+': '+m.text())});p.on('pageerror',e=>errs.push('PAGEERR '+e.message));
await p.addInitScript(()=>{try{localStorage.setItem('f1-intro-seen','1')}catch(e){}});
await p.goto(`http://localhost:${PORT}/index.html?${extra}`,{waitUntil:'load'});
await p.waitForFunction(()=>window.__rb22Ready,null,{timeout:240000});
console.log('rb22 ready:',await p.evaluate(()=>window.__rb22Ready));
const grab=async(name)=>{const data=await p.evaluate(()=>{const r=window.renderer;r.render(window.scene,window.camera);return r.domElement.toDataURL('image/jpeg',0.9);});fs.writeFileSync(`${OUT}/${name}.jpg`,Buffer.from(data.split(',')[1],'base64'));console.log('saved',name);};
const setCam=async(c)=>p.evaluate(c=>{const cam=window.camera,ct=window.controls;ct.autoRotate=false;cam.aspect=1400/860;cam.fov=30;cam.updateProjectionMatrix();cam.position.set(c[0],c[1],c[2]);ct.target.set(c[3],c[4],c[5]);ct.update();window.renderer.setSize(1400,860,false);},c);
const jobs=(process.env.JOBS||'red-bull:front34,rear34,side;mclaren:front34,rear34,side').split(';');
for(const j of jobs){const [team,views]=j.split(':');
  if(team==='wire'){await p.evaluate(()=>{window.setTeam('red-bull');const g=window.carModel;const rb=g.getObjectByName('Body_RB22_Assembly');const col=g.getObjectByName('Body_RB22_NoseCollar');const inRb=(o)=>{for(let q=o;q;q=q.parent){if(q===rb||q===col)return true;}return false;};g.traverse(o=>{if(o.isMesh){o.userData._m=o.material;o.material=inRb(o)?new o.material.constructor({color:0x00e5ff,wireframe:true}):new o.material.constructor({color:0x3a3d44,roughness:0.8});}});});
    for(const v of views.split(',')){await setCam(V[v]);await grab(`wire_${v}`);} 
    await p.evaluate(()=>window.carModel.traverse(o=>{if(o.userData._m){o.material=o.userData._m;delete o.userData._m;}}));continue;}
  if(team==='intro'){for(const id of views.split(',')){const [sid,u]=id.split('@');await p.evaluate(([sid,u])=>window.f1Intro.debugJumpToShot(sid,+u),[sid,u||'0.5']);await p.waitForTimeout(400);await p.evaluate(([sid,u])=>window.f1Intro.debugJumpToShot(sid,+u),[sid,u||'0.5']);await grab(`intro_${sid}`);} continue;}
  if(team.endsWith('-nodecal')){await p.evaluate(t=>{window.setTeam(t);window.carModel.traverse(o=>{if(/^Livery_Decal_Team_/.test(o.name))o.visible=false;});},team.replace('-nodecal',''));}
  else if(team.endsWith('-nopaint')){await p.evaluate(t=>{window.setTeam(t);window.carModel.traverse(o=>{if(o.isMesh&&o.material&&o.material.name==='RB22_BodyPaint'){o.material=o.material.clone();o.material.colorWrite=false;}});},team.replace('-nopaint',''));}
  else await p.evaluate(t=>window.setTeam(t),team);await p.waitForTimeout(800);
  for(const v of views.split(',')){await setCam(V[v]);await p.waitForTimeout(200);await grab(`${team}_${v}`);}
}
console.log(errs.filter(e=>!/favicon|eruda/.test(e)).slice(0,25).join('\n'));
await b.close();
