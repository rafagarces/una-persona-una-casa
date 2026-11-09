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
