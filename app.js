(function(){
'use strict';
var $=function(id){return document.getElementById(id)},SVGNS='http://www.w3.org/2000/svg';
var PAPERS=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a'],PAPER_NAMES=['Crema','Rosa','Rojo','Azul','Verde','Ocre','Gris','Noche'];
var INKS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34'];
var KINDS=['wall','door','window','roof'];
var ENDPOINT='https://casas-de-papel-pieces.rafagarces87-store.workers.dev';
var draft={v:2,kind:'window',color:PAPERS[3],material:'pencil',outline:null,marks:[]};
var drawing=null,pending=[],cursor=[50,50],kbUsed=false,previewSeed=1049771,saveTimer,previewTimer,submitBusy=false,submittedMap={},previousFocus,homeScroll=0;
var KEY='casas-piece-v2',DESIGN_KEY='casas-design-v1';
try{var saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&valid(saved))draft=saved}catch(e){}
var design={wall:null,door:null,roof:null,windows:[]};
try{var savedDesign=JSON.parse(localStorage.getItem(DESIGN_KEY)||'null');if(savedDesign){['wall','door','roof'].forEach(function(k){if(valid(savedDesign[k]))design[k]=savedDesign[k]});if(Array.isArray(savedDesign.windows))design.windows=savedDesign.windows.filter(valid).slice(0,4)}}catch(e){}
function saveDesign(){try{localStorage.setItem(DESIGN_KEY,JSON.stringify(design))}catch(e){}}
function designCount(){return (design.wall?1:0)+(design.door?1:0)+(design.roof?1:0)+design.windows.length}
var KIND_NAME={wall:'Pared',door:'Puerta',window:'Ventana',roof:'Tejado'},KIND_ART={wall:'la pared',door:'la puerta',window:'la ventana',roof:'el tejado'};
try{if(localStorage.getItem('casas-piece-v1'))$('legacy-note').hidden=false}catch(e){}
function validPts(a,min,max){return Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(n){return Number.isFinite(n)&&n>=0&&n<=100})})}
function valid(p){return p&&p.v===2&&KINDS.includes(p.kind)&&PAPERS.includes(p.color)&&['pencil','wax'].includes(p.material)&&(p.outline===null||validPts(p.outline,3,160))&&Array.isArray(p.marks)&&p.marks.length<=12&&p.marks.reduce(function(n,s){return n+s.points.length},0)<=400&&p.marks.every(function(s){return INKS.includes(s.color)&&[1,2,3].includes(s.width)&&validPts(s.points,1,60)})}
function setText(id,text){$(id).textContent=text}
function ready(){return !!(draft.outline&&draft.outline.length>=3)}
function onpage(bg){var n=parseInt(bg.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;return (.2126*r+.7152*g+.0722*b)/255>.45?'#252525':'#f7f7f7'}
function fresh(){var r=Casas.render($('card'));document.body.style.background=r.background;document.body.style.setProperty('--onpage',onpage(r.background));setText('home-status',r.shared?'Esta casa incluye una pieza compartida.':'')}
fresh();$('again').onclick=fresh;
// Load the approved static bank once, without delaying the initial collage.
fetch('community.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(function(list){if(Array.isArray(list))Casas.setCommunity(list.filter(valid).slice(0,600))}).catch(function(){});
$('open-workshop').onclick=function(){previousFocus=document.activeElement;homeScroll=scrollY;$('home').hidden=true;$('workshop').hidden=false;document.body.style.background='#f7f7f7';sync();preview();window.scrollTo(0,0);$('work-title').focus();};
$('back').onclick=function(){endStroke();$('workshop').hidden=true;$('home').hidden=false;document.body.style.background=homeBackground;window.scrollTo(0,homeScroll);(previousFocus||$('open-workshop')).focus();};
var homeBackground=document.body.style.background;var originalFresh=fresh;$('again').onclick=function(){originalFresh();homeBackground=document.body.style.background};
var HELP_DRAW='Arrastra libre o toca punto a punto. La guía orienta, no es un molde: tu pieza conserva su forma. No hace falta recortar perfecto.';
var HELP_CLOSE='Toca el primer punto otra vez para cerrar el recorte, o pulsa Cerrar recorte.';
function helpText(){
  setText('work-help',pending.length>=3?HELP_CLOSE:HELP_DRAW);
}
function sync(){syncKinds();paint();paintSlots();controls();paperName()}
function paintSlots(){
  var box=$('design-slots');box.replaceChildren();
  ['wall','roof','door','window'].forEach(function(k){
    var n=k==='window'?design.windows.length:(design[k]?1:0);
    var chip=document.createElement('span');chip.className='slot'+(n?' filled':'');
    chip.appendChild(document.createTextNode(KIND_NAME[k]+(k==='window'&&n>1?' ×'+n:'')+(n?' ✓':'')));
    if(n){var x=document.createElement('button');x.type='button';x.className='slot-x';x.setAttribute('aria-label','Quitar '+(k==='window'?(n>1?'las ventanas':'la ventana'):KIND_ART[k])+' de tu casa');x.textContent='×';x.onclick=function(){if(k==='window')design.windows=[];else design[k]=null;paintSlots();saveDesign();changed();setText('draft-note',KIND_NAME[k]+' fuera de tu casa: la casa la improvisa de nuevo.')};chip.appendChild(x)}
    box.appendChild(chip);
  });
}
function resetCanvas(){draft.outline=null;draft.marks=[];pending=[];drawing=null}
function designActive(){
  var d={wall:design.wall,door:design.door,roof:design.roof,windows:design.windows.slice()};
  if(ready()){if(draft.kind==='window')d.windows.push(draft);else d[draft.kind]=draft}
  return (d.wall||d.door||d.roof||d.windows.length)?d:null;
}
function syncKinds(){document.querySelectorAll('#kinds .tool').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-kind')===draft.kind))})}
var lastAdded=null;
function proposeTarget(){return ready()?draft:lastAdded}
function controls(){
  var has=pending.length>0||draft.marks.length>0||ready();
  $('undo').disabled=!has;$('clear').disabled=!has;$('close-outline').disabled=pending.length<3;
  $('add-to-design').disabled=!ready();$('save-design').disabled=!designCount();
  var pt=proposeTarget();
  $('submit-piece').disabled=!pt||submitBusy||!!submittedMap[JSON.stringify(pt)];
  helpText();
}
function changed(){setText('send-status','');controls();clearTimeout(saveTimer);saveTimer=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(draft));setText('draft-note','Tu borrador se guarda solo en este navegador.')}catch(e){setText('draft-note','Este navegador no deja guardar el borrador. Descarga tu pieza antes de salir.')}},150);clearTimeout(previewTimer);previewTimer=setTimeout(preview,220);}
function el(name,attrs){var n=document.createElementNS(SVGNS,name);for(var k in attrs)n.setAttribute(k,attrs[k]);return n}
function ptsToD(pts,close){return 'M'+pts.map(function(p){return p.join(' ')}).join('L')+(close?'Z':'')}
var GUIDES={door:'M26 92V40A24 24 0 0 1 74 40V92Z',wall:'M12 12H88V88H12Z',window:'M22 22H78V78H22Z',roof:'M14 76 L36 34 H64 L86 76 Z'};
function paint(){
  var group=$('strokes');group.replaceChildren();
  if(ready())group.appendChild(el('path',{d:ptsToD(draft.outline,true),fill:draft.color,opacity:.92}));
  draft.marks.forEach(function(s){
    group.appendChild(el('path',{d:s.points.length===1?'M'+s.points[0].join(' ')+'l.02 .02':ptsToD(s.points),fill:'none',stroke:s.color,'stroke-width':s.width*(draft.material==='wax'?1.25:.6),'stroke-linecap':'round','stroke-linejoin':'round',opacity:draft.material==='wax'?'.88':'.8'}));
  });
  if(pending.length)group.appendChild(el('path',{d:ptsToD(pending),'class':'pending'}));
  if(pending.length>=3)group.appendChild(el('path',{d:ptsToD([pending[pending.length-1],pending[0]]),'class':'closing'}));
  pending.forEach(function(p,i){
    group.appendChild(el('circle',{'class':'vtx',cx:p[0],cy:p[1],r:.9}));
    if(i===0&&pending.length>=3)group.appendChild(el('circle',{'class':'vtx-first',cx:p[0],cy:p[1],r:2.6}));
  });
  if(drawing)group.appendChild(el('path',{d:ptsToD(drawing.pts),'class':'outline-live'}));
  if(!drawing&&kbUsed)group.appendChild(el('path',{d:'M'+(cursor[0]-3)+' '+cursor[1]+'H'+(cursor[0]+3)+'M'+cursor[0]+' '+(cursor[1]-3)+'V'+(cursor[1]+3),'class':'kcursor'}));
  $('guide').setAttribute('d',GUIDES[draft.kind]||GUIDES.window);
}
var previewBackground='#d5d7db';
function preview(){if($('workshop').hidden)return;var r=Casas.render($('preview'),designActive(),previewSeed);previewBackground=r.background;$('preview-bg').style.background=r.background;}
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
  e.preventDefault();$('drawing').setPointerCapture(e.pointerId);drawing={pts:[p],moved:false};
};
$('drawing').onpointermove=function(e){
  if(!drawing)return;var p=point(e);
  var last=drawing.pts[drawing.pts.length-1];if(Math.hypot(last[0]-p[0],last[1]-p[1])>1.2){if(drawing.pts.length>=600)return;drawing.moved=true;drawing.pts.push(p);paint()}
};
function endStroke(){
  if(!drawing)return;
  var d=drawing;drawing=null;
  if(d.moved&&d.pts.length>=3)finishOutline(d.pts);
  else{
    // A tap near the first pending point closes the outline, the gesture scissors make.
    if(pending.length>=3&&Math.hypot(d.pts[0][0]-pending[0][0],d.pts[0][1]-pending[0][1])<=4){finishOutline(pending);return}
    pending.push(d.pts[0]);paint();controls()}
}
$('drawing').onpointerup=endStroke;$('drawing').onpointercancel=endStroke;$('drawing').onlostpointercapture=endStroke;
$('drawing').onkeydown=function(e){
  var step=e.shiftKey?8:2,handled=true;
  if(e.key==='ArrowLeft'){kbUsed=true;cursor[0]=Math.max(0,cursor[0]-step);}
  else if(e.key==='ArrowRight'){kbUsed=true;cursor[0]=Math.min(100,cursor[0]+step);}
  else if(e.key==='ArrowUp'){kbUsed=true;cursor[1]=Math.max(0,cursor[1]-step);}
  else if(e.key==='ArrowDown'){kbUsed=true;cursor[1]=Math.min(100,cursor[1]+step);}
  else if(e.key==='Enter'||e.key===' '){kbUsed=true;pending.push(cursor.slice());if(pending.length>160)pending.shift();}
  else if(e.key==='c'||e.key==='C'){if(pending.length>=3){finishOutline(pending);}}
  else if(e.key==='Escape'){pending=[];}
  else handled=false;
  if(handled){e.preventDefault();paint();controls()}
};
$('close-outline').onclick=function(){if(pending.length>=3)finishOutline(pending)};
function paperName(){$('paper-name').textContent=PAPER_NAMES[PAPERS.indexOf(draft.color)]||''}
PAPERS.forEach(function(c,i){var b=document.createElement('button');b.type='button';b.className='swatch';b.setAttribute('aria-label','Papel '+PAPER_NAMES[i]);b.setAttribute('aria-pressed',String(c===draft.color));var span=document.createElement('span');span.style.setProperty('--ink',c);b.appendChild(span);b.onclick=function(){draft.color=c;paperName();document.querySelectorAll('#papers .swatch').forEach(function(el2){el2.setAttribute('aria-pressed',String(el2===b))});paint();changed()};$('papers').appendChild(b)});
document.querySelectorAll('#kinds .tool').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-kind');if(k===draft.kind)return;resetCanvas();draft.kind=k;syncKinds();paint();changed();setText('draft-note','Lienzo nuevo para '+KIND_ART[k]+'. '+(designCount()?'Lo que ya añadiste sigue en tu casa.':''))}});
$('add-to-design').onclick=function(){
  if(!ready())return;
  var piece={v:2,kind:draft.kind,color:draft.color,material:draft.material,outline:draft.outline,marks:draft.marks},note;
  if(piece.kind==='window'){design.windows.push(piece);note='Ventana añadida a tu casa.';if(design.windows.length>4){design.windows.shift();note='Tu casa ya tenía 4 ventanas: se ha sustituido la más antigua.'}}
  else{note=KIND_NAME[piece.kind]+(design[piece.kind]?' sustituida en tu casa.':' añadida a tu casa.');design[piece.kind]=piece}
  lastAdded=piece;
  resetCanvas();paint();paintSlots();saveDesign();changed();setText('draft-note',note+' Dibuja otra parte cuando quieras.');
};
$('undo').onclick=function(){
  if(pending.length)pending.pop();
  else if(draft.marks.length)draft.marks.pop();
  else if(ready())draft.outline=null;
  paint();changed();
};
$('clear').onclick=function(){$('clear-dialog').showModal()};$('cancel-clear').onclick=function(){$('clear-dialog').close()};$('confirm-clear').onclick=function(){resetCanvas();paint();changed();$('clear-dialog').close()};
function downloadBlob(blob,name){var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},60000)}
async function svgPNG(svg,name,status,bgc){var copy=svg.cloneNode(true);var fill=bgc||(svg.closest('#card')?homeBackground:null);if(fill){var bg=document.createElementNS(SVGNS,'rect');bg.setAttribute('width','100');bg.setAttribute('height','100');bg.setAttribute('fill',fill);copy.insertBefore(bg,copy.firstChild)}var markup=new XMLSerializer().serializeToString(copy),blob=new Blob([markup],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);try{var img=new Image();await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=reject;img.src=url});var canvas=document.createElement('canvas');canvas.width=canvas.height=1800;canvas.getContext('2d').drawImage(img,0,0,1800,1800);var png=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png')});if(!png)throw Error();downloadBlob(png,name+'.png');setText(status,'Imagen preparada. Si no se descarga, prueba mantener pulsada la imagen o usa otro navegador.')}catch(e){downloadBlob(blob,name+'.svg');setText(status,'Este navegador no pudo crear el PNG. Se ha preparado el collage en SVG.')}finally{URL.revokeObjectURL(url)}}
$('save-design').onclick=function(){var svg=$('preview').querySelector('svg');if(svg)svgPNG(svg,'mi-casa-de-papel','preview-status',previewBackground)};
$('submit-piece').onclick=async function(){var piece=proposeTarget();if(submitBusy||!piece)return;submitBusy=true;controls();setText('send-status','Enviando tu pieza…');var snapshot=JSON.stringify(piece),controller=new AbortController(),timer=setTimeout(function(){controller.abort()},12000);
 try{var r=await fetch(ENDPOINT+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({piece:JSON.parse(snapshot),consent:true,website:$('website').value}),signal:controller.signal});var result=await r.json();if(!r.ok||!result.id)throw new Error(result.error||'unavailable');submittedMap[snapshot]=true;setText('send-status','Pieza recibida para revisión. Todavía no está publicada. Referencia '+result.id.slice(0,8)+'. La pieza sigue en tu casa.');try{localStorage.setItem('casas-last-submission',JSON.stringify({id:result.id,time:Date.now()}))}catch(e){}}
 catch(e){var text=e.message==='capacity'?'La recepción está llena por ahora. Tu pieza sigue aquí; descárgala o prueba otro día.':'No hemos podido confirmar el envío. Tu pieza sigue aquí. Puedes reintentarlo: no se duplicará la misma pieza.';setText('send-status',text)}finally{clearTimeout(timer);submitBusy=false;controls();}};
window.addEventListener('pagehide',function(){try{localStorage.setItem(KEY,JSON.stringify(draft));saveDesign()}catch(e){}});
})();
