import { chromium } from 'playwright';
const [,,url,outPrefix,...views]=process.argv;
const V={front34:[-32,14,-26, 14,3,0],rear34:[62,16,30, 18,3,0],side:[17,6,-60, 17,4,0],top:[17,70,0.01, 17,0,0],front:[-50,8,0,15,4,0],rear:[75,10,0,15,4,0],under:[17,-40,-20,17,0,0],nosejoin:[-6,9,-14, 2,4,0]};
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1280,height:800}});p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text())});p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(url);await p.waitForFunction(()=>window.READY,null,{timeout:180000});
for(const v of views){const c=V[v];
// CAD frame -> three: x=X, y=Z, z=-Y ; presets given directly in three coords
await p.evaluate(c=>window.shot(...c),c);await p.waitForTimeout(300);await p.screenshot({path:`${outPrefix}_${v}.jpg`,quality:85,type:'jpeg'});console.log('saved',v);}
await b.close();
