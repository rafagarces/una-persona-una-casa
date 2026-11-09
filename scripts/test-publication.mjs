import assert from 'node:assert/strict';
import worker from '../backend/worker.mjs';
const house={v:1,rv:4,seed:17,layers:[{kind:'wall',pieces:[{v:2,kind:'wall',color:'#b04a41',material:'pencil',outline:[[10,10],[80,10],[80,80]],marks:[]}]}]};
let saved=null,insert=0;
const env={DB:{prepare(sql){return {bind(...args){return {async first(){return sql.includes('public_houses')&&saved?{id:saved.id}:null},async all(){assert.match(sql,/FROM public_houses/);return {results:saved?[saved]:[]}},async run(){assert.match(sql,/INSERT INTO public_houses/);assert.match(sql,/intake_queue/);assert.match(sql,/intake_days/);insert++;saved={id:args[0],body:args[2],created:args[3]};return {meta:{changes:1}}}}}}}}};
const req=(action)=>new Request('https://x/publish-house',{method:'POST',headers:{Origin:'https://rafagarces.github.io','Content-Type':'application/json'},body:JSON.stringify({action,house})});
assert.equal((await worker.fetch(req('propose-for-review'),env)).status,400);
let r=await worker.fetch(req('publish'),env),out=await r.json();assert.equal(r.status,201);assert.equal(out.status,'published');
r=await worker.fetch(req('publish'),env);assert.equal(r.status,200);assert.equal(insert,1);
r=await worker.fetch(new Request('https://x/gallery'),env);out=await r.json();assert.equal(out.houses[0].rv,4);assert.equal(out.houses[0].seed,17);assert.equal(out.houses.length,1);assert.equal(out.next,null);
assert.equal((await worker.fetch(new Request('https://x/gallery?before=bad'),env)).status,400);
console.log('PASS direct publication, explicit action, dedup, public-only gallery, version, cursor validation');
// Same complete rv5 snapshot (wall + door + pencil and wax ink, unrounded numbers): editor payload -> normalize -> publish -> fresh GET keeps every field and the hash is over the normalized JSON.
{
 const piece=(kind,color,outline)=>({v:2,kind,color,material:'pencil',outline,marks:[]});
 const snap={v:1,rv:5,seed:4242,layers:[{kind:'wall',pieces:[piece('wall','#f0e7d8',[[15,45],[65,45],[65,85],[15,85]])]},{kind:'door',pieces:[piece('door','#b04a41',[[30,85],[30,65],[38,60],[46,65],[46,85]])]}],
  ink:[{k:'p',c:'#3a3940',pts:[[20,55.04],[30,52],[45,57.06]]},{k:'w',c:'#4a6a9e',pts:[[5,92],[40,89],[95,92]]}]};
 const {normalizeHouse}=await import('../backend/worker.mjs');
 const norm=normalizeHouse(JSON.parse(JSON.stringify(snap)));
 assert.deepEqual(norm.layers,snap.layers);assert.equal(norm.rv,5);assert.equal(norm.ink.length,2);assert.deepEqual(norm.ink[0].pts[0],[20,55]);
 let row=null;
 const env5={DB:{prepare(sql){return {bind(...a){return {async first(){return row?{id:row.id}:null},async all(){return {results:row?[row]:[]}},async run(){row={id:a[0],hash:a[1],body:a[2],created:a[3]};return {meta:{changes:1}}}}}}}}};
 const send=()=>worker.fetch(new Request('https://x/publish-house',{method:'POST',headers:{Origin:'https://rafagarces.github.io','Content-Type':'application/json'},body:JSON.stringify({action:'publish',house:snap})}),env5);
 assert.equal((await send()).status,201);
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(norm))))].map(n=>n.toString(16).padStart(2,'0')).join('');
 assert.equal(row.hash,digest);assert.equal((await send()).status,200);
 const got=(await (await worker.fetch(new Request('https://x/gallery'),env5)).json()).houses[0];delete got.id;assert.deepEqual(got,norm);
 // rv4 snapshots never carry ink through publication.
 row=null;snap.rv=4;await send();assert.equal(JSON.parse(row.body).ink,undefined);
 console.log('PASS rv5 same snapshot wall+door+ink: normalize == published == fresh gallery read, hash over normalized body, rv4 drops ink');
}

// rv6 with holes: editor payload -> normalize -> publish -> fresh GET keeps holes byte-for-byte; hash over normalized body.
{
 const snap6={v:1,rv:6,seed:4243,layers:[{kind:'wall',pieces:[{v:2,kind:'wall',color:'#4a6a9e',material:'pencil',outline:[[15,45],[65,45],[65,85],[15,85]],marks:[],holes:[[[25,55],[35,55],[35,65],[25,65]]]}]}]};
 const {normalizeHouse}=await import('../backend/worker.mjs');
 const norm=normalizeHouse(JSON.parse(JSON.stringify(snap6)));
 assert.deepEqual(norm.layers[0].pieces[0].holes,snap6.layers[0].pieces[0].holes);
 let row=null;
 const env6={DB:{prepare(sql){return {bind(...a){return {async first(){return row?{id:row.id}:null},async all(){return {results:row?[row]:[]}},async run(){row={id:a[0],hash:a[1],body:a[2],created:a[3]};return {meta:{changes:1}}}}}}}}};
 const send=()=>worker.fetch(new Request('https://x/publish-house',{method:'POST',headers:{Origin:'https://rafagarces.github.io','Content-Type':'application/json'},body:JSON.stringify({action:'publish',house:snap6})}),env6);
 assert.equal((await send()).status,201);
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(norm))))].map(n=>n.toString(16).padStart(2,'0')).join('');
 assert.equal(row.hash,digest);assert.equal((await send()).status,200);
 const got=(await (await worker.fetch(new Request('https://x/gallery'),env6)).json()).houses[0];delete got.id;assert.deepEqual(got,norm);
 console.log('PASS rv6 publication: holes survive normalize -> publish -> gallery read; hash over normalized body');
}
