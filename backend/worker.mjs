// Anonymous intake only. No public listing, moderation or execution of submitted data.
const ORIGIN='https://rafagarces.github.io';
const COLORS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34'];
export function normalize(x){
 if(!x||x.v!==1||!['wall','door','window'].includes(x.kind)||!['pencil','wax'].includes(x.material)||!Array.isArray(x.strokes)||x.strokes.length<1||x.strokes.length>45)throw Error('format');
 let total=0;
 const strokes=x.strokes.map(s=>{
  if(!s||!COLORS.includes(s.color)||![1,2,3].includes(s.width)||!Array.isArray(s.points)||s.points.length<1||s.points.length>160)throw Error('stroke');
  total+=s.points.length;if(total>1600)throw Error('points');
  return {color:s.color,width:s.width,points:s.points.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100))throw Error('point');return p.map(n=>Math.round(n*10)/10)})};
 });
 return {v:1,kind:x.kind,material:x.material,strokes};
}
export default {async fetch(req,env){
 const headers={'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const reply=(body,status=200)=>Response.json(body,{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
 if(new URL(req.url).pathname!=='/submit'||req.method!=='POST')return reply({error:'not_found'},404);
 if(req.headers.get('Origin')!==ORIGIN)return reply({error:'origin'},403);
 if(!req.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'type'},415);
 if(Number(req.headers.get('Content-Length')||0)>32000)return reply({error:'size'},413);
 try{
  // Bounded streaming read, including chunked input.
  let size=0,parts=[];const reader=req.body?.getReader();if(!reader)return reply({error:'empty'},400);
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32000){await reader.cancel();return reply({error:'size'},413)}parts.push(value)}
  const buf=new Uint8Array(size);let i=0;for(const p of parts){buf.set(p,i);i+=p.length}
  const data=JSON.parse(new TextDecoder().decode(buf));
  if(data.website||data.consent!==true)return reply({error:'consent'},400);
  const piece=normalize(data.piece),json=JSON.stringify(piece),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json));
  const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const existing=await env.DB.prepare('SELECT id FROM pieces WHERE hash=?').bind(hash).first();
  if(existing)return reply({id:existing.id,status:'pending'},200);
  const id=crypto.randomUUID(),now=Date.now(),day=new Date(now).toISOString().slice(0,10);
  // One atomic INSERT guards both caps under concurrent requests. No IP/name/email stored.
  const r=await env.DB.prepare(`INSERT INTO pieces (id,hash,body,created,day) SELECT ?,?,?,?,? WHERE (SELECT n FROM intake_queue WHERE id=1)<600 AND COALESCE((SELECT n FROM intake_days WHERE day=?),0)<60`).bind(id,hash,json,now,day,day).run();
  if(!r.meta.changes)return reply({error:'capacity'},429);
  return reply({id,status:'pending'},201);
 }catch(e){if(e.message?.includes('format')||e.message?.includes('stroke')||e.message?.includes('point')||e instanceof SyntaxError)return reply({error:'invalid'},400);return reply({error:'unavailable'},503)}
}};
