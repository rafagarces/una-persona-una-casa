// Offline viewer regression. No network writes.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Node{constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.attrs={};this.textContent='';this.style={setProperty(){}};this.children=[];this.classList={add(){},remove(){}}}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}getAttribute(k){return this.attrs[k]}appendChild(n){this.children.push(n)}replaceChildren(){this.children=[]}getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}setPointerCapture(){}focus(){}querySelector(){return null}showModal(){this.open=true}close(){this.open=false}}
function setup(){const nodes={},get=id=>nodes[id]||(nodes[id]=new Node(id));const kinds=['wall','door','window','roof'].map(k=>{const b=new Node();b.attrs['data-kind']=k;return b}),clears=kinds.map(b=>{const x=new Node();x.attrs['data-clear']=b.attrs['data-kind'];return x}),storage={};
const doc={addEventListener(){},body:new Node(),head:new Node(),activeElement:null,getElementById:get,createElement:()=>new Node(),createElementNS:()=>new Node(),querySelectorAll:s=>s.includes('.kind-x')?clears:s.includes('#kinds')?kinds:s.includes('#papers')?get('papers').children:[],querySelector:s=>null,contains:()=>true};get('workshop').hidden=true;
const renderer={render:()=>({background:'#eeeeee'}),setCommunity(){}};const context={document:doc,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Casas:renderer,CasasV1:renderer,CasasV2:renderer,CasasV3:renderer,CasasV4:renderer,CasasV6:renderer,CasasEx:renderer,Image:class{},fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve([])}),setTimeout:()=>1,clearTimeout(){},URL,Blob,AbortController};context.window={scrollTo(){},addEventListener(){}};vm.createContext(context);context.window.CasasV4=renderer;context.window.CasasV6=renderer;vm.runInContext(fs.readFileSync(__dirname+'/../renderer-v5.js','utf8'),context);context.CasasV5=context.window.CasasV5;vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),context);
return {get}}
(async()=>{
const h=setup();h.get('open-gallery').onclick();
const grid=h.get('gallery-grid');assert.equal(grid.children.length,30);
const first=grid.children[0];assert.equal(first.attrs['type'],undefined);assert.match(first.attrs['aria-label'],/Abrir en grande/);assert.match(first.attrs['aria-label'],/Casa 1 de 30/);
first.onclick();assert.equal(h.get('viewer').open,true);assert.equal(h.get('viewer-count').textContent,'1 / 30');assert.match(h.get('viewer-label').textContent,/Casa de ejemplo/);
h.get('viewer-next').onclick();assert.equal(h.get('viewer-count').textContent,'2 / 30');
h.get('viewer-prev').onclick();h.get('viewer-prev').onclick();assert.equal(h.get('viewer-count').textContent,'30 / 30');
h.get('viewer').onkeydown({key:'ArrowRight',preventDefault(){}});assert.equal(h.get('viewer-count').textContent,'1 / 30');
h.get('viewer').onkeydown({key:'ArrowLeft',preventDefault(){}});assert.equal(h.get('viewer-count').textContent,'30 / 30');
const stage=h.get('viewer-stage');stage.onpointerdown({clientX:200,clientY:100,target:{closest:()=>null}});stage.onpointerup({clientX:100,clientY:105});assert.equal(h.get('viewer-count').textContent,'1 / 30');
stage.onpointerdown({clientX:100,clientY:100,target:{closest:()=>null}});stage.onpointerup({clientX:200,clientY:103});assert.equal(h.get('viewer-count').textContent,'30 / 30');
stage.onpointerdown({clientX:100,clientY:100,target:{closest:()=>null}});stage.onpointerup({clientX:110,clientY:180});assert.equal(h.get('viewer-count').textContent,'30 / 30');
h.get('viewer-close').onclick();assert.equal(h.get('viewer').open,false);
h.get('viewer').onclose();assert.equal(h.get('viewer').open,false);
// Cards keep their own grid set: second card opens at 2, not first.
grid.children[1].onclick();assert.equal(h.get('viewer-count').textContent,'2 / 30');h.get('viewer').onclose();
console.log('PASS: cards open large viewer, buttons/keys/swipe carousel with wrap-around, close');
// Recorrido real en Chrome (portada, galería, visor, cierre). Se ejecuta aquí porque CI ya corre este archivo; se salta solo si no hay Chrome (NO_BROWSER_TEST=1 o sin google-chrome/CHROME).
{const cp=require('node:child_process');const chrome=process.env.CHROME||'google-chrome';const has=!process.env.NO_BROWSER_TEST&&cp.spawnSync(chrome,['--version'],{stdio:'ignore'}).status===0;
if(!has)console.log('SKIP: recorrido en Chrome (no hay Chrome)');
else{let r=cp.spawnSync('node',['scripts/test-browser-flow.mjs'],{stdio:'inherit'});if(r.status!==0){console.log('reintento del recorrido en Chrome (una vez)');r=cp.spawnSync('node',['scripts/test-browser-flow.mjs'],{stdio:'inherit'})}if(r.status!==0)process.exit(1)}}
})().catch(e=>{console.error(e);process.exit(1)});
