(function(){
'use strict';
var $=function(id){return document.getElementById(id)},SVGNS='http://www.w3.org/2000/svg';
var PAPERS=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a'],PAPER_NAMES=['Crema','Rosa','Rojo','Azul','Verde','Ocre','Gris','Noche'];
var INKS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34'];
var KINDS=['wall','door','window','roof'];
var GRAPHITE=CasasV5.GRAPHITE,mode='cut',tool='cut',ink=[],inkLive=null,erasing=null;
var ENDPOINT='https://casas-de-papel-pieces.rafagarces87-store.workers.dev';
var draft={v:2,kind:'window',color:PAPERS[3],material:'pencil',outline:null,marks:[]};
var KEY='casas-piece-v2',DESIGN_KEY='casas-design-v1',DESIGN5_KEY='casas-design-v5',layers=[],base=null,tints={},omit=[],selected=null,previewSeed=null,pending=[],drawing=null,cursor=[50,50],kbUsed=false,undoStack=[],houseBusy=false,submittedHouses={},homeBackground='#a9c3dd',homeSeed=0,currentView='home',COMMUNITY_LIST=[];
var KIND_NAME={wall:'Pared',door:'Puerta',window:'Ventana',roof:'Tejado'},KIND_ART={wall:'la pared',door:'la puerta',window:'la ventana',roof:'el tejado'};
function validPts(a,min,max){return Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(n){return Number.isFinite(n)&&n>=0&&n<=100})})}
function validHoles(a){return Array.isArray(a)&&a.length<=6&&a.reduce(function(n,h){return n+h.length},0)<=200&&a.every(function(h){return validPts(h,3,60)&&area2(h)>=2})}
function valid(p){return p&&p.v===2&&KINDS.includes(p.kind)&&PAPERS.includes(p.color)&&['pencil','wax'].includes(p.material)&&(p.outline===null||validPts(p.outline,3,160))&&(p.holes==null||validHoles(p.holes))&&Array.isArray(p.marks)&&p.marks.length<=12&&p.marks.reduce(function(n,s){return n+s.points.length},0)<=400&&p.marks.every(function(s){return INKS.includes(s.color)&&[1,2,3].includes(s.width)&&validPts(s.points,1,60)})}
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
// Portada: el SVG de cada casa (sombras + grano de papel) es lo caro de rasterizar, sobre todo en iPhone.
// Las próximas casas se componen y rasterizan por adelantado en segundo plano (misma técnica que el visor);
// pulsar ↻ solo cambia un bitmap ya listo. Si la cola está vacía, se renderiza como antes y se repone.
var paperFailed=false,rasterSlow=false,rasterTimed=false,lastRasterMs=0,probeDone=false,pressT0=0,bankList=null,bankPool=[],bankBag=[],bankPre={},pressBusy=false,bankTimer=0;
function noteRasterSlow(px){try{localStorage.setItem('casas-raster','slow|'+ASSET_V+'|'+px)}catch(e){}}
function homePx(){var w=$('card').clientWidth;return w>0?Math.round(w*Math.min(window.devicePixelRatio||1,3)):0}
function applyHome(seed,background,shared){
 homeSeed=seed;if(previewSeed===null)previewSeed=homeSeed;
 homeBackground=background;document.body.style.background=background;document.body.style.setProperty('--onpage',onpage(background));
 setText('home-status',shared?'Esta casa incluye una pieza compartida.':'');
}
function bankRefill(){while(bankBag.length<3){if(!bankPool.length){bankPool=bankList.slice();for(var i=bankPool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=bankPool[i];bankPool[i]=bankPool[j];bankPool[j]=t}}bankBag.push(bankPool.pop())}}
function bankPrefetch(){if(!bankList)return;bankRefill();bankBag.slice(0,2).forEach(function(e){if(!bankPre[e.f]){var im=new Image();bankPre[e.f]=im;im.src=e.f}})}
function fresh(){
 // La portada ya no rasteriza en el dispositivo: cada pulsación sirve una casa preparada
 // del banco (generado con el mismo renderer y la misma textura, verificado pixel a pixel).
 // Si la imagen no llega o tarda demasiado, se sirve un render directo como antes.
 if(pressBusy)return;
 pressT0=performance.now();
 if(bankList&&bankList.length){
  pressBusy=true;
  bankRefill();
  var e=bankBag.shift();
  bankRefill();
  var img=bankPre[e.f];
  var done=function(ok){
   clearTimeout(bankTimer);pressBusy=false;
   if(ok){delete bankPre[e.f];$('card').replaceChildren(img);applyHome(e.seed,e.background,e.shared);diagLog('refresh banco '+e.f+' '+Math.round(performance.now()-pressT0)+'ms')}
   else{var seed=(Math.random()*4294967296)>>>0;var r=CasasV2.render($('card'),null,seed);applyHome(seed,r.background,r.shared);diagLog('refresh render directo (banco no llego)')}
   bankPrefetch();
  };
  if(img&&img.complete){done(!!img.naturalWidth);return}
  bankTimer=setTimeout(function(){done(false)},4000);
  if(!img){img=new Image();bankPre[e.f]=img;img.src=e.f}
  img.onload=function(){done(true)};
  img.onerror=function(){done(false)};
  return
 }
 var seed=(Math.random()*4294967296)>>>0;var t0=performance.now();var r=CasasV2.render($('card'),null,seed);diagLog('refresh render directo '+Math.round(performance.now()-t0)+'ms');applyHome(seed,r.background,r.shared);
}
function startProbe(){
 if(probeDone||!viewerPaperURI)return;
 // Sonda de dos puntos (1/64 y 1/16 del area real): la diferencia entre ambas separa el
 // coste fijo del coste por pixel y la extrapolacion decide si este dispositivo rasteriza
 // bitmaps del visor en segundo plano o usa siempre SVG directo. El veredicto 'lento' se
 // recuerda (mismo build, tamano parecido); el 'rapido' se vuelve a medir en cada carga.
 var px=homePx()||1065,tmp=document.createElement('div'),r;
 viewerHost().appendChild(tmp);
 try{r=CasasV2.render(tmp,null,(Math.random()*4294967296)>>>0)}catch(e){if(tmp.parentNode)tmp.parentNode.removeChild(tmp);return}
 var svg=tmp.firstChild;
 if(tmp.remove)tmp.remove();else if(tmp.parentNode)tmp.parentNode.removeChild(tmp);
 if(!svg)return;
 var p1=Math.max(24,Math.round(px/8)),p2=Math.max(48,Math.round(px/4));
 makeBitmap('probe',svg,p1,true).then(function(){
  var t1=lastRasterMs;
  makeBitmap('probe',svg,p2,true).then(function(){
   probeDone=true;
   var t2=lastRasterMs,slope=Math.max(0,(t2-t1)/(p2*p2-p1*p1)),est=t2+slope*(px*px-p2*p2);
   diagLog('sonda '+Math.round(t1)+'/'+Math.round(t2)+'ms px'+p1+'/'+p2+' -> est '+Math.round(est)+'ms '+(est>500||t2>200?'LENTO':'rapido'));
   if(est>500||t2>200){rasterSlow=true;noteRasterSlow(px)}
   if(viewerSet)prefetchViewer();
  });
 });
}
// Primera casa al cargar: render directo para que la portada salga pintada sin esperar descargas; a partir de ahí, el banco.
var firstSeed=(Math.random()*4294967296)>>>0,firstRender=CasasV2.render($('card'),null,firstSeed);
applyHome(firstSeed,firstRender.background,firstRender.shared);
$('again').onclick=fresh;
loadViewerPaper();
fetch('bank/manifest.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(function(list){if(Array.isArray(list)&&list.length){bankList=list;bankPrefetch()}}).catch(function(){});
fetch('community.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(function(list){if(Array.isArray(list))COMMUNITY_LIST=list.filter(valid).slice(0,600);if(typeof Casas!=='undefined')Casas.setCommunity(COMMUNITY_LIST);CasasV2.setCommunity(COMMUNITY_LIST)}).catch(function(){});
var VIEWS=['home','gallery','workshop'],TABS={gallery:'open-gallery',workshop:'open-workshop'};
function show(name){if(name===currentView)return;drawing=null;currentView=name;VIEWS.forEach(function(v){$(v).hidden=v!==name});Object.keys(TABS).forEach(function(v){if(v===name)$(TABS[v]).setAttribute('aria-current','page');else $(TABS[v]).removeAttribute('aria-current')});document.body.style.background=homeBackground;if(name==='workshop'){chooseLast();sync();saveDesign();preview()}if(name==='gallery'){paintGallery();loadHouses(true)}if($('content'))$('content').scrollTop=0;window.scrollTo(0,0);if(name!=='home'){$(name==='gallery'?'gallery-title':'work-title').focus({preventScroll:true})}}
$('open-workshop').onclick=function(){show('workshop')};$('open-gallery').onclick=function(){show('gallery')};$('brand').onclick=function(){show('home')};
var RENDER_V=4,housesBank=null,galleryError=false,housesSig=null,housesAt=0,housesLoading=null,paintedGallery=null,renderQueue=[],renderScheduled=false;
function queueRender(fn){renderQueue.push(fn);if(renderScheduled)return;renderScheduled=true;
 if(!window.requestAnimationFrame){while(renderQueue.length)renderQueue.shift()();renderScheduled=false;return}
 requestAnimationFrame(function flush(){var n=8;while(n--&&renderQueue.length)renderQueue.shift()();if(renderQueue.length)requestAnimationFrame(flush);else renderScheduled=false})}
function bankSig(){return (housesBank||[]).map(function(h){return h.id||('seed'+h.seed)}).join(',')}
async function loadHouses(force){
 if(housesLoading)return housesLoading;
 if(!force&&housesBank&&!galleryError&&Date.now()-housesAt<60000)return;
 housesLoading=(async function(){
  var hadError=galleryError,controller=new AbortController(),timer=setTimeout(function(){controller.abort()},15000);
  try{var published=[],next=null,pages=0;
   do{var url=ENDPOINT+'/gallery'+(next?'?before='+next.before+'&id='+encodeURIComponent(next.id):'');var r=await fetch(url,{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error();var data=await r.json();if(!Array.isArray(data.houses))throw Error();published=published.concat(data.houses.filter(validHouse));next=data.next;}while(next&&++pages<20);
   var r=await fetch('houses.json',{cache:'no-cache',signal:controller.signal});if(!r.ok)throw Error();var old=await r.json();if(!Array.isArray(old))throw Error();var ids=new Set(published.map(function(h){return h.id}));housesBank=published.concat(old.filter(function(h){return validHouse(h)&&!ids.has(h.id)})).slice(0,600);
   var changed=bankSig()!==housesSig;housesSig=bankSig();housesAt=Date.now();galleryError=false;
   if((changed||hadError)&&currentView==='gallery')paintGallery();
  }catch(e){galleryError=true;if(currentView==='gallery')paintGallery()}
  clearTimeout(timer);housesLoading=null;
 })();
 return housesLoading;
}
if(window.requestIdleCallback)requestIdleCallback(function(){loadHouses()});else setTimeout(function(){loadHouses()},2000);
// Con la portada ya servida, los motores de la galería se traen en segundo plano para que abrirla sea inmediato.
if(window.requestIdleCallback)requestIdleCallback(function(){rendererReady(1);rendererReady(3);rendererReady(4)},{timeout:6000});else setTimeout(function(){rendererReady(1);rendererReady(3);rendererReady(4)},8000);
function validHouse(h){if(!h||h.v!==1||![1,2,3,4,5,6].includes(h.rv)||!Number.isInteger(h.seed)||h.seed<0||h.seed>4294967295)return false;if(h.base&&(!(h.rv===3||h.rv===4||h.rv===5||h.rv===6)||h.base.rv!==2||h.base.base||h.base.seed!==h.seed||!validHouse(h.base)))return false;if(h.rv===4||h.rv===5||h.rv===6)return (h.ink==null||((h.rv===5||h.rv===6)&&validInk(h.ink)))&&Array.isArray(h.layers)&&h.layers.length<=4&&new Set(h.layers.map(function(l){return l.kind})).size===h.layers.length&&h.layers.reduce(function(n,l){return n+(l.pieces||[]).length},0)<=24&&h.layers.every(function(l){return KINDS.includes(l.kind)&&Array.isArray(l.pieces)&&l.pieces.length&&l.pieces.every(function(p){return valid(p)&&p.kind===l.kind})});return ['wall','roof','door'].every(function(k){return !h[k]||(valid(h[k])&&h[k].kind===k)})&&Array.isArray(h.windows)&&h.windows.length<=4&&h.windows.every(function(w){return valid(w)&&w.kind==='window'})}
var EXAMPLES=[8020, 31777, 39696, 47615, 55534, 63453, 79291, 87210, 103048, 110967, 118886, 134724, 142643, 166400, 174319, 190157, 198076, 205995, 213914, 221833, 229752, 237671, 245590, 261428, 277266, 301023, 308942, 316861, 324780, 364375];
// Los motores congelados rv1/rv3/rv4 (rv4 pinta también las casas rv5) solo hacen falta para casas
// concretas de la galería y el taller, no para la portada: salen del camino crítico y se cargan
// bajo demanda la primera vez que aparece una casa de esa versión, con copia en caché tras el arranque.
var ASSET_V='20261110-tijeras3',RENDERER_SRC={1:'renderer-v1.js',3:'renderer-v3.js',4:'renderer-v4.js',6:'renderer-v6.js'},RENDERER_GLOBAL={1:'CasasV1',3:'CasasV3',4:'CasasV4',6:'CasasV6'},rendererLoads={},rendererTries={};
// Veredicto recordado solo si es 'slow' y sigue vigente: mismo build de assets y tamano de
// rasterizado parecido (+-25%). Un 'fast' nunca se guarda: cada carga vuelve a sondear, asi
// ninguna estimacion puntual se convierte en permiso permanente para rasterizar en grande.
try{var rasterNote=(localStorage.getItem('casas-raster')||'').split('|');if(rasterNote[0]==='slow'&&rasterNote[1]===ASSET_V&&Math.abs(homePx()-(+rasterNote[2]||0))<=(+rasterNote[2]||1)*.25){rasterSlow=true;probeDone=true}}catch(e){}
// Diagnostico en dispositivo (?diag=1): panel con los tiempos reales de sonda, rasterizaciones
// y esperas por pulsacion. Sin red ni terceros: los datos solo salen si el usuario los enseña.
var DIAG=(typeof location!=='undefined'&&/[?&]diag=1/.test(location.search)),diagBox=null;
function diagLog(m){if(!DIAG)return;if(!diagBox){diagBox=document.createElement('div');diagBox.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99;background:#000c;color:#0f0;font:11px/1.4 monospace;padding:8px;border-radius:8px;max-width:92vw;white-space:pre-wrap';document.body.appendChild(diagBox)}diagBox.textContent+=(diagBox.textContent?'\n':'')+m}
if(DIAG){try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){diagLog('longtask '+Math.round(e.duration)+'ms')})}).observe({entryTypes:['longtask']})}catch(e){}diagLog('diag on | dpr '+(window.devicePixelRatio||1)+' | nota: '+((typeof rasterNote!=='undefined'&&rasterNote[0])||'-'))}
function rendererNeed(rv){return rv===5?4:rv}
function rendererAvailable(rv){var g=RENDERER_GLOBAL[rendererNeed(rv)];return !g||!!window[g]}
function rendererFailed(rv){var g=RENDERER_GLOBAL[rendererNeed(rv)];return g&&!window[g]&&(rendererTries[rendererNeed(rv)]||0)>=3}
function rendererReady(rv){
 var need=rendererNeed(rv),g=RENDERER_GLOBAL[need];
 if(!g||window[g]||(rendererTries[need]||0)>=3)return Promise.resolve();
 // Una descarga fallida limpia la promesa: la siguiente necesidad reintenta (máx. 3 por sesión).
 return rendererLoads[need]||(rendererLoads[need]=new Promise(function(res){var s=document.createElement('script');rendererTries[need]=(rendererTries[need]||0)+1;s.src=RENDERER_SRC[need]+'?v='+ASSET_V;s.onload=res;s.onerror=function(){delete rendererLoads[need];res()};document.head.appendChild(s)}));
}
function rendererFor(rv){return rv===1?CasasV1:rv===3?CasasV3:rv===4?CasasV4:rv===5?CasasV5:rv===6?CasasV6:CasasV2}
function paintCard(grid,item,index,set){
  var card=document.createElement('button');card.type='button';card.className='gallery-card';
  card.setAttribute('aria-label',item.label+'. Abrir en grande. Casa '+(index+1)+' de '+set.length+'.');
  card.onclick=function(){openViewer(set,index,card)};
  var art=document.createElement('div');art.className='art';art.setAttribute('aria-hidden','true');card.appendChild(art);grid.appendChild(card);
  var work=function(){
    if(!rendererAvailable(item.rv)){if(rendererFailed(item.rv)){card.remove();return}rendererReady(item.rv).then(function(){queueRender(work)});return}
    // Render in the connected offscreen host: the grid can be display:none (user left the tab) and getBBox needs layout.
    if(item.example)CasasV2.setCommunity([]);
    try{
      var tmp=document.createElement('div');viewerHost().appendChild(tmp);
      var r=rendererFor(item.rv).render(tmp,item.design,item.seed);
      if(tmp.firstChild)art.replaceChildren(tmp.firstChild);
      if(tmp.remove)tmp.remove();else if(tmp.parentNode&&tmp.parentNode.removeChild)tmp.parentNode.removeChild(tmp);
    }catch(e){card.remove()}
    finally{if(item.example)CasasV2.setCommunity(COMMUNITY_LIST)}
  };
  queueRender(work);
}
var EXAMPLE_SET=EXAMPLES.map(function(seed){return {design:null,seed:seed,rv:2,example:true,label:'Casa de ejemplo hecha con recortes de papel'}});
function paintGallery(){
  // One grid, one carousel: visitor houses first, then the fixed examples, no sections.
  var sig=bankSig();
  if(sig!==paintedGallery){
    paintedGallery=sig;
    var grid=$('gallery-grid');grid.replaceChildren();
    var items=(housesBank||[]).map(function(h){return {design:h,seed:h.seed,rv:h.rv,label:'Casa de visitante hecha con recortes de papel'}}).concat(EXAMPLE_SET);
    var rvs={};items.forEach(function(item){rvs[rendererNeed(item.rv||2)]=1});Object.keys(rvs).forEach(function(rv){rendererReady(+rv)});
    items.forEach(function(item,i){paintCard(grid,item,i,items)});
  }
  setText('gallery-empty',galleryError?'Las casas de visitantes no se han podido cargar. Prueba a recargar.':'');
  $('gallery-empty').hidden=!$('gallery-empty').textContent;
}
var viewerSet=null,viewerIndex=0,viewerReturnFocus=null,viewerCache={},viewerCacheKeys=[];
function viewerKey(item){return item.example?'e'+item.seed:'v'+(item.design&&item.design.id||item.seed)+'-'+(item.rv||'')}
var viewerMeasureHost=null;
function viewerHost(){
  // rv1-4 measure their composed group with getBBox, which needs a laid-out (connected, not display:none) host; keep it offscreen.
  if(!viewerMeasureHost){viewerMeasureHost=document.createElement('div');viewerMeasureHost.setAttribute('aria-hidden','true');viewerMeasureHost.style.cssText='position:absolute;left:-10000px;top:0;width:100px;height:100px;visibility:hidden';document.body.appendChild(viewerMeasureHost)}
  return viewerMeasureHost;
}
function renderViewerItem(item){
  var key=viewerKey(item),hit=viewerCache[key];
  if(hit)return hit;
  var art=document.createElement('div'),r=null;
  viewerHost().appendChild(art);
  if(item.example)CasasV2.setCommunity([]);
  try{r=rendererFor(item.rv).render(art,item.design,item.seed)}finally{if(item.example)CasasV2.setCommunity(COMMUNITY_LIST)}
  hit={svg:art.firstChild,background:r.background};
  if(art.remove)art.remove();else if(art.parentNode&&art.parentNode.removeChild)art.parentNode.removeChild(art);
  viewerCache[key]=hit;viewerCacheKeys.push(key);
  if(viewerCacheKeys.length>12)delete viewerCache[viewerCacheKeys.shift()];
  return hit;
}
// Viewer bitmaps: rasterizing a house (shadow filters + paper texture) at full size is the expensive part of changing house.
// Neighbours are rasterized ahead of time to a canvas with the same rasterizer, so stepping only swaps a ready bitmap.
var viewerBitmaps={},viewerBitmapKeys=[],viewerPaperURI=null,viewerPaperTried=false,viewerPrefetchTimer=0,viewerPrefetchRun=0;
function schedule(fn){if(window.requestIdleCallback)requestIdleCallback(fn,{timeout:400});else setTimeout(fn,80)}
function loadViewerPaper(){
  if(viewerPaperTried)return;viewerPaperTried=true;
  try{fetch('paper.png').then(function(r){return r.blob()}).then(function(b){var fr=new FileReader();fr.onload=function(){viewerPaperURI=fr.result;if(viewerSet)prefetchViewer();startProbe()};fr.onerror=function(){paperFailed=true};fr.readAsDataURL(b)}).catch(function(){paperFailed=true})}catch(e){paperFailed=true}
}
function viewerPx(){var w=$('viewer-art').clientWidth;return w>0?Math.round(w*Math.min(window.devicePixelRatio||1,3)):0}
function makeBitmap(key,svg,px,probe){
  return new Promise(function(resolve){
    var t0=performance.now();
    function done(cv){
      lastRasterMs=performance.now()-t0;
      // Red de seguridad: si la primera rasterización a tamaño real supera el umbral, este
      // dispositivo no vuelve a rasterizar en segundo plano y los refresh van con render directo.
      if(!probe&&!rasterTimed){rasterTimed=true;if(lastRasterMs>800){rasterSlow=true;noteRasterSlow(px)}}
      if(!probe)diagLog('raster '+px+'px '+Math.round(lastRasterMs)+'ms'+(rasterSlow?' -> LENTO':''))
      resolve(cv)
    }
    try{
      var c=svg.cloneNode(true);c.setAttribute('width',px);c.setAttribute('height',px);
      var xml=new XMLSerializer().serializeToString(c).replace('href="paper.png"','href="'+viewerPaperURI+'"');
      var url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'})),img=new Image();
      img.onload=function(){
        try{var cv=document.createElement('canvas');cv.width=cv.height=px;cv.getContext('2d').drawImage(img,0,0,px,px);URL.revokeObjectURL(url);done(cv)}catch(e){URL.revokeObjectURL(url);done(null)}
      };
      img.onerror=function(){URL.revokeObjectURL(url);done(null)};
      img.src=url;
    }catch(e){done(null)}
  });
}
function prefetchViewer(){
  if(!viewerSet||!viewerPaperURI||rasterSlow||!probeDone)return;
  var run=++viewerPrefetchRun,px=viewerPx();if(!px)return;
  var n=viewerSet.length,order=[0,1,-1,2,-2].filter(function(o,i,a){return Math.abs(o)<=Math.floor(n/2)||o===0}),base=viewerIndex,keys={};
  var items=order.map(function(o){return viewerSet[(base+o+n*3)%n]}).filter(function(it){var k=viewerKey(it);if(keys[k])return false;keys[k]=1;return true});
  (function next(i){
    if(run!==viewerPrefetchRun||!viewerSet||i>=items.length)return;
    schedule(function(){
      if(run!==viewerPrefetchRun||!viewerSet)return;
      var it=items[i],k=viewerKey(it),have=viewerBitmaps[k];
      if(have&&have.px===px){next(i+1);return}
      rendererReady(it.rv||2).then(function(){
        if(run!==viewerPrefetchRun||!viewerSet)return;
        try{
          var hit=renderViewerItem(it);
          if(!hit.svg){next(i+1);return}
          makeBitmap(k,hit.svg,px).then(function(cv){
            if(cv&&run===viewerPrefetchRun&&viewerSet){
              if(!viewerBitmaps[k])viewerBitmapKeys.push(k);
              viewerBitmaps[k]={cv:cv,px:px};
              while(viewerBitmapKeys.length>7)delete viewerBitmaps[viewerBitmapKeys.shift()];
              if(viewerKey(viewerSet[viewerIndex])===k)showViewerBitmap(k);
            }
            next(i+1);
          });
        }catch(e){next(i+1)}
      });
    });
  })(0);
}
function showViewerBitmap(k){
  var b=viewerBitmaps[k],art=$('viewer-art');
  if(b&&b.px===viewerPx()&&art.firstChild&&art.firstChild.tagName==='svg'&&viewerKey(viewerSet[viewerIndex])===k)art.replaceChildren(b.cv);
}
function paintViewer(){
  var item=viewerSet[viewerIndex],d=$('viewer'),hit,key=viewerKey(item),bm=viewerBitmaps[key];
  try{
    hit=renderViewerItem(item);
    if(bm&&bm.px===viewerPx())$('viewer-art').replaceChildren(bm.cv);
    else if(hit.svg)$('viewer-art').replaceChildren(hit.svg);
    d.style.background=hit.background;d.style.setProperty('--onpage',onpage(hit.background));
  }catch(e){if(d.open)d.close();return}
  setText('viewer-label',item.label+', '+(viewerIndex+1)+' de '+viewerSet.length);
  setText('viewer-count',(viewerIndex+1)+' / '+viewerSet.length);
  loadViewerPaper();
  clearTimeout(viewerPrefetchTimer);
  viewerPrefetchTimer=setTimeout(prefetchViewer,120);
}
function openViewer(set,index,origin){
  if(!set.length)return;viewerSet=set;viewerIndex=index;viewerReturnFocus=origin||null;
  var d=$('viewer');if(!d.open)d.showModal();
  requestPaint();if(d.open)$('viewer-close').focus({preventScroll:true});
}
function stepViewer(delta){if(!viewerSet||viewerSet.length<2)return;viewerIndex=(viewerIndex+delta+viewerSet.length)%viewerSet.length;requestPaint()}
// Si el motor de esta casa aún no ha llegado, se pinta en cuanto carga; si ya está, se pinta al momento.
function requestPaint(){var item=viewerSet&&viewerSet[viewerIndex];if(!item)return;if(rendererAvailable(item.rv||2))paintViewer();else rendererReady(item.rv||2).then(function(){if(viewerSet&&viewerSet[viewerIndex]===item)paintViewer()})}
$('viewer-prev').onclick=function(){stepViewer(-1)};
$('viewer-next').onclick=function(){stepViewer(1)};
$('viewer-close').onclick=function(){$('viewer').close()};
$('viewer').onclose=function(){viewerSet=null;viewerPrefetchRun++;clearTimeout(viewerPrefetchTimer);viewerBitmaps={};viewerBitmapKeys=[];if(viewerReturnFocus&&document.contains(viewerReturnFocus))viewerReturnFocus.focus()};
$('viewer').onkeydown=function(e){if(e.key==='ArrowLeft'){e.preventDefault();stepViewer(-1)}else if(e.key==='ArrowRight'){e.preventDefault();stepViewer(1)}};
(function(){var start=null,stage=$('viewer-stage');stage.onpointerdown=function(e){if(e.target.closest('button'))return;start={x:e.clientX,y:e.clientY}};stage.onpointerup=function(e){if(!start)return;var dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.4)stepViewer(dx<0?1:-1)};stage.onpointercancel=function(){start=null}})();
function previewRv(){return layers.some(function(l){return l.pieces.some(function(p){return p.holes&&p.holes.length})})?6:5}
function houseSnapshot(){var h={v:1,rv:previewRv(),seed:previewSeed};if(base){h.base=base;if(Object.keys(tints).length)h.tints=tints;if(omit.length)h.omit=omit}h.layers=layers;if(ink.length)h.ink=ink;return JSON.stringify(h)}
var previewBackground='#f7f5f0';function preview(){if($('workshop').hidden)return;var rv=previewRv();if(!rendererAvailable(rv)){rendererReady(rv).then(function(){preview()});return}var r=rendererFor(rv).render($('preview'),JSON.parse(houseSnapshot()),previewSeed);previewBackground=r.background;$('stage').style.background=r.background}
function resetCanvas(){pending=[];drawing=null;kbUsed=false}
function changed(){setText('house-status','');sync();preview();saveDesign()}
var TOOL_HELP={pencil:'Lápiz: arrastra para dibujar sobre la casa. El trazo queda por encima del papel.',hole:'Tijeras: dibuja un contorno dentro de un papel para abrir un hueco, o de borde a borde para recortar una muesca. El papel nunca se parte en dos.',eraser:'Goma: arrastra sobre el dibujo para borrar solo esa zona. No borra el papel.'};
function controls(){var p=selectedPiece(),canDelete=p&&selected!=='base';$('undo').disabled=(mode==='cut'&&!pending.length)&&!undoStack.length||mode==='draw'&&!undoStack.length;$('clear').disabled=!pending.length&&!designCount()&&!ink.length;$('delete-piece').hidden=!canDelete;$('close-outline').hidden=pending.length<3;$('submit-house').disabled=!designCount()||houseBusy||!!submittedHouses[houseSnapshot()];setText('work-help',mode==='draw'?(TOOL_HELP[tool]||''):tool==='hole'?(pending.length>=3?'Toca el primer punto para cerrar, o pulsa Cerrar recorte.':TOOL_HELP.hole):pending.length>=3?'Toca el primer punto para cerrar, o pulsa Cerrar recorte.':p?'Recorte seleccionado. Cambia su papel o elimínalo. Toca fuera de él para empezar otro.':'Dibuja el contorno: arrastra, o toca punto a punto. Cada recorte se añade a esta capa.')}
function paintSlots(){document.querySelectorAll('#kinds .tool').forEach(function(b){var k=b.getAttribute('data-kind'),l=layer(k),n=(l?l.pieces.length:0)+(base&&!omit.includes(k)?k==='window'?base.windows.length:base[k]?1:0:0);b.textContent=KIND_NAME[k]+(n>1?' ×'+n:n?' ✓':'');b.setAttribute('aria-pressed',String(k===draft.kind));document.querySelector('.kind-x[data-clear='+k+']').hidden=!n})}
function paperName(){var p=selectedPiece();setText('paper-name',PAPER_NAMES[PAPERS.indexOf(p?p.color:draft.color)]||'')}
function paintSwatches(){var p=selectedPiece(),c=p?p.color:draft.color;document.querySelectorAll('#papers .swatch').forEach(function(b,i){b.setAttribute('aria-pressed',String(PAPERS[i]===c))})}
function sync(){paintSlots();paperName();paintSwatches();controls();paint()}
function el(name,attrs){var n=document.createElementNS(SVGNS,name);for(var k in attrs)n.setAttribute(k,attrs[k]);return n}
function ptsToD(pts,close){return 'M'+pts.map(function(p){return p.join(' ')}).join('L')+(close?'Z':'')}
function paint(){var g=$('strokes');g.replaceChildren();if(mode==='draw'){if(inkLive&&inkLive.pts.length>1)g.appendChild(CasasV5.strokeNode(inkLive,true));if(erasing&&erasing.at)g.appendChild(el('circle',{cx:erasing.at[0],cy:erasing.at[1],r:ERASE_R,'class':'eraser-tip'}));return}var p=selectedPiece();if(p&&selected!=='base'){var pd=ptsToD(p.outline,true)+(p.holes||[]).map(function(h){return ptsToD(h,true)}).join('');g.appendChild(el('path',{d:pd,'class':'halo','stroke-width':.8}));g.appendChild(el('path',{d:pd,fill:'none',stroke:'#252525','stroke-width':.25,'stroke-dasharray':'1 1'}))}var live=drawing&&drawing.moved?drawing.pts:pending;if(live.length>=3&&tool!=='hole')g.appendChild(el('path',{d:ptsToD(live,true),fill:draft.color,opacity:.65}));if(live.length){g.appendChild(el('path',{d:ptsToD(live),'class':'halo','stroke-width':1.8}));var pn={d:ptsToD(live),'class':'pending'};if(tool==='hole')pn['stroke-dasharray']='1.6 1.4';g.appendChild(el('path',pn))}if(pending.length>=3)g.appendChild(el('path',{d:ptsToD([pending[pending.length-1],pending[0]]),'class':'closing'}));pending.forEach(function(p,i){g.appendChild(el('circle',{'class':'halo',cx:p[0],cy:p[1],r:1.5,fill:'#fff'}));g.appendChild(el('circle',{'class':'vtx',cx:p[0],cy:p[1],r:.8}));if(i===0&&pending.length>=3)g.appendChild(el('circle',{'class':'vtx-first',cx:p[0],cy:p[1],r:2.6}))});if(kbUsed)g.appendChild(el('path',{d:'M'+(cursor[0]-2)+' '+cursor[1]+'h4M'+cursor[0]+' '+(cursor[1]-2)+'v4','class':'kcursor'}))}
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
function finishOutline(raw){if(tool==='hole'){finishHole(raw);return}var pts=simplify(raw.concat([raw[0]]),.4);pts.pop();if(pts.length>160){drawing=null;paint();controls();setText('draft-note','Ese contorno tiene demasiados cambios. Prueba un trazo más sencillo.');return}pts=pts.map(function(p){return p.map(function(n){return Math.round(n*10)/10})});var xs=pts.map(function(p){return p[0]}),ys=pts.map(function(p){return p[1]});if(pts.length<3||Math.max.apply(null,xs)-Math.min.apply(null,xs)<4||Math.max.apply(null,ys)-Math.min.apply(null,ys)<4||area2(pts)<15){drawing=null;paint();controls();setText('draft-note','Ese recorte no encierra forma suficiente.');return}if(count()>=24){drawing=null;paint();controls();setText('draft-note','Tu casa ya tiene 24 recortes. Puedes deshacer o borrar una capa antes de añadir otro.');return}checkpoint();var l=layer();if(!l){l={kind:draft.kind,pieces:[]};layers.push(l)}l.pieces.push({v:2,kind:draft.kind,color:draft.color,material:draft.material,outline:pts,marks:[]});selected=l.pieces.length-1;resetCanvas();changed();setText('draft-note','Recorte añadido. Sigue seleccionado; los anteriores se conservan.')}
function inside(p,pts){var c=false;for(var i=0,j=pts.length-1;i<pts.length;j=i++){var a=pts[i],b=pts[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
// Tijeras: huecos interiores (fill-rule evenodd) y muescas de borde (empalme en el contorno),
// solo sobre papeles añadidos por la visitante, nunca sobre la casa base generada.
function inPiece(p,pc){if(!inside(p,pc.outline))return false;return !(pc.holes||[]).some(function(h){return inside(p,h)})}
function boundaryProj(p,outline){var best=null;for(var i=0;i<outline.length;i++){var a=outline[i],b=outline[(i+1)%outline.length],dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L)):0,q=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(!best||d<best.d)best={pt:q,seg:i,t:t,d:d}}return best}
function arcInt(outline,from,to){var n=outline.length;if(from.seg===to.seg&&from.t<=to.t)return [];var out=[],i=(from.seg+1)%n;do{out.push(outline[i]);i=(i+1)%n}while(i!==(to.seg+1)%n);return out}
function polyLen(a){var L=0;for(var i=1;i<a.length;i++)L+=Math.hypot(a[i][0]-a[i-1][0],a[i][1]-a[i-1][1]);return L}
function spliceNotch(outline,pts){
 var A=boundaryProj(pts[0],outline),B=boundaryProj(pts[pts.length-1],outline);
 var fInt=arcInt(outline,A,B),cInt=arcInt(outline,B,A);
 var fLen=polyLen([A.pt].concat(fInt,[B.pt])),cLen=polyLen([B.pt].concat(cInt,[A.pt]));
 var pathInt=pts.slice(1,-1);
 // Las tijeras sustituyen el arco de borde más corto por el trazo dibujado.
 if(fLen<=cLen)return [A.pt].concat(pathInt,[B.pt],cInt);
 return [A.pt].concat(fInt,[B.pt],pathInt.slice().reverse());
}
function segInt(a,b,c,d){var s=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),t=(b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]),u=(d[0]-c[0])*(a[1]-c[1])-(d[1]-c[1])*(a[0]-c[0]),v=(d[0]-c[0])*(b[1]-c[1])-(d[1]-c[1])*(b[0]-c[0]);return (s>0)!==(t>0)&&(u>0)!==(v>0)}
function holesOverlap(a,b){
 if(a.some(function(p){return inside(p,b)}))return true;
 if(b.some(function(p){return inside(p,a)}))return true;
 for(var i=0;i<a.length;i++)for(var j=0;j<b.length;j++)if(segInt(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]))return true;
 return false}
function finishHole(raw){
 function bail(msg){drawing=null;paint();controls();setText('draft-note',msg)}
 if(raw.length<3)return bail('Ese corte no encierra forma suficiente.');
 var r10=function(p){return [Math.round(p[0]*10)/10,Math.round(p[1]*10)/10]};
 raw=raw.map(r10);
 // El papel objetivo es el que cubre más puntos del trazo (en empate, el más alto): un trazo
 // que empieza o acaba justo en el borde tiene el centroide fuera y antes no encontraba papel.
 var target=null,best=0;
 for(var i=layers.length-1;i>=0;i--){var pcs=layers[i].pieces;for(var j=pcs.length-1;j>=0;j--){var n=0;for(var k=0;k<raw.length;k++)if(inPiece(raw[k],pcs[j]))n++;if(n>best){best=n;target=pcs[j]}}}
 if(!target)return bail('Las tijeras solo cortan los papeles que has añadido tú.');
 var outline=target.outline,hs=target.holes||[];
 // El dedo tiembla: un punto fuera por muy poco se apoya en el borde en vez de anular el corte.
 var clampEdge=function(p){return inside(p,outline)?p:boundaryProj(p,outline).pt};
 var A=boundaryProj(raw[0],outline),B=boundaryProj(raw[raw.length-1],outline);
 var closedish=Math.hypot(raw[0][0]-raw[raw.length-1][0],raw[0][1]-raw[raw.length-1][1])<=5;
 if(!closedish&&A.d<=4&&B.d<=4){
  // Muesca de borde: el trazo va de borde a borde y sustituye el arco más corto.
  var eps=.4,ring2=null;
 for(;;){ring2=spliceNotch(outline,simplify(raw,eps).map(clampEdge)).map(r10);ring2=ring2.filter(function(p,q){return q===0||Math.hypot(p[0]-ring2[q-1][0],p[1]-ring2[q-1][1])>=.05});if(ring2.length<=160||eps>3)break;eps*=1.5}
  if(ring2.length>160)return bail('Ese corte tiene demasiados cambios. Prueba un trazo más sencillo.');
  var xs=ring2.map(function(p){return p[0]}),ys=ring2.map(function(p){return p[1]});
  if(ring2.length<3||Math.max.apply(null,xs)-Math.min.apply(null,xs)<4||Math.max.apply(null,ys)-Math.min.apply(null,ys)<4||area2(ring2)<15)return bail('Ese corte dejaría el papel demasiado pequeño.');
  var a0=area2(outline);
  if(area2(ring2)<a0*.6)return bail('Ese corte partiría el papel en dos.');
  if(a0-area2(ring2)<2)return bail('Ese corte apenas roza el papel. Entra un poco más.');
  checkpoint();target.outline=ring2;resetCanvas();changed();setText('draft-note','Muesca recortada en tu '+KIND_NAME[target.kind].toLowerCase()+'. Puedes deshacer.');return;
 }
 // Hueco interior: anillo cerrado dentro de un solo papel; si roza el borde, la mordida queda
 // pegada a él (el evenodd rellenaría de papel lo que sobresaliera, así que se apoya en el borde).
 var eps2=.4,ring=null;
 for(;;){ring=simplify(raw.concat([raw[0]]),eps2);ring.pop();if(ring.length<=60||eps2>3)break;eps2*=1.5}
 if(ring.length<3)return bail('Ese hueco no encierra forma suficiente.');
 if(ring.length>60)return bail('Ese contorno tiene demasiados cambios. Prueba un trazo más sencillo.');
 var maxOut=0;for(var m=0;m<ring.length;m++){if(!inside(ring[m],outline)){var dd=boundaryProj(ring[m],outline).d;if(dd>maxOut)maxOut=dd}}
 if(maxOut>3)return bail('Dibuja el hueco dentro del papel, o empieza y acaba en su borde.');
 ring=ring.map(clampEdge).map(r10);
 ring=ring.filter(function(p,q){return q===0||Math.hypot(p[0]-ring[q-1][0],p[1]-ring[q-1][1])>=.05});
 if(ring.length<3)return bail('Ese hueco no encierra forma suficiente.');
 if(area2(ring)<2)return bail('Ese hueco es demasiado pequeño para verlo.');
 if(hs.length>=6)return bail('Este papel ya tiene 6 huecos.');
 if(hs.reduce(function(n,h){return n+h.length},0)+ring.length>200)return bail('Este papel ya no admite más huecos.');
 if(hs.some(function(h){return holesOverlap(h,ring)}))return bail('Ahí ya hay un hueco.');
 checkpoint();target.holes=hs.concat([ring]);resetCanvas();changed();setText('draft-note','Hueco abierto en tu '+KIND_NAME[target.kind].toLowerCase()+'. Puedes deshacer.');
}
$('drawing').onpointerdown=function(e){if(e.button&&e.button!==0)return;e.preventDefault();$('drawing').setPointerCapture(e.pointerId);if(mode==='draw'){setText('draft-note','');var q=point(e);if(tool==='eraser'){erasing={did:false};eraseAt(q)}else inkLive={k:'p',c:GRAPHITE,pts:[q]};paint();return}drawing={pts:[point(e)],moved:false};setText('draft-note','')};
$('drawing').onpointermove=function(e){if(mode==='draw'){if(inkLive){var q=point(e),l=inkLive.pts[inkLive.pts.length-1];if(Math.hypot(l[0]-q[0],l[1]-q[1])>.5&&inkLive.pts.length<500){inkLive.pts.push(q);paint()}}else if(erasing)eraseAt(point(e));return}if(!drawing)return;var p=point(e),last=drawing.pts[drawing.pts.length-1];if(Math.hypot(last[0]-p[0],last[1]-p[1])>1.2&&drawing.pts.length<600){drawing.moved=true;drawing.pts.push(p);paint()}};
function segDist(p,a,b){var dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
// La goma actúa como un borrador real sobre el dibujo (lápiz y trazos de cera antiguos): quita
// solo la zona tocada y conserva el resto del trazo. Nunca toca el papel recortado.
var ERASE_R=3;
function eraseStroke(s,p){
 var keep=[],run=[s.pts[0]];
 for(var i=0;i<s.pts.length-1;i++){
  if(segDist(p,s.pts[i],s.pts[i+1])>ERASE_R)run.push(s.pts[i+1]);
  else{if(run.length>1)keep.push(run);run=[s.pts[i+1]]}
 }
 if(run.length>1)keep.push(run);
 if(keep.length===1&&keep[0].length===s.pts.length)return [s];
 return keep.map(function(pts){return {k:s.k,c:s.c,pts:pts}});
}
function eraseAt(p){
 erasing.at=p;
 var out=[],touched=false,blocked=false;
 for(var i=0;i<ink.length;i++){
  var parts=eraseStroke(ink[i],p);
  if(parts.length===1&&parts[0]===ink[i]){out.push(ink[i]);continue}
  // Con el cupo de trazos lleno no cabe partir: se conserva el trazo original intacto.
  if(out.length+parts.length+(ink.length-i-1)>40){out.push(ink[i]);blocked=true;continue}
  touched=true;
  for(var j=0;j<parts.length;j++)out.push(parts[j]);
 }
 paint();
 if(blocked)setText('draft-note','Ya no caben más trazos para partir este: borra alguno entero o usa Deshacer.');
 else if(touched)setText('draft-note','');
 if(!touched)return;
 if(!erasing.did){checkpoint();erasing.did=true}
 ink=out;preview();
}
function endInk(){if(inkLive){var s=inkLive;inkLive=null;var pts=s.pts.length<2?[s.pts[0],[Math.min(100,s.pts[0][0]+.1),s.pts[0][1]]]:simplify(s.pts,.25),eps=.25;while(pts.length>120){eps*=1.5;pts=simplify(s.pts,eps)}if(ink.length>=40||ink.reduce(function(n,x){return n+x.pts.length},0)+pts.length>1600){setText('draft-note','Ya no caben más trazos. Borra alguno con la goma para seguir dibujando.');paint();return}checkpoint();ink=ink.concat([{k:s.k,c:s.c,pts:pts}]);setText('draft-note','');changed();return}if(erasing){var d=erasing.did;erasing=null;if(d)changed();else paint()}}
function endStroke(){if(mode==='draw'){endInk();return}if(!drawing)return;var d=drawing;drawing=null;if(d.moved&&d.pts.length>=3){finishOutline(d.pts);return}var p=d.pts[0];if(pending.length>=3&&Math.hypot(p[0]-pending[0][0],p[1]-pending[0][1])<=4){finishOutline(pending);return}if(!pending.length&&selected!==null){var l=layer();if(l){for(var i=l.pieces.length-1;i>=0;i--)if(inPiece(p,l.pieces[i])){selected=i;draft.color=l.pieces[i].color;sync();return}}selected=null;sync();return}selected=null;pending.push(p);sync()}
$('drawing').onpointerup=endStroke;function cancelStroke(){drawing=null;inkLive=null;erasing=null;paint();controls()}$('drawing').onpointercancel=cancelStroke;$('drawing').onlostpointercapture=cancelStroke;
$('drawing').onkeydown=function(e){if(mode==='draw'){if(e.key==='Escape'&&(inkLive||erasing)){e.preventDefault();cancelStroke()}return}var step=e.shiftKey?8:2,ok=true;if(e.key==='ArrowLeft')cursor[0]=Math.max(0,cursor[0]-step);else if(e.key==='ArrowRight')cursor[0]=Math.min(100,cursor[0]+step);else if(e.key==='ArrowUp')cursor[1]=Math.max(0,cursor[1]-step);else if(e.key==='ArrowDown')cursor[1]=Math.min(100,cursor[1]+step);else if(e.key==='Enter'||e.key===' '){selected=null;pending.push(cursor.slice())}else if(e.key==='c'||e.key==='C'){if(pending.length>=3)finishOutline(pending)}else if(e.key==='Escape')resetCanvas();else ok=false;if(ok){e.preventDefault();kbUsed=true;sync()}};
$('close-outline').onclick=function(){if(pending.length>=3)finishOutline(pending)};
$('delete-piece').onclick=function(){var l=layer();if(!l||!Number.isInteger(selected)||!selectedPiece())return;checkpoint();l.pieces.splice(selected,1);if(!l.pieces.length)layers=layers.filter(function(x){return x!==l});selected=null;resetCanvas();changed();setText('draft-note','Recorte eliminado. Puedes deshacer.')};
PAPERS.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('aria-label','Papel '+PAPER_NAMES[i]);var span=document.createElement('span');span.style.setProperty('--ink',c);b.appendChild(span);b.onclick=function(){var p=selectedPiece();if(p&&p.color!==c){checkpoint();if(selected==='base'){if(draft.kind==='window'){tints.windows=(tints.windows||[]).slice();tints.windows[base.windows.length-1]=c}else tints[draft.kind]=c}else p.color=c}draft.color=c;changed();setText('draft-note',p?'Papel del recorte seleccionado: '+PAPER_NAMES[i]+'.':'Papel para el próximo recorte: '+PAPER_NAMES[i]+'.')};$('papers').appendChild(b)});
document.querySelectorAll('#kinds .tool').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-kind');if(k===draft.kind)return;resetCanvas();draft.kind=k;chooseLast();changed()}});
document.querySelectorAll('.kind-x').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-clear');checkpoint();layers=layers.filter(function(l){return l.kind!==k});if(base&&!omit.includes(k))omit.push(k);if(k===draft.kind){selected=null;resetCanvas()}changed();setText('draft-note','Capa retirada. Puedes deshacer.')}});
$('undo').onclick=function(){if(mode==='cut'&&pending.length)pending.pop();else if(undoStack.length){restore(undoStack.pop());if(mode==='cut')resetCanvas()}changed()};
$('clear').onclick=function(){$('clear-dialog').showModal()};$('cancel-clear').onclick=function(){$('clear-dialog').close()};$('confirm-clear').onclick=function(){checkpoint();ink=[];layers=[];base=null;tints={};omit=[];selected=null;resetCanvas();$('clear-dialog').close();changed();setText('draft-note','')};
$('submit-house').onclick=async function(){if(houseBusy||!designCount())return;houseBusy=true;controls();setText('house-status','Enviando tu casa…');var snapshot=houseSnapshot(),controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
 try{var r=await fetch(ENDPOINT+'/publish-house',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({house:JSON.parse(snapshot),action:'publish',website:$('website').value}),signal:controller.signal});var result=await r.json();if(!r.ok||!result.id||result.status!=='published')throw new Error(result.error||'unavailable');submittedHouses[snapshot]=true;housesBank=[Object.assign(JSON.parse(snapshot),{id:result.id})].concat((housesBank||[]).filter(function(h){return h.id!==result.id}));housesAt=Date.now();show('gallery');setText('house-status','Casa publicada.');}
 catch(e){var text=e.message==='capacity'?'La recepción está llena por ahora. Tu casa sigue aquí; prueba otro día.':'No hemos podido confirmar el envío. Tu casa sigue aquí. Puedes reintentarlo.';setText('house-status',text)}finally{clearTimeout(timer);houseBusy=false;controls();}};
var toolBtns={cut:$('tool-cut'),hole:$('tool-hole'),pencil:$('tool-pencil'),eraser:$('tool-eraser')};
var CUT_DESC=$('draw-desc').textContent,CUT_TITLE=$('draw-title').textContent;
function applyMode(){mode=(tool==='pencil'||tool==='eraser')?'draw':'cut';var d=mode==='draw';$('cut-ui').style.display=(d||tool==='hole')?'none':'';$('close-outline').style.display=d?'none':'';$('delete-piece').style.display=d?'none':'';for(var k in toolBtns)toolBtns[k].setAttribute('aria-pressed',String(tool===k));setText('draw-title',d?'Lienzo para dibujar encima de la casa':tool==='hole'?'Lienzo para abrir huecos en el papel':CUT_TITLE);setText('draw-desc',d?(tool==='eraser'?'Arrastra sobre el dibujo para borrar solo la zona tocada. Escape cancela.':'Arrastra para dibujar. Escape cancela el trazo en curso.'):tool==='hole'?'Arrastra para trazar el contorno: entero dentro de un papel para un hueco, o de borde a borde para una muesca, sin partir el papel. Con teclado: las flechas mueven el cursor, Intro añade un punto y la tecla C cierra.':CUT_DESC)}
Object.keys(toolBtns).forEach(function(k){function pick(){if(k===tool)return;tool=k;if(k==='hole')selected=null;drawing=null;inkLive=null;erasing=null;applyMode();sync()}
 toolBtns[k].onclick=pick;
 // En táctil, el primer toque tras un arrastre en el lienzo a veces no genera click; pointerup
 // hace el cambio y el click que sí llega no repite nada, porque pick sale si k===tool.
 toolBtns[k].onpointerup=function(e){if(e.pointerType==='touch')pick()};});
applyMode();
chooseLast();window.addEventListener('pagehide',saveDesign);
})();
