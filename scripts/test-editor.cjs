// Regression harness for state changes, without network writes.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Node{constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.attrs={};this.textContent='';this.style={setProperty(){}};this.children=[]}setAttribute(k,v){this.attrs[k]=v}getAttribute(k){return this.attrs[k]}appendChild(n){this.children.push(n)}replaceChildren(){this.children=[]}getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}setPointerCapture(){}focus(){}querySelector(){return null}showModal(){this.open=true}close(){this.open=false}}
function setup(saved){
 const nodes={},get=id=>nodes[id]||(nodes[id]=new Node(id));
 const kinds=['wall','door','window','roof'].map(k=>{const b=new Node();b.attrs['data-kind']=k;return b}),clears=kinds.map(b=>{const x=new Node();x.attrs['data-clear']=b.attrs['data-kind'];return x});
 const storage={...saved};
 const doc={body:new Node(),activeElement:null,getElementById:get,createElement:()=>new Node(),createElementNS:()=>new Node(),querySelectorAll:s=>s.includes('.kind-x')?clears:s.includes('#kinds')?kinds:[],querySelector:s=>s.includes('data-clear=')?clears.find(x=>s.includes(x.attrs['data-clear'])):null};
 get('workshop').hidden=true;
 const context={document:doc,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Casas:{render:()=>({background:'#eeeeee'})},CasasV1:{render:()=>({background:'#eeeeee'})},fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),setTimeout:()=>1,clearTimeout(){},scrollY:0,URL,Blob,AbortController};
 context.window={scrollTo(){},addEventListener(){}};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),context);get('open-workshop').onclick();
 return {get,kinds,clears,storage,design:()=>JSON.parse(storage['casas-design-v1']).design,draw(){for(const p of [[10,10],[90,10],[90,90],[10,90],[10,10]]){get('drawing').onpointerdown({button:0,clientX:p[0],clientY:p[1],pointerId:1,preventDefault(){}});get('drawing').onpointerup()}}};
}
let h=setup();h.draw();assert.equal(h.design().windows.length,1);assert.equal(h.get('submit-piece').disabled,false);h.get('undo').onclick();assert.equal(h.design().windows.length,0);assert.equal(h.get('submit-piece').disabled,true);
h.draw();h.kinds[0].onclick();assert.equal(h.get('submit-piece').disabled,true);h.draw();assert.ok(h.design().wall);assert.equal(h.design().windows.length,1);
h.get('clear').onclick();h.get('confirm-clear').onclick();assert.equal(h.design().wall,null);assert.equal(h.design().windows.length,0);h.get('undo').onclick();assert.ok(h.design().wall);assert.equal(h.design().windows.length,1);
h=setup(h.storage);assert.ok(h.design().wall);assert.equal(h.get('submit-house').disabled,false);h.kinds[2].onclick();assert.equal(h.get('submit-piece').disabled,false);h.clears[2].onclick();assert.equal(h.get('submit-piece').disabled,true);
console.log('PASS: auto-add, undo, current-kind proposal, erase-all + undo, reload, remove');
