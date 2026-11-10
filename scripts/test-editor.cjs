// Offline state regression. No network writes.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class Node{constructor(id=''){this.id=id;this.hidden=false;this.disabled=false;this.attrs={};this.textContent='';this.style={setProperty(){}};this.children=[]}setAttribute(k,v){this.attrs[k]=v}removeAttribute(k){delete this.attrs[k]}getAttribute(k){return this.attrs[k]}appendChild(n){this.children.push(n)}replaceChildren(){this.children=[]}getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}setPointerCapture(){}focus(){}querySelector(){return null}showModal(){this.open=true}close(){this.open=false}}
const ev=(x,y)=>({button:0,clientX:x,clientY:y,pointerId:1,preventDefault(){}});
function setup(saved){const nodes={},get=id=>nodes[id]||(nodes[id]=new Node(id));const kinds=['wall','door','window','roof'].map(k=>{const b=new Node();b.attrs['data-kind']=k;return b}),clears=kinds.map(b=>{const x=new Node();x.attrs['data-clear']=b.attrs['data-kind'];return x}),storage={...saved},writes=[],published=[];
const doc={addEventListener(){},body:new Node(),head:new Node(),activeElement:null,getElementById:get,createElement:()=>new Node(),createElementNS:()=>new Node(),querySelectorAll:s=>s.includes('.kind-x')?clears:s.includes('#kinds')?kinds:s.includes('#papers')?get('papers').children:[],querySelector:s=>s.includes('data-clear=')?clears.find(x=>s.includes(x.attrs['data-clear'])):null};get('workshop').hidden=true;
const renderer={render:()=>({background:'#eeeeee'}),setCommunity(){}};const context={document:doc,localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},Casas:renderer,CasasV1:renderer,CasasV2:renderer,CasasV3:renderer,CasasV4:renderer,CasasV6:renderer,fetch:(url,options)=>{if(options&&options.method==='POST'){writes.push({url,...options});published.push({...JSON.parse(options.body).house,id:'test-public-reference'})}return Promise.resolve({ok:true,json:()=>Promise.resolve(options&&options.method==='POST'?{id:'test-public-reference',status:'published'}:url.includes('/gallery')?{houses:published,next:null}:[])})},setTimeout:()=>1,clearTimeout(){},URL,Blob,AbortController};context.window={scrollTo(){},addEventListener(){}};vm.createContext(context);context.window.CasasV4=renderer;context.window.CasasV6=renderer;vm.runInContext(fs.readFileSync(__dirname+'/../renderer-v5.js','utf8'),context);context.CasasV5=context.window.CasasV5;vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),context);get('open-workshop').onclick();
return {get,kinds,clears,storage,writes,state:()=>JSON.parse(storage['casas-design-v5']),papers:()=>get('papers').children,tap(x,y){get('drawing').onpointerdown(ev(x,y));get('drawing').onpointerup()},draw(pts=[[10,10],[90,10],[90,90],[10,90]]){if(!get('delete-piece').hidden)this.tap(1,1);for(const p of pts)this.tap(...p);get('close-outline').onclick()}}}
(async()=>{
let h=setup();assert.equal(h.state().layers.length,0);assert.equal(h.get('submit-house').disabled,true);h.kinds[0].onclick();h.papers()[2].onclick();h.draw([[10,20],[50,20],[50,85],[10,85]]);assert.equal(h.get('close-outline').hidden,true);assert.equal(h.get('delete-piece').hidden,false);h.tap(1,1);h.papers()[3].onclick();h.draw([[50,20],[90,20],[90,85],[50,85]]);
let layer=h.state().layers[0];assert.equal(layer.pieces.length,2);assert.equal(layer.pieces[0].color,'#b04a41');assert.equal(layer.pieces[1].color,'#4a6a9e');assert.deepEqual(layer.pieces[0].outline,[[10,20],[50,20],[50,85],[10,85]]);
// Select older cutout and edit only it. Undo restores its color.
h.tap(25,40);h.papers()[4].onclick();assert.equal(h.state().layers[0].pieces[0].color,'#5d8266');assert.equal(h.state().layers[0].pieces[1].color,'#4a6a9e');h.get('undo').onclick();assert.equal(h.state().layers[0].pieces[0].color,'#b04a41');
// Large door stays in its own coordinates, no slot fit; previous colors stay.
h.kinds[1].onclick();h.draw([[35,35],[70,35],[70,85],[35,85]]);assert.deepEqual(h.state().layers[1].pieces[0].outline,[[35,35],[70,35],[70,85],[35,85]]);assert.equal(h.state().layers[0].pieces.length,2);
await h.get('submit-house').onclick();let sent=JSON.parse(h.writes.at(-1).body);assert.equal(sent.house.rv,6);assert.match(sent.house.bg,/^#[0-9a-f]{6}$/);assert.equal(sent.house.layers[0].pieces.length,2);assert.equal(sent.action,'publish');assert.equal(h.get('submit-house').disabled,true);assert.equal(h.get('gallery').hidden,false);assert.equal(h.get('gallery-grid').children.length,31);h.get('gallery-grid').children[0].onclick();assert.equal(h.get('viewer').open,true);assert.equal(h.get('viewer-count').textContent,'1 / 31');h.get('viewer-close').onclick();
console.log('PASS: blank new canvas, bicolor layer, selected older piece recolor+undo, large door exact coordinates, rv5 publication');
// Remove whole layer, clear-all, undo and reload are non-destructive.
h.clears[0].onclick();assert.equal(h.state().layers.length,1);h.get('undo').onclick();assert.equal(h.state().layers[0].pieces.length,2);let before=h.state();h.get('clear').onclick();h.get('confirm-clear').onclick();assert.equal(h.state().layers.length,0);h.get('undo').onclick();assert.deepEqual(h.state(),before);h=setup(h.storage);assert.deepEqual(h.state().layers,before.layers);assert.equal(h.state().seed,before.seed);
{ // fondo: nueva casa -> color al azar persistente; borrador conserva el suyo; Empezar de nuevo lo renueva
 const h1=setup();const bg1=h1.state().bg;assert.match(bg1,/^#[0-9a-f]{6}$/);assert.equal(h1.state().rv,6);
 const h1b=setup(h1.storage);assert.equal(h1b.state().bg,bg1);
 h1.get('clear').onclick();h1.get('confirm-clear').onclick();const bg2=h1.state().bg;assert.match(bg2,/^#[0-9a-f]{6}$/);
 h1.get('undo').onclick();assert.equal(h1.state().bg,bg1);
 const h2=setup({'casas-design-v5':JSON.stringify({rv:5,seed:7,layers:[{kind:'wall',pieces:[]}]})});assert.equal(h2.state().bg,null);assert.equal(h2.state().rv,5);
 const h3=setup({'casas-design-v5':JSON.stringify({rv:6,seed:7,bg:'#A9C3DD',layers:[{kind:'wall',pieces:[]}]})});h3.kinds[0].onclick();h3.draw([[10,10],[40,10],[40,40],[10,40]]);assert.equal(h3.state().bg,'#a9c3dd');assert.equal(h3.state().rv,6);
 const h4=setup({'casas-design-v5':JSON.stringify({rv:6,seed:7,bg:'red',layers:[{kind:'wall',pieces:[]}]})});h4.kinds[0].onclick();h4.draw([[10,10],[40,10],[40,40],[10,40]]);assert.equal(h4.state().bg,null);assert.equal(h4.state().rv,5);
 console.log('PASS fondo: aleatorio en casa nueva, persistente, renovado al empezar de nuevo, validado');}
h.get('open-workshop').onclick();assert.equal(h.get('workshop').hidden,false);h.get('open-gallery').onclick();h.get('open-gallery').onclick();assert.equal(h.get('gallery').hidden,false);assert.equal(h.get('gallery-grid').children.length,30);h.get('brand').onclick();assert.equal(h.get('home').hidden,false);
console.log('PASS: remove layer/clear/undo/reload preserve pieces+seed; shared stable nav; 30 examples');
// Invalid drag keeps existing pending polygon and pieces. Cancellation/lost capture adds nothing.
h=setup();h.kinds[0].onclick();h.draw();const good=h.state().layers;h.tap(1,1);h.tap(20,20);h.tap(80,20);h.tap(80,80);h.get('drawing').onpointerdown(ev(10,10));h.get('drawing').onpointermove(ev(50,50));h.get('drawing').onpointermove(ev(90,90));h.get('drawing').onpointerup();assert.deepEqual(h.state().layers,good);assert.equal(h.get('close-outline').hidden,false);assert.match(h.get('draft-note').textContent,/forma suficiente/);h.get('drawing').onpointerdown(ev(10,10));h.get('drawing').onpointermove(ev(90,10));h.get('drawing').onpointermove(ev(90,90));h.get('drawing').onpointercancel();h.get('drawing').onlostpointercapture();assert.deepEqual(h.state().layers,good);
h=setup();h.get('drawing').onpointerdown(ev(10,10));h.get('drawing').onpointermove(ev(90,10));h.get('drawing').onpointermove(ev(90,90));h.get('drawing').onlostpointercapture();assert.equal(h.get('submit-house').disabled,true);
console.log('PASS: invalid contours preserve pending+pieces; pointercancel/lostcapture never add a partial cutout');
// Thin, non-degenerate walls are now valid: no role templates.
h=setup();h.kinds[0].onclick();h.draw([[9.9,45],[90.1,45],[50.1,50]]);assert.equal(h.state().layers[0].pieces[0].kind,'wall');
// Exact legacy data/marks remain as immutable base with backup; tint does not mutate original.
const p={v:2,kind:'wall',color:'#c98d45',material:'wax',outline:[[10,10],[90,10],[90,90],[10,90]],marks:[{color:'#2b2a33',width:2,points:[[20,20],[80,80]]}]};const old={design:{wall:p,door:null,roof:null,windows:[]}};h=setup({'casas-design-v1':JSON.stringify(old)});assert.equal(h.state().rv,5);assert.equal(h.storage['casas-design-v1'],JSON.stringify(old));assert.equal(h.state().seed,1049771);assert.deepEqual(h.state().base.wall,p);assert.deepEqual(JSON.parse(h.storage['casas-design-rv2-backup']),old);h.kinds[0].onclick();h.papers()[3].onclick();assert.equal(h.state().tints.wall,'#4a6a9e');assert.deepEqual(h.state().base.wall,p);h.get('undo').onclick();assert.deepEqual(h.state().tints,{});
console.log('PASS: free wall proportions; exact legacy base+marks+backup, tint-only edit+undo');
h=setup();h.kinds[0].onclick();for(let i=0;i<24;i++)h.draw();assert.equal(h.state().layers[0].pieces.length,24);h.draw();assert.equal(h.state().layers[0].pieces.length,24);assert.match(h.get('draft-note').textContent,/24 recortes/);
console.log('PASS: 24 new cutouts total enforced without deleting previous work');
const inkOf=h=>h.state().ink||[];
// Pencil/eraser over the finished house; legacy wax strokes arrive via saved designs: one ink layer, one undo history, saved and published with the house.
h=setup({'casas-design-v5':JSON.stringify({rv:5,seed:7,layers:[],ink:[{k:'w',c:'#4a6a9e',pts:[[10,80],[50,85],[90,80]]}]})});assert.equal(inkOf(h).length,1);assert.equal(inkOf(h)[0].k,'w');assert.equal(inkOf(h)[0].c,'#4a6a9e');
assert.equal(h.get('tool-pencil').disabled,false);h.kinds[0].onclick();h.draw();const piecesBefore=JSON.stringify(h.state().layers);
const stroke=(pts)=>{const d=h.get('drawing');d.onpointerdown(ev(...pts[0]));for(const p of pts.slice(1))d.onpointermove(ev(...p));d.onpointerup()};
h.get('tool-pencil').onclick();stroke([[5,5],[20,10],[40,30],[60,30]]);assert.equal(inkOf(h).length,2);assert.equal(inkOf(h)[1].k,'p');assert.equal(JSON.stringify(h.state().layers),piecesBefore);
h.get('drawing').onpointerdown(ev(30,30));h.get('drawing').onpointermove(ev(40,40));h.get('drawing').onlostpointercapture();assert.equal(inkOf(h).length,2);
h.get('tool-eraser').onclick();stroke([[48,85],[52,85]]);assert.equal(inkOf(h).length,1);assert.equal(inkOf(h)[0].k,'p');h.get('undo').onclick();assert.equal(inkOf(h).length,2);h.get('undo').onclick();assert.equal(inkOf(h).length,1);
await h.get('submit-house').onclick();let inkSent=JSON.parse(h.writes.at(-1).body);assert.equal(inkSent.house.ink.length,1);assert.equal(inkSent.house.rv,5);
assert.equal(h.state().rv,5);assert.equal(h.storage['casas-design-v1'],undefined);
// A stale tab that keeps writing the old key can neither erase the ink nor be overwritten: new key is preferred on reload.
h.storage['casas-design-v1']=JSON.stringify({rv:4,seed:1,layers:[]});const keep=h.storage['casas-design-v5'];stroke([[5,95],[30,95]]);assert.equal(h.storage['casas-design-v1'],JSON.stringify({rv:4,seed:1,layers:[]}));
{const h2=setup({'casas-design-v5':keep,'casas-design-v1':JSON.stringify({rv:4,seed:1,layers:[]})});assert.equal(h2.state().ink.length,JSON.parse(keep).ink.length);}
console.log('PASS: ink layer: pencil, legacy wax, eraser, cancel adds nothing, one undo history, pieces untouched, saved and sent with the house');
// Switching tools mid-contour keeps the pending points; returning to Recortar restores them.
h=setup();h.kinds[0].onclick();h.draw();h.tap(1,1);h.tap(20,20);h.tap(80,20);h.tap(80,80);h.get('tool-pencil').onclick();h.get('tool-cut').onclick();h.tap(20,80);h.get('close-outline').onclick();assert.equal(h.state().layers[0].pieces.length,2);assert.deepEqual(h.state().layers[0].pieces[1].outline.length,4);
console.log('PASS: switching tools keeps the pending contour');
// Drawing on an empty cartulina is allowed, but publishing still needs at least one cutout; clear-all also clears the drawing.
h=setup();h.get('tool-pencil').onclick();const d0=h.get('drawing');d0.onpointerdown(ev(10,10));d0.onpointermove(ev(40,40));d0.onpointerup();assert.equal(h.state().ink.length,1);assert.equal(h.state().ink[0].c,'#3a3940');assert.equal(h.get('submit-house').disabled,true);assert.equal(h.get('clear').disabled,false);h.get('clear').onclick();h.get('confirm-clear').onclick();assert.equal(h.state().ink.length,0);
console.log('PASS: draw on empty cartulina, publish needs a cutout, restart clears ink');
// Tijeras: interior hole (rv6), edge notch spliced into the outline, clear rejections, hole-aware selection, undo.
h=setup();h.kinds[0].onclick();h.draw([[10,20],[60,20],[60,85],[10,85]]);
h.get('tool-hole').onclick();assert.equal(h.get('cut-ui').style.display,'none');
h.tap(20,40);h.tap(30,40);h.tap(30,50);assert.equal(h.get('close-outline').hidden,false);h.get('close-outline').onclick();
let wall=h.state().layers[0].pieces[0];assert.equal(wall.holes.length,1);assert.deepEqual(wall.holes[0],[[20,40],[30,40],[30,50]]);
h.tap(22,42);h.tap(28,42);h.tap(25,48);h.get('close-outline').onclick();assert.match(h.get('draft-note').textContent,/ya hay un hueco/);assert.equal(h.state().layers[0].pieces[0].holes.length,1);
h.get('undo').onclick();h.get('undo').onclick();h.get('undo').onclick();
h.tap(5,5);h.tap(8,5);h.tap(5,8);h.get('close-outline').onclick();assert.match(h.get('draft-note').textContent,/solo cortan/);
h.get('undo').onclick();h.get('undo').onclick();h.get('undo').onclick();
const dragHole=(pts)=>{const d=h.get('drawing');d.onpointerdown(ev(...pts[0]));for(const p of pts.slice(1))d.onpointermove(ev(...p));d.onpointerup()};
dragHole([[30,85],[30,70],[35,65],[40,70],[40,85]]);
wall=h.state().layers[0].pieces[0];assert.equal(wall.outline.length,9);assert.ok(wall.outline.some(p=>p[0]===35&&p[1]===65));assert.equal(wall.holes.length,1);
await h.get('submit-house').onclick();let sent6=JSON.parse(h.writes.at(-1).body);assert.equal(sent6.house.rv,6);assert.equal(sent6.house.layers[0].pieces[0].holes.length,1);assert.equal(sent6.house.layers[0].pieces[0].outline.length,9);
h.get('tool-cut').onclick();h.kinds[1].onclick();h.kinds[0].onclick();assert.equal(h.get('delete-piece').hidden,false);h.tap(28,42);assert.equal(h.get('delete-piece').hidden,true);h.tap(28,42);assert.equal(h.get('close-outline').hidden,true);h.get('undo').onclick();
h.get('undo').onclick();assert.equal(h.state().layers[0].pieces[0].outline.length,4);assert.equal(h.state().layers[0].pieces[0].holes.length,1);
h.get('undo').onclick();assert.equal(h.state().layers[0].pieces[0].holes,undefined);
console.log('PASS: tijeras: interior hole, overlap/outside rejections, edge notch splice, rv6 publication, hole-aware selection, undo');
// Tijeras con gestos reales de dedo: trazos largos y lentos, ruido, bordes y cortes que apenas rozan.
h=setup();h.kinds[0].onclick();h.draw([[10,20],[60,20],[60,85],[10,85]]);h.tap(1,1);h.get('tool-hole').onclick();
// Hueco grande trazado despacio (más de 60 puntos crudos): antes se rechazaba por 'demasiados cambios'.
{const pts=[];for(let i=0;i<=130;i++){const t=i/130*2*Math.PI;pts.push([35+Math.cos(t)*15,52+Math.sin(t)*15])}dragHole(pts)}
wall=h.state().layers[0].pieces[0];assert.equal(wall.holes.length,1);assert.match(h.get('draft-note').textContent,/Hueco abierto/);
// Hueco pegado al borde con ruido: se apoya en el borde (mordida) en vez de fallar, sin salirse del papel.
{const pts=[];for(let i=0;i<=80;i++){const t=i/80*2*Math.PI;pts.push([17.5+Math.cos(t)*8+Math.sin(i*7)*.4,30+Math.sin(t)*8])}dragHole(pts)}
wall=h.state().layers[0].pieces[0];assert.equal(wall.holes.length,2);assert.ok(wall.holes[1].every(p=>p[0]>=10&&p[0]<=60&&p[1]>=20&&p[1]<=85));
// Muesca con tembleque que se sale un poco del papel: corta igualmente y nunca abulta fuera.
{const pts=[];for(let i=0;i<=40;i++){const t=i/40;pts.push([10+Math.sin(i*3)*2,55+t*25+Math.cos(i*5)*1.5])}dragHole(pts)}
wall=h.state().layers[0].pieces[0];assert.match(h.get('draft-note').textContent,/Muesca recortada/);assert.ok(wall.outline.every(p=>p[0]>=10&&p[0]<=60&&p[1]>=20&&p[1]<=85));assert.ok(wall.outline.length>4);
// Un trazo sobre el borde que no quita casi papel lo dice, en vez de fingir un corte.
{const h2=setup();h2.kinds[0].onclick();h2.draw([[10,20],[60,20],[60,85],[10,85]]);h2.tap(1,1);h2.get('tool-hole').onclick();const d2=h2.get('drawing');d2.onpointerdown(ev(10,55));d2.onpointermove(ev(10,65));d2.onpointermove(ev(10,75));d2.onpointerup();assert.match(h2.get('draft-note').textContent,/apenas roza/);assert.equal(h2.state().layers[0].pieces[0].outline.length,4)}
// Un anillo casi entero fuera del papel se rechaza con la guía correcta.
{const h3=setup();h3.kinds[0].onclick();h3.draw([[10,20],[60,20],[60,85],[10,85]]);h3.tap(1,1);h3.get('tool-hole').onclick();const pts=[];for(let i=0;i<=40;i++){const t=i/40*2*Math.PI;pts.push([4+Math.cos(t)*8,50+Math.sin(t)*8])}const d3=h3.get('drawing');d3.onpointerdown(ev(...pts[0]));for(const p of pts.slice(1))d3.onpointermove(ev(...p));d3.onpointerup();assert.match(h3.get('draft-note').textContent,/dentro del papel/);assert.equal(h3.state().layers[0].pieces[0].holes,undefined)}
// El papel que recibe el corte es el que cubre más puntos del trazo, aunque el centroide caiga fuera.
{const h4=setup();h4.kinds[0].onclick();h4.draw([[10,20],[60,20],[60,85],[10,85]]);h4.tap(1,1);h4.get('tool-hole').onclick();const d4=h4.get('drawing');d4.onpointerdown(ev(10,30));d4.onpointermove(ev(16,45));d4.onpointermove(ev(10,60));d4.onpointerup();assert.match(h4.get('draft-note').textContent,/Muesca recortada/);assert.ok(h4.state().layers[0].pieces[0].outline.length>4)}
console.log('PASS: tijeras con gestos reales: hueco grande lento, mordida en el borde, muesca con tembleque, apenas roza, anillo fuera, papel por mayoría del trazo');
h=setup();h.kinds[0].onclick();h.draw([[20,20],[80,20],[80,80],[20,80]]);h.get('tool-hole').onclick();
{ // tajo que cruza el papel con extremos FUERA de la zona: debe cortar
 const before=h.state().layers[0].pieces[0].outline.length;
 let pts=[];for(let i=0;i<=40;i++)pts.push([5+i*2.25,20+i*0.5+Math.sin(i)*0.5]); // de (5,20) fuera a (95,40) fuera: cruza el papel de borde a borde
 h.get('drawing').onpointerdown(ev(pts[0][0],pts[0][1]));pts.forEach(p=>h.get('drawing').onpointermove(ev(p[0],p[1])));h.get('drawing').onpointerup();
 assert.match(h.get('draft-note').textContent,/Muesca recortada/);assert.notEqual(h.state().layers[0].pieces[0].outline.length,before);
}
{ // tajo que empieza dentro y sale del papel: debe cortar
 h.get('undo').onclick();const out0=h.state().layers[0].pieces[0].outline;
 let pts=[];for(let i=0;i<=30;i++)pts.push([50+i*1.8,50-i*0.8+Math.cos(i)*0.5]); // de (50,50) dentro a (104,26) fuera
 h.get('drawing').onpointerdown(ev(pts[0][0],pts[0][1]));pts.forEach(p=>h.get('drawing').onpointermove(ev(p[0],p[1])));h.get('drawing').onpointerup();
 assert.match(h.get('draft-note').textContent,/Muesca recortada/);assert.notDeepEqual(h.state().layers[0].pieces[0].outline,out0);
 h.get('undo').onclick();
}
{ // gesto fuera que NO toca el papel: sigue sin cortar
 let pts=[];for(let i=0;i<=20;i++)pts.push([2+i*0.5,2+i*0.2]);
 h.get('drawing').onpointerdown(ev(pts[0][0],pts[0][1]));pts.forEach(p=>h.get('drawing').onpointermove(ev(p[0],p[1])));h.get('drawing').onpointerup();
 assert.equal(h.state().layers[0].pieces[0].holes,undefined);
}
console.log('PASS: tijeras cortan aunque el trazo salga de la zona: cruce completo, salida desde dentro, fuera sin contacto');
})().catch(e=>{console.error(e);process.exit(1)});
