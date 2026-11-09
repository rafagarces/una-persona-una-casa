(function(){
'use strict';
var $=function(id){return document.getElementById(id)},SVGNS='http://www.w3.org/2000/svg';
var PAPERS=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a'],PAPER_NAMES=['Crema','Rosa','Rojo','Azul','Verde','Ocre','Gris','Noche'];
var INKS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34'];
var KINDS=['wall','door','window','roof'];
var WAXES=PAPERS.slice(),GRAPHITE=CasasV5.GRAPHITE,mode='cut',tool='cut',wax=WAXES[0],ink=[],inkLive=null,erasing=null;
var ENDPOINT='https://casas-de-papel-pieces.rafagarces87-store.workers.dev';
var draft={v:2,kind:'window',color:PAPERS[3],material:'pencil',outline:null,marks:[]};
var KEY='casas-piece-v2',DESIGN_KEY='casas-design-v1',DESIGN5_KEY='casas-design-v5',layers=[],base=null,tints={},omit=[],selected=null,previewSeed=null,pending=[],drawing=null,cursor=[50,50],kbUsed=false,undoStack=[],houseBusy=false,submittedHouses={},homeBackground='#a9c3dd',homeSeed=0,currentView='home',COMMUNITY_LIST=[];
var KIND_NAME={wall:'Pared',door:'Puerta',window:'Ventana',roof:'Tejado'},KIND_ART={wall:'la pared',door:'la puerta',window:'la ventana',roof:'el tejado'};
function validPts(a,min,max){return Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(n){return Number.isFinite(n)&&n>=0&&n<=100})})}
function valid(p){return p&&p.v===2&&KINDS.includes(p.kind)&&PAPERS.includes(p.color)&&['pencil','wax'].includes(p.material)&&(p.outline===null||validPts(p.outline,3,160))&&Array.isArray(p.marks)&&p.marks.length<=12&&p.marks.reduce(function(n,s){return n+s.points.length},0)<=400&&p.marks.every(function(s){return INKS.includes(s.color)&&[1,2,3].includes(s.width)&&validPts(s.points,1,60)})}
function validInk(a){return CasasV5.validInk(a)}
function setText(id,text){$(id).textContent=text}
function cp(x){return JSON.parse(JSON.stringify(x))}
function layer(k){return layers.find(function(l){return l.kind===(k||draft.kind)})}
function legacy(k){if(!base||omit.includes(k))return null;return k==='window'?(base.windows[base.windows.length-1]||null):base[k]}
function count(){return layers.reduce(function(n,l){return n+l.pieces.length},0)}
function designCount(){return count()+(base?['wall','door','roof'].filter(function(k){return legacy(k)}).length+(omit.includes('window')?0:base.windows.length):0)}
function selectedPiece(){var l=layer(),p=selected==='base'?legacy(draft.kind):l&&Number.isInteger(selected)?l.pieces[selected]:null;if(!p)return null;if(selected==='base'){var c=draft.kind==='window'?(tints.windows||[])[base.windows.length-1]:tints[draft.kind];return c?Object.assign({},p,{color:c}):p}return p}
function chooseLast(){var l=layer();selected=l&&l.pieces.length?l.pieces.length-1:legacy(draft.kind)?'base':null;var p=selectedPiece();if(p)draft.color=p.color}
try{var saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&valid(saved))draft=saved;draft.outline=null;draft.marks=[]}catch(e){}
try{var savedDesign=JSON.parse(localStorage.getItem(DESIGN5_KEY)||'null')||JSON.parse(localStorage.getItem(DESIGN_KEY)||'null');if(savedDesign){
 if((savedDesign.rv===4||savedDesign.rv===5)&&Array.isArray(savedDesign.layers)&&savedDesign.layers.every(function(l){return KINDS.includes(l.kind)&&Array.isArray(l.pieces)&&l.pieces.every(function(p){return valid(p)&&p.kind===l.kind})})){layers=savedDesign.layers;base=savedDesign.base||null;tints=savedDesign.tints||{};omit=savedDesign.omit||[];previewSeed=savedDesign.seed;if(savedDesign.rv===5&&validInk(savedDesign.ink))ink=savedDesign.ink}
 else{var sd=savedDesign.design||savedDesign,converted={v:1,rv:2,seed:1049771,windows:[]};['wall','door','roof'].forEach(function(k){if(valid(sd[k])&&sd[k].kind===k)converted[k]=sd[k]});if(Array.isArray(sd.windows))converted.windows=sd.windows.filter(function(p){return valid(p)&&p.kind==='window'}).slice(0,4);if(converted.wall||converted.door||converted.roof||converted.windows.length){base=converted;previewSeed=1049771;if(!localStorage.getItem('casas-design-rv2-backup'))localStorage.setItem('casas-design-rv2-backup',JSON.stringify(savedDesign))}}
 }}catch(e){}
try{if(localStorage.getItem('casas-piece-v1'))$('legacy-note').hidden=false}catch(e){}
function saveDesign(){try{localStorage.setItem(DESIGN5_KEY,JSON.stringify({rv:5,seed:previewSeed,base:base,tints:tints,omit:omit,layers:layers,ink:ink}));localStorage.setItem(KEY,JSON.stringify(draft))}catch(e){setText('draft-note','Este navegador no deja guardar tu casa. No se conservará al salir.')}}
function checkpoint(){undoStack.push(cp({ink:ink,layers:layers,base:base,tints:tints,omit:omit,selected:selected,kind:draft.kind,color:draft.color}))}
function restore(s){ink=s.ink||[];layers=s.layers;base=s.base;tints=s.tints;omit=s.omit;selected=s.selected;draft.kind=s.kind;draft.color=s.color}
function onpage(bg){var n=parseInt(bg.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (.2126*r+.7152*g+.0722*b)/255>.45?'#252525':'#f7f7f7'}
function fresh(){homeSeed=(Math.random()*4294967296)>>>0;if(previewSeed===null)previewSeed=homeSeed;var r=CasasV2.render($('card'),null,homeSeed);homeBackground=r.background;document.body.style.background=r.background;document.body.style.setProperty('--onpage',onpage(r.background));setText('home-status',r.shared?'Esta casa incluye una pieza compartida.':'')}
fresh();$('again').onclick=fresh;
fetch('community.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(function(list){if(Array.isArray(list))COMMUNITY_LIST=list.filter(valid).slice(0,600);Casas.setCommunity(COMMUNITY_LIST);CasasV2.setCommunity(COMMUNITY_LIST)}).catch(function(){});
var VIEWS=['home','gallery','workshop'],TABS={gallery:'open-gallery',workshop:'open-workshop'};
function show(name){if(name===currentView)return;drawing=null;currentView=name;VIEWS.forEach(function(v){$(v).hidden=v!==name});Object.keys(TABS).forEach(function(v){if(v===name)$(TABS[v]).setAttribute('aria-current','page');else $(TABS[v]).removeAttribute('aria-current')});document.body.style.background=homeBackground;if(name==='workshop'){chooseLast();sync();preview();saveDesign()}if(name==='gallery'){paintGallery();loadHouses()}window.scrollTo(0,0);if(name!=='home')$(name==='gallery'?'gallery-title':'work-title').focus({preventScroll:true})}
$('open-workshop').onclick=function(){show('workshop')};$('open-gallery').onclick=function(){show('gallery')};$('brand').onclick=function(){show('home')};
var RENDER_V=4,housesBank=null,galleryError=false;
async function loadHouses(){
 try{var published=[],next=null,pages=0;
  do{var url=ENDPOINT+'/gallery'+(next?'?before='+next.before+'&id='+encodeURIComponent(next.id):'');var r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error();var data=await r.json();if(!Array.isArray(data.houses))throw Error();published=published.concat(data.houses.filter(validHouse));next=data.next;}while(next&&++pages<20);
  var r=await fetch('houses.json',{cache:'no-cache'});if(!r.ok)throw Error();var old=await r.json();if(!Array.isArray(old))throw Error();var ids=new Set(published.map(function(h){return h.id}));housesBank=published.concat(old.filter(function(h){return validHouse(h)&&!ids.has(h.id)})).slice(0,600);galleryError=false;
 }catch(e){galleryError=true}
 if(currentView==='gallery')paintGallery();
}
loadHouses();
function validHouse(h){if(!h||h.v!==1||![1,2,3,4,5].includes(h.rv)||!Number.isInteger(h.seed)||h.seed<0||h.seed>4294967295)return false;if(h.base&&(!(h.rv===3||h.rv===4||h.rv===5)||h.base.rv!==2||h.base.base||h.base.seed!==h.seed||!validHouse(h.base)))return false;if(h.rv===4||h.rv===5)return (h.ink==null||(h.rv===5&&validInk(h.ink)))&&Array.isArray(h.layers)&&h.layers.length<=4&&new Set(h.layers.map(function(l){return l.kind})).size===h.layers.length&&h.layers.reduce(function(n,l){return n+(l.pieces||[]).length},0)<=24&&h.layers.every(function(l){return KINDS.includes(l.kind)&&Array.isArray(l.pieces)&&l.pieces.length&&l.pieces.every(function(p){return valid(p)&&p.kind===l.kind})});return ['wall','roof','door'].every(function(k){return !h[k]||(valid(h[k])&&h[k].kind===k)})&&Array.isArray(h.windows)&&h.windows.length<=4&&h.windows.every(function(w){return valid(w)&&w.kind==='window'})}
var EXAMPLES=[8020, 31777, 39696, 47615, 55534, 63453, 79291, 87210, 103048, 110967, 118886, 134724, 142643, 166400, 174319, 190157, 198076, 205995, 213914, 221833, 229752, 237671, 245590, 261428, 277266, 301023, 308942, 316861, 324780, 364375];
function rendererFor(rv){return rv===1?CasasV1:rv===3?CasasV3:rv===4?CasasV4:rv===5?CasasV5:CasasV2}
function paintCard(grid,item,index,set){
  var card=document.createElement('button');card.type='button';card.className='gallery-card';
  card.setAttribute('aria-label',item.label+'. Abrir en grande. Casa '+(index+1)+' de '+set.length+'.');
  card.onclick=function(){openViewer(set,index,card)};
  var art=document.createElement('div');art.className='art';art.setAttribute('aria-hidden','true');card.appendChild(art);grid.appendChild(card);
  try{var r=rendererFor(item.rv).render(art,item.design,item.seed);card.style.background=r.background}catch(e){card.remove()}
}
var EXAMPLE_SET=EXAMPLES.map(function(seed){return {design:null,seed:seed,rv:2,example:true,label:'Casa de ejemplo hecha con recortes de papel'}});
function paintGallery(){
  var vg=$('gallery-grid'),eg=$('examples-grid');vg.replaceChildren();eg.replaceChildren();
  var visitors=(housesBank||[]).map(function(h){return {design:h,seed:h.seed,rv:h.rv,label:'Casa de visitante hecha con recortes de papel'}});
  $('gallery-visitors').hidden=!visitors.length;
  visitors.forEach(function(item,i){paintCard(vg,item,i,visitors)});
  // Examples are fixed rv2 seeds with an empty shared bank, so they never change when pieces are approved.
  CasasV2.setCommunity([]);
  try{EXAMPLE_SET.forEach(function(item,i){paintCard(eg,item,i,EXAMPLE_SET)})}finally{CasasV2.setCommunity(COMMUNITY_LIST)}
  setText('gallery-empty',galleryError?'Las casas de visitantes no se han podido cargar. Prueba a recargar.':'');
  $('gallery-empty').hidden=!$('gallery-empty').textContent;
}
var viewerSet=null,viewerIndex=0,viewerReturnFocus=null;
function paintViewer(){
  var item=viewerSet[viewerIndex],d=$('viewer'),r=null;
  try{
    if(item.example)CasasV2.setCommunity([]);
    try{$('viewer-art').replaceChildren();r=rendererFor(item.rv).render($('viewer-art'),item.design,item.seed)}finally{if(item.example)CasasV2.setCommunity(COMMUNITY_LIST)}
  }catch(e){if(d.open)d.close();return}
  d.style.background=r.background;d.style.setProperty('--onpage',onpage(r.background));
  setText('viewer-label',item.label+', '+(viewerIndex+1)+' de '+viewerSet.length);
  setText('viewer-count',(viewerIndex+1)+' / '+viewerSet.length);
}
function openViewer(set,index,origin){
  if(!set.length)return;viewerSet=set;viewerIndex=index;viewerReturnFocus=origin||null;
  var d=$('viewer');if(!d.open)d.showModal();
  paintViewer();if(d.open)$('viewer-close').focus({preventScroll:true});
}
function stepViewer(delta){if(!viewerSet||viewerSet.length<2)return;viewerIndex=(viewerIndex+delta+viewerSet.length)%viewerSet.length;paintViewer()}
$('viewer-prev').onclick=function(){stepViewer(-1)};
$('viewer-next').onclick=function(){stepViewer(1)};
$('viewer-close').onclick=function(){$('viewer').close()};
$('viewer').onclose=function(){viewerSet=null;if(viewerReturnFocus&&document.contains(viewerReturnFocus))viewerReturnFocus.focus()};
$('viewer').onkeydown=function(e){if(e.key==='ArrowLeft'){e.preventDefault();stepViewer(-1)}else if(e.key==='ArrowRight'){e.preventDefault();stepViewer(1)}};
(function(){var start=null,stage=$('viewer-stage');stage.onpointerdown=function(e){if(e.target.closest('button'))return;start={x:e.clientX,y:e.clientY}};stage.onpointerup=function(e){if(!start)return;var dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.4)stepViewer(dx<0?1:-1)};stage.onpointercancel=function(){start=null}})();
function houseSnapshot(){var h={v:1,rv:5,seed:previewSeed};if(base){h.base=base;if(Object.keys(tints).length)h.tints=tints;if(omit.length)h.omit=omit}h.layers=layers;if(ink.length)h.ink=ink;return JSON.stringify(h)}
var previewBackground='#f7f5f0';function preview(){if($('workshop').hidden)return;var r=CasasV5.render($('preview'),JSON.parse(houseSnapshot()),previewSeed);previewBackground=r.background;$('stage').style.background=r.background}
function resetCanvas(){pending=[];drawing=null;kbUsed=false}
function changed(){setText('house-status','');sync();preview();saveDesign()}
function controls(){var p=selectedPiece();if(mode==='draw'&&!designCount()){tool='cut';applyMode()}for(var k in toolBtns)if(k!=='cut')toolBtns[k].disabled=!designCount();$('undo').disabled=(mode==='cut'&&!pending.length)&&!undoStack.length||mode==='draw'&&!undoStack.length;$('clear').disabled=!pending.length&&!designCount();$('close-outline').textContent=p&&!pending.length?'Nuevo recorte':'Cerrar recorte';$('close-outline').disabled=pending.length<3&&!p;$('submit-house').disabled=!designCount()||houseBusy||!!submittedHouses[houseSnapshot()];setText('work-help',mode==='draw'?'Dibuja encima de la casa.':pending.length>=3?'Toca el primer punto para cerrar, o pulsa Cerrar recorte.':p?'Recorte seleccionado. Cambia su papel o pulsa Nuevo recorte para añadir otro.':'Dibuja el contorno: arrastra, o toca punto a punto. Cada recorte se añade a esta capa.')}
function paintSlots(){document.querySelectorAll('#kinds .tool').forEach(function(b){var k=b.getAttribute('data-kind'),l=layer(k),n=(l?l.pieces.length:0)+(base&&!omit.includes(k)?k==='window'?base.windows.length:base[k]?1:0:0);b.textContent=KIND_NAME[k]+(n>1?' ×'+n:n?' ✓':'');b.setAttribute('aria-pressed',String(k===draft.kind));document.querySelector('.kind-x[data-clear='+k+']').hidden=!n})}
function paperName(){var p=selectedPiece();setText('paper-name',PAPER_NAMES[PAPERS.indexOf(p?p.color:draft.color)]||'')}
function paintSwatches(){var p=selectedPiece(),c=p?p.color:draft.color;document.querySelectorAll('#papers .swatch').forEach(function(b,i){b.setAttribute('aria-pressed',String(PAPERS[i]===c))})}
function sync(){paintSlots();paperName();paintSwatches();controls();paint()}
function el(name,attrs){var n=document.createElementNS(SVGNS,name);for(var k in attrs)n.setAttribute(k,attrs[k]);return n}
function ptsToD(pts,close){return 'M'+pts.map(function(p){return p.join(' ')}).join('L')+(close?'Z':'')}
function paint(){var g=$('strokes');g.replaceChildren();if(mode==='draw'){if(inkLive&&inkLive.pts.length>1)g.appendChild(CasasV5.strokeNode(inkLive));return}var p=selectedPiece();if(p&&selected!=='base'){g.appendChild(el('path',{d:ptsToD(p.outline,true),'class':'halo','stroke-width':.8}));g.appendChild(el('path',{d:ptsToD(p.outline,true),fill:'none',stroke:'#252525','stroke-width':.25,'stroke-dasharray':'1 1'}))}var live=drawing&&drawing.moved?drawing.pts:pending;if(live.length>=3)g.appendChild(el('path',{d:ptsToD(live,true),fill:draft.color,opacity:.65}));if(live.length){g.appendChild(el('path',{d:ptsToD(live),'class':'halo','stroke-width':1.8}));g.appendChild(el('path',{d:ptsToD(live),'class':'pending'}))}if(pending.length>=3)g.appendChild(el('path',{d:ptsToD([pending[pending.length-1],pending[0]]),'class':'closing'}));pending.forEach(function(p,i){g.appendChild(el('circle',{'class':'halo',cx:p[0],cy:p[1],r:1.5,fill:'#fff'}));g.appendChild(el('circle',{'class':'vtx',cx:p[0],cy:p[1],r:.8}));if(i===0&&pending.length>=3)g.appendChild(el('circle',{'class':'vtx-first',cx:p[0],cy:p[1],r:2.6}))});if(kbUsed)g.appendChild(el('path',{d:'M'+(cursor[0]-2)+' '+cursor[1]+'h4M'+cursor[0]+' '+(cursor[1]-2)+'v4','class':'kcursor'}))}
function point(e){var b=$('drawing').getBoundingClientRect();return [Math.max(0,Math.min(100,Math.round((e.clientX-b.left)/b.width*1000)/10)),Math.max(0,Math.min(100,Math.round((e.clientY-b.top)/b.height*1000)/10))]}
function perp(p,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);if(L<1e-9)return Math.hypot(p[0]-a[0],p[1]-a[1]);return Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L}
function simplify(pts,eps){
  if(pts.length<=3)return pts.slice();
  var keep=new Array(pts.length).fill(false);keep[0]=keep[pts.length-1]=true;var stack=[[0,pts.length-1]];
  while(stack.length){var seg=stack.pop(),a=pts[seg[0]],b=pts[seg[1]],max=-1,idx=-1;
    for(var i=seg[0]+1;i<seg[1];i++){var d=perp(pts[i],a,b);if(d>max){max=d;idx=i}}
    if(max>eps&&idx>0){keep[idx]=true;stack.push([seg[0],idx],[idx,seg[1]]);}}
  return pts.filter(function(p,i){return keep[i]});
}
function area2(pts){var a=0;for(var i=0,j=pts.length-1;i<pts.length;j=i++)a+=pts[j][0]*pts[i][1]-pts[i][0]*pts[j][1];return Math.abs(a/2)}
function finishOutline(raw){var pts=simplify(raw.concat([raw[0]]),.4);pts.pop();if(pts.length>160){drawing=null;paint();controls();setText('draft-note','Ese contorno tiene demasiados cambios. Prueba un trazo más sencillo.');return}pts=pts.map(function(p){return p.map(function(n){return Math.round(n*10)/10})});var xs=pts.map(function(p){return p[0]}),ys=pts.map(function(p){return p[1]});if(pts.length<3||Math.max.apply(null,xs)-Math.min.apply(null,xs)<4||Math.max.apply(null,ys)-Math.min.apply(null,ys)<4||area2(pts)<15){drawing=null;paint();controls();setText('draft-note','Ese recorte no encierra forma suficiente.');return}if(count()>=24){drawing=null;paint();controls();setText('draft-note','Tu casa ya tiene 24 recortes. Puedes deshacer o borrar una capa antes de añadir otro.');return}checkpoint();var l=layer();if(!l){l={kind:draft.kind,pieces:[]};layers.push(l)}l.pieces.push({v:2,kind:draft.kind,color:draft.color,material:draft.material,outline:pts,marks:[]});selected=l.pieces.length-1;resetCanvas();changed();setText('draft-note','Recorte añadido. Sigue seleccionado; los anteriores se conservan.')}
function inside(p,pts){var c=false;for(var i=0,j=pts.length-1;i<pts.length;j=i++){var a=pts[i],b=pts[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
$('drawing').onpointerdown=function(e){if(e.button&&e.button!==0)return;e.preventDefault();$('drawing').setPointerCapture(e.pointerId);if(mode==='draw'){setText('draft-note','');var q=point(e);if(tool==='eraser'){erasing={did:false};eraseAt(q)}else inkLive={k:tool==='pencil'?'p':'w',c:tool==='pencil'?GRAPHITE:wax,pts:[q]};paint();return}drawing={pts:[point(e)],moved:false};setText('draft-note','')};
$('drawing').onpointermove=function(e){if(mode==='draw'){if(inkLive){var q=point(e),l=inkLive.pts[inkLive.pts.length-1];if(Math.hypot(l[0]-q[0],l[1]-q[1])>.5&&inkLive.pts.length<500){inkLive.pts.push(q);paint()}}else if(erasing)eraseAt(point(e));return}if(!drawing)return;var p=point(e),last=drawing.pts[drawing.pts.length-1];if(Math.hypot(last[0]-p[0],last[1]-p[1])>1.2&&drawing.pts.length<600){drawing.moved=true;drawing.pts.push(p);paint()}};
function segDist(p,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function eraseAt(p){var keep=ink.filter(function(s){for(var i=0;i<s.pts.length-1;i++)if(segDist(p,s.pts[i],s.pts[i+1])<=3)return false;return true});if(keep.length!==ink.length){if(!erasing.did){checkpoint();erasing.did=true}ink=keep;preview()}}
function endInk(){if(inkLive){var s=inkLive;inkLive=null;var pts=s.pts.length<2?[s.pts[0],[Math.min(100,s.pts[0][0]+.1),s.pts[0][1]]]:simplify(s.pts,.25),eps=.25;while(pts.length>120){eps*=1.5;pts=simplify(s.pts,eps)}if(ink.length>=40||ink.reduce(function(n,x){return n+x.pts.length},0)+pts.length>1600){setText('draft-note','Ya no caben más trazos.');paint();return}checkpoint();ink=ink.concat([{k:s.k,c:s.c,pts:pts}]);setText('draft-note','');changed();return}if(erasing){var d=erasing.did;erasing=null;if(d)changed();else paint()}}
function endStroke(){if(mode==='draw'){endInk();return}if(!drawing)return;var d=drawing;drawing=null;if(d.moved&&d.pts.length>=3){finishOutline(d.pts);return}var p=d.pts[0];if(pending.length>=3&&Math.hypot(p[0]-pending[0][0],p[1]-pending[0][1])<=4){finishOutline(pending);return}if(!pending.length&&selected!==null){var l=layer();if(l){for(var i=l.pieces.length-1;i>=0;i--)if(inside(p,l.pieces[i].outline)){selected=i;draft.color=l.pieces[i].color;sync();return}}}selected=null;pending.push(p);sync()}
$('drawing').onpointerup=endStroke;function cancelStroke(){drawing=null;inkLive=null;erasing=null;paint();controls()}$('drawing').onpointercancel=cancelStroke;$('drawing').onlostpointercapture=cancelStroke;
$('drawing').onkeydown=function(e){if(mode==='draw'){if(e.key==='Escape'&&(inkLive||erasing)){e.preventDefault();cancelStroke()}return}var step=e.shiftKey?8:2,ok=true;if(e.key==='ArrowLeft')cursor[0]=Math.max(0,cursor[0]-step);else if(e.key==='ArrowRight')cursor[0]=Math.min(100,cursor[0]+step);else if(e.key==='ArrowUp')cursor[1]=Math.max(0,cursor[1]-step);else if(e.key==='ArrowDown')cursor[1]=Math.min(100,cursor[1]+step);else if(e.key==='Enter'||e.key===' '){selected=null;pending.push(cursor.slice())}else if(e.key==='c'||e.key==='C'){if(pending.length>=3)finishOutline(pending)}else if(e.key==='Escape')resetCanvas();else ok=false;if(ok){e.preventDefault();kbUsed=true;sync()}};
$('close-outline').onclick=function(){if(pending.length>=3)finishOutline(pending);else if(selectedPiece()){selected=null;resetCanvas();sync();setText('draft-note','Nuevo recorte. Elige su papel y dibuja; los demás se quedan.')}};
PAPERS.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('aria-label','Papel '+PAPER_NAMES[i]);var span=document.createElement('span');span.style.setProperty('--ink',c);b.appendChild(span);b.onclick=function(){var p=selectedPiece();if(p&&p.color!==c){checkpoint();if(selected==='base'){if(draft.kind==='window'){tints.windows=(tints.windows||[]).slice();tints.windows[base.windows.length-1]=c}else tints[draft.kind]=c}else p.color=c}draft.color=c;changed();setText('draft-note',p?'Papel del recorte seleccionado: '+PAPER_NAMES[i]+'.':'Papel para el próximo recorte: '+PAPER_NAMES[i]+'.')};$('papers').appendChild(b)});
document.querySelectorAll('#kinds .tool').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-kind');if(k===draft.kind)return;resetCanvas();draft.kind=k;chooseLast();changed()}});
document.querySelectorAll('.kind-x').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-clear');checkpoint();layers=layers.filter(function(l){return l.kind!==k});if(base&&!omit.includes(k))omit.push(k);if(k===draft.kind){selected=null;resetCanvas()}changed();setText('draft-note','Capa retirada. Puedes deshacer.')}});
$('undo').onclick=function(){if(mode==='cut'&&pending.length)pending.pop();else if(undoStack.length){restore(undoStack.pop());if(mode==='cut')resetCanvas()}changed()};
$('clear').onclick=function(){$('clear-dialog').showModal()};$('cancel-clear').onclick=function(){$('clear-dialog').close()};$('confirm-clear').onclick=function(){checkpoint();ink=[];layers=[];base=null;tints={};omit=[];selected=null;resetCanvas();$('clear-dialog').close();changed();setText('draft-note','Lienzo vacío. Puedes deshacer.')};
$('submit-house').onclick=async function(){if(houseBusy||!designCount())return;houseBusy=true;controls();setText('house-status','Enviando tu casa…');var snapshot=houseSnapshot(),controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
 try{var r=await fetch(ENDPOINT+'/publish-house',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({house:JSON.parse(snapshot),action:'publish',website:$('website').value}),signal:controller.signal});var result=await r.json();if(!r.ok||!result.id||result.status!=='published')throw new Error(result.error||'unavailable');submittedHouses[snapshot]=true;housesBank=[Object.assign(JSON.parse(snapshot),{id:result.id})].concat((housesBank||[]).filter(function(h){return h.id!==result.id}));show('gallery');setText('house-status','Casa publicada.');}
 catch(e){var text=e.message==='capacity'?'La recepción está llena por ahora. Tu casa sigue aquí; prueba otro día.':'No hemos podido confirmar el envío. Tu casa sigue aquí. Puedes reintentarlo.';setText('house-status',text)}finally{clearTimeout(timer);houseBusy=false;controls();}};
var toolBtns={cut:$('tool-cut'),pencil:$('tool-pencil'),wax:$('tool-wax'),eraser:$('tool-eraser')};
var CUT_DESC=$('draw-desc').textContent,CUT_TITLE=$('draw-title').textContent;
function applyMode(){mode=tool==='cut'?'cut':'draw';var d=mode==='draw';$('cut-ui').style.visibility=d?'hidden':'';$('draw-ui').style.visibility=d?'':'hidden';$('close-outline').style.visibility=d?'hidden':'';for(var k in toolBtns)toolBtns[k].setAttribute('aria-pressed',String(tool===k));$('waxes').style.visibility=tool==='wax'?'':'hidden';setText('draw-title',d?'Lienzo para dibujar encima de la casa':CUT_TITLE);setText('draw-desc',d?(tool==='eraser'?'Arrastra sobre un trazo para borrarlo entero.':'Arrastra para dibujar. Escape cancela el trazo en curso.'):CUT_DESC)}
Object.keys(toolBtns).forEach(function(k){toolBtns[k].onclick=function(){if(k===tool||(k!=='cut'&&!designCount()))return;tool=k;drawing=null;inkLive=null;erasing=null;applyMode();sync()}});
WAXES.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('aria-label','Cera '+PAPER_NAMES[i].toLowerCase());b.setAttribute('aria-pressed',String(c===wax));var span=document.createElement('span');span.style.setProperty('--ink',c);b.appendChild(span);b.onclick=function(){wax=c;for(var j=0;j<$('waxes').children.length;j++)$('waxes').children[j].setAttribute('aria-pressed',String(j===i))};$('waxes').appendChild(b)});
applyMode();
chooseLast();window.addEventListener('pagehide',saveDesign);
})();
