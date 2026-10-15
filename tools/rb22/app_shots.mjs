import { chromium } from 'playwright';
import fs from 'fs';
const OUT=process.argv[2]||'/workspace/f1-refs-body/rb22/renders'; fs.mkdirSync(OUT,{recursive:true});
const PORT=process.env.PORT||8851; const extra=process.env.Q||'';
const V={front34:[-30,12,-26, 14,4,0],rear34:[60,15,28, 18,4,0],side:[17,5,-62, 17,4.5,0],top:[17,72,0.01,17,0,0],nosejoin:[-8,9,-15,2,4,0],tailclose:[48,9,14,32,4,0]};
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
  if(team==='wire'){await p.evaluate(()=>{window.setTeam('red-bull');const g=window.carModel;g.traverse(o=>{if(o.isMesh&&o.visible){o.userData._m=o.material;o.material=new o.material.constructor({color:0x101010,wireframe:true});}});});
    for(const v of views.split(',')){await setCam(V[v]);await grab(`wire_${v}`);} 
    await p.evaluate(()=>window.carModel.traverse(o=>{if(o.userData._m){o.material=o.userData._m;delete o.userData._m;}}));continue;}
  if(team==='intro'){for(const id of views.split(',')){const [sid,u]=id.split('@');await p.evaluate(([sid,u])=>window.f1Intro.debugJumpToShot(sid,+u),[sid,u||'0.5']);await p.waitForTimeout(400);await p.evaluate(([sid,u])=>window.f1Intro.debugJumpToShot(sid,+u),[sid,u||'0.5']);await grab(`intro_${sid}`);} continue;}
  await p.evaluate(t=>window.setTeam(t),team);await p.waitForTimeout(800);
  for(const v of views.split(',')){await setCam(V[v]);await p.waitForTimeout(200);await grab(`${team}_${v}`);}
}
console.log(errs.filter(e=>!/favicon|eruda/.test(e)).slice(0,25).join('\n'));
await b.close();
