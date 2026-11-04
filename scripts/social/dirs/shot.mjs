import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium; try { ({chromium}=require('playwright')) } catch { ({chromium}=require(execFileSync('npm',['root','-g']).toString().trim()+'/playwright')) }
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1080,height:1350}});
for (const n of ['A1','A2','A3','B1','B2','B3','C1','C2','C3']) {
  await p.goto('file://'+path.resolve(n+'.html')); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(200);
  await p.screenshot({path:n+'.jpg',type:'jpeg',quality:90}); 
}
await b.close();
