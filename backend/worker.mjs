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
 // Scissor holes (rv6): optional interior rings, rendered with fill-rule evenodd. Same editor limits.
 let holes;
 if(x.holes!=null){
  if(!Array.isArray(x.holes)||x.holes.length>6)throw Error('holes');
  let hp=0;
  holes=x.holes.map(h=>{const o=pts(h,3,60,'outline');hp+=o.length;if(hp>200)throw Error('holes');let a=0;for(let i=0,j=o.length-1;i<o.length;j=i++)a+=o[j][0]*o[i][1]-o[i][0]*o[j][1];if(Math.abs(a/2)<2)throw Error('degenerate');return o});
 }
 if(x.marks==null)x.marks=[];
 if(!Array.isArray(x.marks)||x.marks.length>12)throw Error('marks');
 let total=0;
 const marks=x.marks.map(s=>{
  if(!s||!INKS.includes(s.color)||![1,2,3].includes(s.width))throw Error('stroke');
  const sp=pts(s.points,1,60,'points');total+=sp.length;if(total>400)throw Error('points');
  return {color:s.color,width:s.width,points:sp};
 });
 const out={v:2,kind:x.kind,color:x.color,material:x.material,outline,marks};
 if(holes&&holes.length)out.holes=holes;
 return out;
}
// Whole-house proposals (v1): the visitor's own composed house, pinned to a render version and seed.
const WAXES=PAPERS,GRAPHITE='#3a3940';
// Freehand pencil/wax strokes drawn over a finished rv5 house (rv4 stays frozen and never carries ink): closed palettes, bounded counts, geometry only.
export function normalizeInk(a){
 if(!Array.isArray(a)||a.length>40)throw Error('format');let total=0;
 return a.map(s=>{
  if(!s||!(s.k==='p'&&s.c===GRAPHITE||s.k==='w'&&WAXES.includes(s.c))||!Array.isArray(s.pts)||s.pts.length<2||s.pts.length>120)throw Error('format');
  total+=s.pts.length;if(total>1600)throw Error('format');
  return {k:s.k,c:s.c,pts:s.pts.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100))throw Error('point');return p.map(n=>Math.round(n*10)/10)})};
 });
}
export function normalizeHouse(x){
 if(x&&(x.rv===4||x.rv===5||x.rv===6)){
  if(x.v!==1||!Number.isInteger(x.seed)||x.seed<0||x.seed>4294967295||!Array.isArray(x.layers)||x.layers.length>4)throw Error('format');
  const out={v:1,rv:x.rv,seed:x.seed};
  // Optional page color chosen at draw time (rv6): a hex color kept with the work so the
  // background survives publication instead of depending on CSS or the seed alone.
  if(x.bg!=null){if(x.rv!==6||typeof x.bg!=='string'||!/^#[0-9a-f]{6}$/i.test(x.bg))throw Error('format');out.bg=x.bg.toLowerCase()}
  if(x.base!=null){if(x.base.rv!==2||x.base.base!=null||x.base.seed!==x.seed)throw Error('format');const legacy=normalizeHouse({v:1,rv:3,seed:x.seed,base:x.base,tints:x.tints,omit:x.omit,windows:[]});out.base=legacy.base;if(legacy.tints)out.tints=legacy.tints;if(legacy.omit)out.omit=legacy.omit}
  else if(x.tints!=null||x.omit!=null)throw Error('format');
  let count=0;const seen=new Set();
  out.layers=x.layers.map(l=>{if(!l||!['wall','door','roof','window'].includes(l.kind)||seen.has(l.kind)||!Array.isArray(l.pieces)||!l.pieces.length||(count+=l.pieces.length)>24)throw Error('format');seen.add(l.kind);return {kind:l.kind,pieces:l.pieces.map(p=>{const q=normalize(p);if(q.kind!==l.kind)throw Error('format');if(q.holes&&x.rv!==6)throw Error('format');return q})}});
  if(!out.base&&!count)throw Error('format');if((x.rv===5||x.rv===6)&&x.ink!=null){const ink=normalizeInk(x.ink);if(ink.length)out.ink=ink}return out;
 }
 if(!x||x.v!==1||![1,2,3].includes(x.rv)||!Number.isInteger(x.seed)||x.seed<0||x.seed>4294967295)throw Error('format');
 const out={v:1,rv:x.rv,seed:x.seed};
 if(x.base!=null){if(x.rv!==3||x.base.rv!==2||x.base.base!=null||x.base.seed!==x.seed)throw Error('format');out.base=normalizeHouse(x.base)}
 if(x.tints!=null){
  if(x.rv!==3||!out.base||typeof x.tints!=='object'||Array.isArray(x.tints))throw Error('format');out.tints={};
  if(Object.keys(x.tints).some(k=>!['wall','door','roof','windows'].includes(k)))throw Error('format');
  for(const k of ['wall','door','roof'])if(x.tints[k]!=null){if(!out.base[k]||!PAPERS.includes(x.tints[k]))throw Error('format');out.tints[k]=x.tints[k]}
  if(x.tints.windows!=null){if(!Array.isArray(x.tints.windows)||x.tints.windows.length>out.base.windows.length||!x.tints.windows.every(c=>c==null||PAPERS.includes(c)))throw Error('format');out.tints.windows=x.tints.windows.map(c=>c??null)}
 }
 if(x.omit!=null){if(x.rv!==3||!Array.isArray(x.omit)||x.omit.length>4||new Set(x.omit).size!==x.omit.length||!x.omit.every(k=>['wall','door','roof','window'].includes(k)))throw Error('format');out.omit=x.omit.slice()}
 for(const k of ['wall','door','roof']){
  if(x[k]==null)continue;
  const p=normalize(x[k]);if(p.kind!==k)throw Error('format');
  out[k]=p;
 }
 if(x.windows==null)x.windows=[];
 if(!Array.isArray(x.windows)||x.windows.length>4)throw Error('format');
 out.windows=x.windows.map(w=>{const p=normalize(w);if(p.kind!=='window')throw Error('format');return p});
 if(!out.base&&!out.wall&&!out.door&&!out.roof&&!out.windows.length)throw Error('format');
 return out;
}
export default {async fetch(req,env){
 const headers={'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 const path=new URL(req.url).pathname;
 if(path==='/gallery'&&req.method==='GET'){
  try{const u=new URL(req.url),cursor=Number(u.searchParams.get('before')||'9007199254740991'),after=u.searchParams.get('id')||'';
   if(!Number.isSafeInteger(cursor)||cursor<0||after.length>36)return reply({error:'invalid'},400);
   const rows=(await env.DB.prepare('SELECT id,body,created FROM public_houses WHERE created<? OR (created=? AND id<?) ORDER BY created DESC,id DESC LIMIT 30').bind(cursor,cursor,after||'~').all()).results;
   return reply({houses:rows.map(r=>({...JSON.parse(r.body),id:r.id})),next:rows.length===30?{before:rows[29].created,id:rows[29].id}:null});
  }catch(e){return reply({error:'unavailable'},503)}
 }
 if((path!=='/submit'&&path!=='/submit-house'&&path!=='/publish-house')||req.method!=='POST')return reply({error:'not_found'},404);
 if(req.headers.get('Origin')!==ORIGIN)return reply({error:'origin'},403);
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'type'},415);
 const cap=path==='/submit'?32000:96000;
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
  if(data.website||(path==='/publish-house'?data.action!=='publish':(data.action!=='propose-for-review'&&!legacyAction)))return reply({error:'action'},400);
  const direct=path==='/publish-house',table=direct?'public_houses':path==='/submit-house'?'houses':'pieces';
  const item=path==='/submit'?normalize(data.piece):normalizeHouse(data.house),json=JSON.stringify(item),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));
  const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const existing=await env.DB.prepare(`SELECT id FROM ${table} WHERE hash=?`).bind(hash).first();
  if(existing)return reply({id:existing.id,status:direct?'published':'pending'},200);
  const id=crypto.randomUUID(),now=Date.now(),day=new Date(now).toISOString().slice(0,10);
  // One atomic INSERT guards both caps under concurrent requests. No IP/name/email stored.
  // Pieces and houses share the same intake_queue/intake_days counters: one hard total.
  const r=await env.DB.prepare(`INSERT INTO ${table} (id,hash,body,created,day) SELECT ?,?,?,?,? WHERE (SELECT n FROM intake_queue WHERE id=1)<600 AND COALESCE((SELECT n FROM intake_days WHERE day=?),0)<60`).bind(id,hash,json,now,day,day).run();
  if(!r.meta.changes)return reply({error:'capacity'},429);
  return reply({id,status:direct?'published':'pending'},201);
 }catch(e){if(e.message?.includes('format')||e.message?.includes('stroke')||e.message?.includes('point')||e.message?.includes('outline')||e.message?.includes('marks')||e.message?.includes('holes')||e.message?.includes('degenerate')||e instanceof SyntaxError)return reply({error:'invalid'},400);return reply({error:'unavailable'},503)}
}};
