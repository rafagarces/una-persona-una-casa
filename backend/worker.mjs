// Anonymous intake only. No public listing, moderation or execution of submitted data.
const ORIGIN='https://rafagarces.github.io';
const PAPERS=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a'];
const INKS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34'];
// Cutout pieces only (v2). The retired stroke format (v1) is rejected, never converted.
export function normalize(x){
 if(!x||x.v!==2||!['wall','door','window','roof'].includes(x.kind)||!PAPERS.includes(x.color)||!['pencil','wax'].includes(x.material))throw Error('format');
 const pts=(a,min,max,what)=>{if(!Array.isArray(a)||a.length<min||a.length>max)throw Error(what);return a.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100))throw Error('point');return p.map(n=>Math.round(n*10)/10)})};
 const outline=pts(x.outline,3,160,'outline');
 // Same degenerate-contour guard as the editor: one closed ring with real area (nonzero fill semantics).
 let area=0;for(let i=0,j=outline.length-1;i<outline.length;j=i++)area+=outline[j][0]*outline[i][1]-outline[i][0]*outline[j][1];
 const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
 if(Math.abs(area/2)<15||Math.max(...xs)-Math.min(...xs)<4||Math.max(...ys)-Math.min(...ys)<4)throw Error('degenerate');
 if(x.marks==null)x.marks=[];
 if(!Array.isArray(x.marks)||x.marks.length>12)throw Error('marks');
 let total=0;
 const marks=x.marks.map(s=>{
  if(!s||!INKS.includes(s.color)||![1,2,3].includes(s.width))throw Error('stroke');
  const sp=pts(s.points,1,60,'points');total+=sp.length;if(total>400)throw Error('points');
  return {color:s.color,width:s.width,points:sp};
 });
 return {v:2,kind:x.kind,color:x.color,material:x.material,outline,marks};
}
// Whole-house proposals (v1): the visitor's own composed house, pinned to a render version and seed.
export function normalizeHouse(x){
 if(!x||x.v!==1||![1,2].includes(x.rv)||!Number.isInteger(x.seed)||x.seed<0||x.seed>4294967295)throw Error('format');
 const out={v:1,rv:x.rv,seed:x.seed};
 for(const k of ['wall','door','roof']){
  if(x[k]==null)continue;
  const p=normalize(x[k]);if(p.kind!==k)throw Error('format');
  out[k]=p;
 }
 if(x.windows==null)x.windows=[];
 if(!Array.isArray(x.windows)||x.windows.length>4)throw Error('format');
 out.windows=x.windows.map(w=>{const p=normalize(w);if(p.kind!=='window')throw Error('format');return p});
 if(!out.wall&&!out.door&&!out.roof&&!out.windows.length)throw Error('format');
 return out;
}
export default {async fetch(req,env){
 const headers={'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 const path=new URL(req.url).pathname;
 if((path!=='/submit'&&path!=='/submit-house')||req.method!=='POST')return reply({error:'not_found'},404);
 if(req.headers.get('Origin')!==ORIGIN)return reply({error:'origin'},403);
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'type'},415);
 const cap=path==='/submit-house'?96000:32000;
 if(Number(req.headers.get('Content-Length')||0)>cap)return reply({error:'size'},413);
 try{
  // Bounded streaming read, including chunked input.
  let size=0,parts=[];const reader=req.body?.getReader();if(!reader)return reply({error:'empty'},400);
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>cap){await reader.cancel();return reply({error:'size'},413)}parts.push(value)}
  const buf=new Uint8Array(size);let i=0;for(const p of parts){buf.set(p,i);i+=p.length}
  const data=JSON.parse(new TextDecoder().decode(buf));
  // Bounded compatibility for pre-audit tabs until 2026-11-11 00:00 UTC.
  // Neither field is proof of consent or a security boundary.
  const legacyAction=data.action===undefined&&data.consent===true&&Date.now()<1794355200000;
  if(data.website||(data.action!=='propose-for-review'&&!legacyAction))return reply({error:'action'},400);
  const table=path==='/submit-house'?'houses':'pieces';
  const item=path==='/submit-house'?normalizeHouse(data.house):normalize(data.piece),json=JSON.stringify(item),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));
  const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const existing=await env.DB.prepare(`SELECT id FROM ${table} WHERE hash=?`).bind(hash).first();
  if(existing)return reply({id:existing.id,status:'pending'},200);
  const id=crypto.randomUUID(),now=Date.now(),day=new Date(now).toISOString().slice(0,10);
  // One atomic INSERT guards both caps under concurrent requests. No IP/name/email stored.
  // Pieces and houses share the same intake_queue/intake_days counters: one hard total.
  const r=await env.DB.prepare(`INSERT INTO ${table} (id,hash,body,created,day) SELECT ?,?,?,?,? WHERE (SELECT n FROM intake_queue WHERE id=1)<600 AND COALESCE((SELECT n FROM intake_days WHERE day=?),0)<60`).bind(id,hash,json,now,day,day).run();
  if(!r.meta.changes)return reply({error:'capacity'},429);
  return reply({id,status:'pending'},201);
 }catch(e){if(e.message?.includes('format')||e.message?.includes('stroke')||e.message?.includes('point')||e.message?.includes('outline')||e.message?.includes('marks')||e.message?.includes('degenerate')||e instanceof SyntaxError)return reply({error:'invalid'},400);return reply({error:'unavailable'},503)}
}};
