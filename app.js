(function(){
'use strict';
var $=function(id){return document.getElementById(id)},SVGNS='http://www.w3.org/2000/svg';
var PAPERS=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a'],PAPER_NAMES=['Crema','Rosa','Rojo','Azul','Verde','Ocre','Gris','Noche'];
var INKS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34'],INK_NAMES=['Grafito','Tierra','Azul','Rojo','Verde','Ocre'];
var ENDPOINT='https://casas-de-papel-pieces.rafagarces87-store.workers.dev';
var draft={v:2,kind:'window',color:PAPERS[3],material:'pencil',outline:null,marks:[]};
var tool='cut',ink=INKS[0],width=2,drawing=null,pending=[],cursor=[50,50],previewSeed=1049771,saveTimer,previewTimer,submitBusy=false,submittedHash='',previousFocus,homeScroll=0;
var KEY='casas-piece-v2';
try{var saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&valid(saved))draft=saved}catch(e){}
try{if(localStorage.getItem('casas-piece-v1'))$('legacy-note').hidden=false}catch(e){}
function validPts(a,min,max){return Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(n){return Number.isFinite(n)&&n>=0&&n<=100})})}
function valid(p){return p&&p.v===2&&['wall','door','window'].includes(p.kind)&&PAPERS.includes(p.color)&&['pencil','wax'].includes(p.material)&&(p.outline===null||validPts(p.outline,3,160))&&Array.isArray(p.marks)&&p.marks.length<=12&&p.marks.reduce(function(n,s){return n+s.points.length},0)<=400&&p.marks.every(function(s){return INKS.includes(s.color)&&[1,2,3].includes(s.width)&&validPts(s.points,1,60)})}
function setText(id,text){$(id).textContent=text}
function ready(){return !!(draft.outline&&draft.outline.length>=3)}
function fresh(){var r=Casas.render($('card'));document.body.style.background=r.background;setText('home-status',r.shared?'Esta casa incluye una pieza compartida.':'')}
fresh();$('again').onclick=fresh;
// Load the approved static bank once, without delaying the initial collage.
fetch('community.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(function(list){if(Array.isArray(list))Casas.setCommunity(list.filter(valid).slice(0,600))}).catch(function(){});
$('open-workshop').onclick=function(){previousFocus=document.activeElement;homeScroll=scrollY;$('home').hidden=true;$('workshop').hidden=false;document.body.style.background='#f7f7f7';sync();preview();window.scrollTo(0,0);$('work-title').focus();};
$('back').onclick=function(){endStroke();$('workshop').hidden=true;$('home').hidden=false;document.body.style.background=homeBackground;window.scrollTo(0,homeScroll);(previousFocus||$('open-workshop')).focus();};
var homeBackground=document.body.style.background;var originalFresh=fresh;$('again').onclick=function(){originalFresh();homeBackground=document.body.style.background};
function sync(){$('piece-kind').value=draft.kind;$('material').value=draft.material;paint();controls();paperName()}
function controls(){
  var has=pending.length>0||draft.marks.length>0||ready();
  $('undo').disabled=!has;$('clear').disabled=!has;$('close-outline').disabled=pending.length<3;
  $('save-piece').disabled=!ready();
  $('submit-piece').disabled=!ready()||!$('consent').checked||submitBusy||JSON.stringify(draft)===submittedHash;
}
function changed(){submittedHash='';setText('send-status','');controls();clearTimeout(saveTimer);saveTimer=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(draft));setText('draft-note','Tu borrador se guarda solo en este navegador.')}catch(e){setText('draft-note','Este navegador no deja guardar el borrador. Descarga tu pieza antes de salir.')}},150);clearTimeout(previewTimer);previewTimer=setTimeout(preview,220);}
function el(name,attrs){var n=document.createElementNS(SVGNS,name);for(var k in attrs)n.setAttribute(k,attrs[k]);return n}
function ptsToD(pts,close){return 'M'+pts.map(function(p){return p.join(' ')}).join('L')+(close?'Z':'')}
function paint(){
  var group=$('strokes');group.replaceChildren();
  if(ready())group.appendChild(el('path',{d:ptsToD(draft.outline,true),fill:draft.color,opacity:.92}));
  draft.marks.forEach(function(s){
    group.appendChild(el('path',{d:s.points.length===1?'M'+s.points[0].join(' ')+'l.02 .02':ptsToD(s.points),fill:'none',stroke:s.color,'stroke-width':s.width*(draft.material==='wax'?1.25:.6),'stroke-linecap':'round','stroke-linejoin':'round',opacity:draft.material==='wax'?'.88':'.8'}));
  });
  if(pending.length)group.appendChild(el('path',{d:ptsToD(pending),'class':'pending'}));
  pending.forEach(function(p){group.appendChild(el('circle',{'class':'vtx',cx:p[0],cy:p[1],r:.9}))});
  if(drawing)group.appendChild(el('path',{d:ptsToD(drawing.pts),'class':'outline-live'}));
  if(tool==='cut'&&!drawing)group.appendChild(el('path',{d:'M'+(cursor[0]-3)+' '+cursor[1]+'H'+(cursor[0]+3)+'M'+cursor[0]+' '+(cursor[1]-3)+'V'+(cursor[1]+3),'class':'kcursor'}));
  $('guide').setAttribute('d',draft.kind==='door'?'M26 92V40A24 24 0 0 1 74 40V92Z':draft.kind==='wall'?'M12 12H88V88H12Z':'M22 22H78V78H22Z');
}
function preview(){if($('workshop').hidden)return;var r=Casas.render($('preview'),ready()?draft:null,previewSeed);$('preview-bg').style.background=r.background;}
function point(e){var b=$('drawing').getBoundingClientRect();return [Math.max(0,Math.min(100,Math.round((e.clientX-b.left)/b.width*1000)/10)),Math.max(0,Math.min(100,Math.round((e.clientY-b.top)/b.height*1000)/10))]}
function markTotal(){return draft.marks.reduce(function(n,s){return n+s.points.length},0)}
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
function finishOutline(raw){
  var eps=.4,pts=simplify(raw.concat([raw[0]]),eps);pts.pop();
  while(pts.length>160&&eps<8){eps*=1.5;pts=simplify(raw.concat([raw[0]]),eps);pts.pop()}
  if(pts.length>160)pts=pts.filter(function(p,i){return i%Math.ceil(pts.length/160)===0});
  pts=pts.map(function(p){return[Math.round(p[0]*10)/10,Math.round(p[1]*10)/10]});
  var xs=pts.map(function(p){return p[0]}),ys=pts.map(function(p){return p[1]});
  var w=Math.max.apply(null,xs)-Math.min.apply(null,xs),h=Math.max.apply(null,ys)-Math.min.apply(null,ys);
  if(pts.length<3||w<4||h<4||area2(pts)<15){pending=[];drawing=null;paint();controls();setText('draft-note','Ese contorno es muy pequeño. Hazlo un poco más grande.');return}
  draft.outline=pts;pending=[];drawing=null;paint();changed();
}
$('drawing').onpointerdown=function(e){
  if(e.button&&e.button!==0)return;
  var p=point(e);
  if(tool==='cut'){e.preventDefault();$('drawing').setPointerCapture(e.pointerId);drawing={pts:[p],moved:false};}
  else{
    if(draft.marks.length>=12||markTotal()>=400){setText('draft-note','Has llegado al límite de detalle. Deshaz un trazo para continuar.');return}
    e.preventDefault();$('drawing').setPointerCapture(e.pointerId);drawing={color:ink,width:width,points:[p]};draft.marks.push(drawing);paint();
  }
};
$('drawing').onpointermove=function(e){
  if(!drawing)return;var p=point(e);
  if(tool==='cut'){var last=drawing.pts[drawing.pts.length-1];if(Math.hypot(last[0]-p[0],last[1]-p[1])>1.2){if(drawing.pts.length>=600)return;drawing.moved=true;drawing.pts.push(p);paint()}}
  else{var lastm=drawing.points[drawing.points.length-1];if(Math.hypot(lastm[0]-p[0],lastm[1]-p[1])<.65)return;if(drawing.points.length>=60||markTotal()>=400){endStroke();return}drawing.points.push(p);paint()}
};
function endStroke(){
  if(!drawing)return;
  if(tool==='cut'){var d=drawing;drawing=null;if(d.moved&&d.pts.length>=3)finishOutline(d.pts);else{pending.push(d.pts[0]);paint();controls()}}
  else{drawing=null;changed();}
}
$('drawing').onpointerup=endStroke;$('drawing').onpointercancel=endStroke;$('drawing').onlostpointercapture=endStroke;
$('drawing').onkeydown=function(e){
  if(tool!=='cut')return;
  var step=e.shiftKey?8:2,handled=true;
  if(e.key==='ArrowLeft')cursor[0]=Math.max(0,cursor[0]-step);
  else if(e.key==='ArrowRight')cursor[0]=Math.min(100,cursor[0]+step);
  else if(e.key==='ArrowUp')cursor[1]=Math.max(0,cursor[1]-step);
  else if(e.key==='ArrowDown')cursor[1]=Math.min(100,cursor[1]+step);
  else if(e.key==='Enter'||e.key===' '){pending.push(cursor.slice());if(pending.length>160)pending.shift();}
  else if(e.key==='c'||e.key==='C'){if(pending.length>=3){finishOutline(pending);}}
  else handled=false;
  if(handled){e.preventDefault();paint();controls()}
};
$('close-outline').onclick=function(){if(pending.length>=3)finishOutline(pending)};
function setTool(t){
  if(t==='mark'&&!ready()){setText('draft-note','Primero recorta el contorno: el detalle va dentro de la pieza.');return}
  tool=t;$('tool-cut').setAttribute('aria-pressed',String(t==='cut'));$('tool-mark').setAttribute('aria-pressed',String(t==='mark'));
  $('mark-controls').hidden=t!=='mark';paint();
}
$('tool-cut').onclick=function(){setTool('cut')};$('tool-mark').onclick=function(){setTool('mark')};
function paperName(){$('paper-name').textContent=PAPER_NAMES[PAPERS.indexOf(draft.color)]||''}
PAPERS.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('aria-label','Papel '+PAPER_NAMES[i]);b.setAttribute('aria-pressed',String(c===draft.color));var span=document.createElement('span');span.style.setProperty('--ink',c);b.appendChild(span);b.onclick=function(){draft.color=c;paperName();document.querySelectorAll('#papers .swatch').forEach(function(el2){el2.setAttribute('aria-pressed',String(el2===b))});paint();changed()};$('papers').appendChild(b)});
INKS.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('aria-label','Tinta '+INK_NAMES[i]);b.setAttribute('aria-pressed',String(c===ink));var span=document.createElement('span');span.style.setProperty('--ink',c);b.appendChild(span);b.onclick=function(){ink=c;document.querySelectorAll('#colors .swatch').forEach(function(el2){el2.setAttribute('aria-pressed',String(el2===b))})};$('colors').appendChild(b)});
$('width').onchange=function(){width=Number(this.value)};
$('piece-kind').onchange=function(){draft.kind=this.value;paint();changed()};$('material').onchange=function(){draft.material=this.value;paint();changed()};
$('undo').onclick=function(){
  if(pending.length)pending.pop();
  else if(draft.marks.length)draft.marks.pop();
  else if(ready())draft.outline=null;
  paint();changed();
};
$('clear').onclick=function(){$('clear-dialog').showModal()};$('cancel-clear').onclick=function(){$('clear-dialog').close()};$('confirm-clear').onclick=function(){draft.outline=null;draft.marks=[];pending=[];paint();changed();$('clear-dialog').close()};
$('add-shape').onclick=function(){
  var shape=$('shape').value,pts=[];
  if(shape==='circle'){for(var i=0;i<28;i++){var a=i/28*Math.PI*2;pts.push([50+Math.cos(a)*34,50+Math.sin(a)*34])}}
  else if(shape==='square')pts=[[14,14],[86,14],[86,86],[14,86]];
  else if(shape==='arch'){pts=[[24,90],[24,42]];for(var i=0;i<=10;i++){var a=Math.PI-Math.PI*i/10;pts.push([50+Math.cos(a)*26,42-Math.sin(a)*26])}pts.push([76,42],[76,90]);}
  else if(shape==='triangle')pts=[[50,12],[88,86],[12,86]];
  else pts=[[50,12],[86,50],[50,88],[14,50]];
  finishOutline(pts.map(function(p){return p.map(function(n){return Math.round(n*10)/10})}));
};
$('show-preview').onclick=function(){preview();$('preview-title').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('preview-title').focus({preventScroll:true})};
$('consent').onchange=controls;
function downloadBlob(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},60000)}
async function svgPNG(svg,name,status){var copy=svg.cloneNode(true);if(svg.closest('#card')){var bg=document.createElementNS(SVGNS,'rect');bg.setAttribute('width','100');bg.setAttribute('height','100');bg.setAttribute('fill',homeBackground);copy.insertBefore(bg,copy.firstChild)}var markup=new XMLSerializer().serializeToString(copy),blob=new Blob([markup],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);try{var img=new Image();await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=reject;img.src=url});var canvas=document.createElement('canvas');canvas.width=canvas.height=1800;canvas.getContext('2d').drawImage(img,0,0,1800,1800);var png=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png')});if(!png)throw Error();downloadBlob(png,name+'.png');setText(status,'Imagen preparada. Si no se descarga, prueba mantener pulsada la imagen o usa otro navegador.')}catch(e){downloadBlob(blob,name+'.svg');setText(status,'Este navegador no pudo crear el PNG. Se ha preparado el collage en SVG.')}finally{URL.revokeObjectURL(url)}}
$('download').onclick=function(){svgPNG($('card').querySelector('svg'),'casa-de-papel','home-status')};
$('save-piece').onclick=function(){var holder=document.createElement('div');holder.innerHTML=Casas.pieceSVG(draft);svgPNG(holder.firstChild,'pieza-de-papel','send-status')};
$('submit-piece').onclick=async function(){if(submitBusy||!$('consent').checked||!ready())return;submitBusy=true;controls();setText('send-status','Enviando tu pieza…');var snapshot=JSON.stringify(draft),controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
 try{var r=await fetch(ENDPOINT+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({piece:JSON.parse(snapshot),consent:true,website:$('website').value}),signal:controller.signal});var result=await r.json();if(!r.ok||!result.id)throw new Error(result.error||'unavailable');submittedHash=snapshot;setText('send-status','Pieza recibida para revisión. Todavía no está publicada. Referencia '+result.id.slice(0,8)+'.');try{localStorage.setItem('casas-last-submission',JSON.stringify({id:result.id,time:Date.now()}))}catch(e){}}
 catch(e){var text=e.message==='capacity'?'La recepción está llena por ahora. Tu pieza sigue aquí; descárgala o prueba otro día.':'No hemos podido confirmar el envío. Tu pieza sigue aquí. Puedes reintentarlo: no se duplicará la misma pieza.';setText('send-status',text)}finally{clearTimeout(timer);submitBusy=false;controls();}};
window.addEventListener('pagehide',function(){try{localStorage.setItem(KEY,JSON.stringify(draft))}catch(e){}});
})();
