// Regression harness for state changes, without network writes.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Node{constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.attrs={};this.textContent='';this.style={setProperty(){}};this.children=[]}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}appendChild(n){this.children.push(n)}replaceChildren(){this.children=[]}getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}setPointerCapture(){}focus(){}querySelector(){return null}showModal(){this.open=true}close(){this.open=false}}
function setup(saved){
 const nodes={},get=id=>nodes[id]||(nodes[id]=new Node(id));
 const kinds=['wall','door','window','roof'].map(k=>{const b=new Node();b.attrs['data-kind']=k;return b}),clears=kinds.map(b=>{const x=new Node();x.attrs['data-clear']=b.attrs['data-kind'];return x});
 const storage={...saved};
 const doc={body:new Node(),activeElement:null,getElementById:get,createElement:()=>new Node(),createElementNS:()=>new Node(),querySelectorAll:s=>s.includes('.kind-x')?clears:s.includes('#kinds')?kinds:[],querySelector:s=>s.includes('data-clear=')?clears.find(x=>s.includes(x.attrs['data-clear'])):null};
 get('workshop').hidden=true;
 const context={document:doc,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Casas:{render:()=>({background:'#eeeeee'})},CasasV1:{render:()=>({background:'#eeeeee'})},CasasV2:{render:()=>({background:'#eeeeee'})},fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),setTimeout:()=>1,clearTimeout(){},scrollY:0,URL,Blob,AbortController};
 context.window={scrollTo(){},addEventListener(){}};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),context);get('open-workshop').onclick();
 return {get,kinds,clears,storage,design:()=>JSON.parse(storage['casas-design-v1']).design,draw(){for(const p of [[10,10],[90,10],[90,90],[10,90],[10,10]]){get('drawing').onpointerdown({button:0,clientX:p[0],clientY:p[1],pointerId:1,preventDefault(){}});get('drawing').onpointerup()}}};
}
let h=setup();h.draw();assert.equal(h.design().windows.length,1);assert.equal(h.get('submit-piece').disabled,false);h.get('undo').onclick();assert.equal(h.design().windows.length,0);assert.equal(h.get('submit-piece').disabled,true);
h.draw();h.kinds[0].onclick();assert.equal(h.get('submit-piece').disabled,true);h.draw();assert.ok(h.design().wall);assert.equal(h.design().windows.length,1);
h.get('clear').onclick();h.get('confirm-clear').onclick();assert.equal(h.design().wall,null);assert.equal(h.design().windows.length,0);h.get('undo').onclick();assert.ok(h.design().wall);assert.equal(h.design().windows.length,1);
h=setup(h.storage);assert.ok(h.design().wall);assert.equal(h.get('submit-house').disabled,false);h.kinds[2].onclick();assert.equal(h.get('submit-piece').disabled,false);h.clears[2].onclick();assert.equal(h.get('submit-piece').disabled,true);
console.log('PASS: auto-add, undo, current-kind proposal, erase-all + undo, reload, remove');

// Cancelled gestures must not become cutouts, including subsequent capture loss.
h=setup();
const ev=(x,y)=>({button:0,clientX:x,clientY:y,pointerId:1,preventDefault(){}});
h.get('drawing').onpointerdown(ev(10,10));
h.get('drawing').onpointermove(ev(90,10));h.get('drawing').onpointermove(ev(90,90));
h.get('drawing').onpointercancel();h.get('drawing').onlostpointercapture();
assert.equal(h.get('submit-house').disabled,true);
h.draw();assert.equal(h.design().windows.length,1);
h.get('house-status').textContent='Casa recibida';h.kinds[0].onclick();
assert.equal(h.get('house-status').textContent,'');
const windowPiece=h.design().windows[0], wrongWall={...windowPiece,kind:'wall'};
h=setup({'casas-design-v1':JSON.stringify({design:{wall:windowPiece,door:null,roof:null,windows:[wrongWall,windowPiece]}})});
h.kinds[0].onclick();assert.equal(h.get('submit-piece').disabled,true);
h.draw();assert.equal(h.design().windows.length,1);assert.equal(h.design().wall.kind,'wall');
console.log('PASS: pointercancel, stale house status, stored slot kinds');

// Rejecting an accidental freehand line preserves an existing tap outline and house.
h=setup();h.kinds[0].onclick();h.draw();const originalWall=h.design().wall;
for(const p of [[20,20],[80,20],[80,80]]){h.get('drawing').onpointerdown(ev(...p));h.get('drawing').onpointerup()}
h.get('drawing').onpointerdown(ev(10,10));h.get('drawing').onpointermove(ev(50,50));h.get('drawing').onpointermove(ev(90,90));h.get('drawing').onpointerup();
assert.equal(h.get('close-outline').disabled,false);assert.deepEqual(h.design().wall,originalWall);
assert.match(h.get('draft-note').textContent,/forma suficiente/);
h.get('drawing').onpointerdown(ev(20,80));assert.equal(h.get('draft-note').textContent,'');h.get('drawing').onpointerup();
h.get('close-outline').onclick();assert.notDeepEqual(h.design().wall,originalWall);
console.log('PASS: invalid drag preserves pending tap outline and existing wall');

// A near-flat wall cannot silently replace a useful wall. Other roles retain slim silhouettes.
h=setup();h.kinds[0].onclick();h.draw();const goodWall=h.design().wall;
for(const p of [[9.9,45],[90.1,45],[50.1,50]]){h.get('drawing').onpointerdown(ev(...p));h.get('drawing').onpointerup()}
h.get('close-outline').onclick();assert.deepEqual(h.design().wall,goodWall);assert.match(h.get('draft-note').textContent,/forma suficiente/);
h.get('undo').onclick();assert.deepEqual(h.design().wall,goodWall);
console.log('PASS: near-flat wall rejected without replacing valid wall');
