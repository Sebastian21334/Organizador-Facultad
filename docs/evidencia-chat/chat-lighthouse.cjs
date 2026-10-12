const runtime = require('./qa-runtime.cjs');
const fs=require('node:fs');const path=require('node:path');
(async()=>{const {default:lighthouse}=await import(runtime.moduleUrl('lighthouse'));const {default:desktopConfig}=await import(runtime.moduleUrl('lighthouse/core/config/desktop-config.js'));const {launch}=await import(runtime.moduleUrl('chrome-launcher'));const out=runtime.output;const summary=[];
await fetch('http://127.0.0.1:4301/__qa/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'normal',count:50})});
for(const [name,pathname] of [['login','/login'],['chat','/chat']])for(const device of ['mobile','desktop']){
const chrome=await launch({chromePath:runtime.chromePath,chromeFlags:['--headless','--no-sandbox']});
try{const options={port:chrome.port,output:['html','json'],onlyCategories:['performance','accessibility','best-practices','seo'],logLevel:'error',blockedUrlPatterns:['*/_vercel/*'],extraHeaders:pathname==='/chat'?{Cookie:'__Host-tempo_chat=qa-chat-token'}:undefined};if(device==='desktop')options.preset='desktop';
const result=await lighthouse('http://127.0.0.1:3001'+pathname,options,device==='desktop'?desktopConfig:undefined);const lhr=result.lhr;
for(const [index,extension] of ['html','json'].entries())fs.writeFileSync(path.join(out,`lighthouse-${name}-${device}.${extension}`),result.report[index]);
const row={page:name,device,url:lhr.finalDisplayedUrl,performance:lhr.categories.performance.score,accessibility:lhr.categories.accessibility.score,bestPractices:lhr.categories['best-practices'].score,seo:lhr.categories.seo.score,LCP:lhr.audits['largest-contentful-paint'].numericValue,CLS:lhr.audits['cumulative-layout-shift'].numericValue,TBT:lhr.audits['total-blocking-time'].numericValue,failedAccessibility:Object.values(lhr.audits).filter(a=>a.score===0&&lhr.categories.accessibility.auditRefs.some(r=>r.id===a.id)).map(a=>({id:a.id,title:a.title}))};summary.push(row);console.log(JSON.stringify(row));}finally{await chrome.kill();}}
fs.writeFileSync(path.join(out,'lighthouse-resumen.json'),JSON.stringify(summary,null,2));})();
