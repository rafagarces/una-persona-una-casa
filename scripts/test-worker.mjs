import assert from 'node:assert/strict';
import worker,{normalize,normalizeHouse} from '../backend/worker.mjs';
const p={v:2,kind:'wall',color:'#f0e7d8',material:'pencil',outline:[[10,10],[90,10],[90,90],[10,90]],marks:[]};
const h={v:1,rv:1,seed:1049771,wall:p,windows:[]};
assert.deepEqual(normalizeHouse(h),h);
for(const bad of [{...h,rv:4},{...h,seed:-1},{...h,wall:{...p,kind:'roof'}},{...h,windows:Array(5).fill({...p,kind:'window'})},{v:1,rv:1,seed:0,windows:[]}])assert.throws(()=>normalizeHouse(bad));
let inserts=0;
const env={DB:{prepare(sql){return {bind(...args){return {async first(){return null},async run(){assert.match(sql,/intake_queue/);assert.match(sql,/intake_days/);inserts++;return {meta:{changes:1}}}}}}}}};
const req=(path,data,origin='https://rafagarces.github.io')=>new Request('https://x'+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
assert.equal((await worker.fetch(req('/submit-house',{house:h,action:'propose-for-review',website:''}),env)).status,201);
assert.equal((await worker.fetch(req('/submit',{piece:p,action:'propose-for-review',website:''}),env)).status,201);
assert.equal((await worker.fetch(req('/submit-house',{house:h,action:'propose-for-review'},'https://bad'),env)).status,403);
assert.equal((await worker.fetch(req('/submit-house',{house:h}),env)).status,400);
assert.equal(inserts,2);
const realNow=Date.now;
try{
 Date.now=()=>1794355199999;
 assert.equal((await worker.fetch(req('/submit-house',{house:h,consent:true}),env)).status,201);
 Date.now=()=>1794355200000;
 assert.equal((await worker.fetch(req('/submit-house',{house:h,consent:true}),env)).status,400);
 assert.equal((await worker.fetch(req('/submit-house',{house:h,action:'propose-for-review'}),env)).status,201);
 assert.equal((await worker.fetch(req('/submit-house',{house:h,consent:true,action:'wrong'}),env)).status,400);
}finally{Date.now=realNow}
assert.equal(inserts,4);
console.log('worker normalization, input validation, shared-cap SQL, both routes: PASS');

const h3={v:1,rv:3,seed:1049771,base:{...h,rv:2},roof:{...p,kind:'roof'},windows:[]};
assert.deepEqual(normalizeHouse(h3),h3);
for(const bad of [{...h3,base:{...h3}}, {...h3,base:{...h,seed:4}}, {...h,base:h}, {...h3,base:{...h,rv:1}}])assert.throws(()=>normalizeHouse(bad));
console.log('rv3 bounded base rv2, matching seed, no recursion: PASS');
const tinted={...h3,tints:{wall:'#dfa3a5'},omit:['door']};assert.deepEqual(normalizeHouse(tinted),tinted);
for(const bad of [{...h3,tints:{wall:'url(x)'}},{...h3,tints:{unknown:'x'}},{...h3,tints:{windows:Array(5).fill('#dfa3a5')}},{...h3,omit:['x']},{...h3,omit:['door','door']},{...h,omit:[]}])assert.throws(()=>normalizeHouse(bad));
console.log('rv3 tints/omit strict bounded enums: PASS');
const h4={v:1,rv:4,seed:8020,layers:[{kind:'wall',pieces:[p,{...p,color:'#dfa3a5'}]},{kind:'door',pieces:[{...p,kind:'door'}]}]};assert.deepEqual(normalizeHouse(h4),h4);
const max4={v:1,rv:4,seed:1049771,base:{...h,rv:2,door:{...p,kind:'door'},roof:{...p,kind:'roof'},windows:Array(4).fill({...p,kind:'window'})},layers:[{kind:'wall',pieces:Array(24).fill(p)}]};assert.equal(normalizeHouse(max4).layers[0].pieces.length,24);
for(const bad of [{...h4,layers:[h4.layers[0],h4.layers[0]]},{...h4,layers:[{kind:'door',pieces:[p]}]},{...h4,layers:[{kind:'wall',pieces:Array(25).fill(p)}]},{...h4,layers:[]},{...h4,base:{...h,rv:3,seed:8020}},{...h4,tints:{}},{...h4,layers:[{kind:'wall',pieces:[]}]}])assert.throws(()=>normalizeHouse(bad));
console.log('rv4: multicolor independent cutouts, max24+7base, unique roles, matching types, no empty/recursive misuse: PASS');

// Ink strokes over rv4 houses: closed palettes, bounded, geometry only, rounded to 0.1.
{const base={v:1,rv:5,seed:7,layers:[{kind:'wall',pieces:[p]}]};
 const ink=[{k:'p',c:'#3a3940',pts:[[1,1.04],[50,50]]},{k:'w',c:'#b04a41',pts:[[0,0],[100,100]]}];
 const out=normalizeHouse({...base,ink});assert.equal(out.ink.length,2);assert.deepEqual(out.ink[0].pts[0],[1,1]);
 assert.equal(normalizeHouse(base).ink,undefined);assert.equal(normalizeHouse({...base,ink:[]}).ink,undefined);
 for(const bad of [[{k:'x',c:'#3a3940',pts:[[1,1],[2,2]]}],[{k:'p',c:'#ff0000',pts:[[1,1],[2,2]]}],[{k:'w',c:'#b04a41',pts:[[1,1]]}],[{k:'w',c:'#b04a41',pts:[[1,101],[2,2]]}],[{k:'w',c:'#b04a41',pts:Array(121).fill([1,1])}],Array(41).fill(ink[0]),Array(14).fill({k:'w',c:'#b04a41',pts:Array(120).fill([1,1])}),'x'])assert.throws(()=>normalizeHouse({...base,ink:bad}));
 assert.equal(normalizeHouse({v:1,rv:3,seed:7,windows:[],wall:p,ink}).ink,undefined);
 assert.equal(normalizeHouse({...base,rv:4,ink}).ink,undefined);assert.equal(normalizeHouse({...base,rv:4,ink}).rv,4);assert.equal(normalizeHouse(base).rv,5);
 console.log('PASS ink normalization: palettes, limits, rounding, optional');}

// rv6 scissor holes: interior rings preserved and bounded; holes rejected on rv4/rv5; ink allowed on rv6.
const h6={v:1,rv:6,seed:9,layers:[{kind:'wall',pieces:[{...p,holes:[[[20,20],[30,20],[30,30],[20,30]]]}]}]};
const n6=normalizeHouse(h6);assert.equal(n6.rv,6);assert.deepEqual(n6.layers[0].pieces[0].holes,[[[20,20],[30,20],[30,30],[20,30]]]);
assert.equal(normalizeHouse({v:1,rv:6,seed:9,layers:[{kind:'wall',pieces:[{...p,holes:[]}]}]}).layers[0].pieces[0].holes,undefined);
assert.equal(normalizeHouse({...h6,ink:[{k:'p',c:'#3a3940',pts:[[1,1],[5,5]]}]}).ink.length,1);
const big=Array.from({length:55},(_,i)=>{const a=i/55*2*Math.PI;return [50+10*Math.cos(a),50+10*Math.sin(a)]});
for(const bad of [
 {...p,holes:Array(7).fill([[20,20],[30,20],[30,30],[20,30]])},
 {...p,holes:[[[20,20],[30,20]]]},
 {...p,holes:[Array(61).fill([20,20])]},
 {...p,holes:[[[20,20],[20.5,20],[20.2,20.2]]]},
 {...p,holes:[big,big,big,big]},
 {...p,holes:[[[20,20],[30,20],[30,30],[20,101]]]},
])assert.throws(()=>normalizeHouse({v:1,rv:6,seed:9,layers:[{kind:'wall',pieces:[bad]}]}));
for(const rv of [4,5])assert.throws(()=>normalizeHouse({v:1,rv,seed:9,layers:[{kind:'wall',pieces:[{...p,holes:[[[20,20],[30,20],[30,30],[20,30]]]}]}]}));
console.log('PASS rv6: holes normalized, bounded, degenerate/oversized rejected, holes require rv6, ink allowed');
