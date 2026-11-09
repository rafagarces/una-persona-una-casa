// rv5: rv4 house (frozen, rendered unchanged by renderer-v4.js) plus an optional freehand `ink` layer on top.
// One shared place for ink validation and drawing, used by the editor, gallery cards and the large viewer.
(function(){
  var NS='http://www.w3.org/2000/svg';
  var WAXES=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a'],GRAPHITE='#3a3940';
  function pts(a,min,max){return Array.isArray(a)&&a.length>=min&&a.length<=max&&a.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(function(n){return typeof n==='number'&&isFinite(n)&&n>=0&&n<=100})})}
  function validInk(a){return Array.isArray(a)&&a.length<=40&&a.every(function(s){return s&&(s.k==='p'&&s.c===GRAPHITE||s.k==='w'&&WAXES.indexOf(s.c)>=0)&&pts(s.pts,2,120)})&&a.reduce(function(n,s){return n+s.pts.length},0)<=1600}
  function el(name,attrs){var n=document.createElementNS(NS,name);for(var k in attrs)n.setAttribute(k,attrs[k]);return n}
  function pathD(p){var d='M'+p[0].join(' ');for(var i=1;i<p.length-1;i++)d+='Q'+p[i].join(' ')+' '+((p[i][0]+p[i+1][0])/2)+' '+((p[i][1]+p[i+1][1])/2);return d+'L'+p[p.length-1].join(' ')}
  function strokeNode(s){var g=el('g',{'class':'ink'}),d=pathD(s.pts);
    if(s.k==='p')g.appendChild(el('path',{d:d,fill:'none',stroke:s.c,'stroke-width':.45,'stroke-linecap':'round','stroke-linejoin':'round',opacity:.88}));
    else{g.appendChild(el('path',{d:d,fill:'none',stroke:s.c,'stroke-width':2.4,'stroke-linecap':'round','stroke-linejoin':'round',opacity:.82}));g.appendChild(el('path',{d:d,fill:'none',stroke:'#fff','stroke-width':1.1,'stroke-dasharray':'.5 1.1',opacity:.2}))}
    return g}
  // Draws the rv4 house exactly as before (same seed, same markup), then appends ink as the last group.
  function render(target,house,seed){
    var r=window.CasasV4.render(target,house,seed);
    if(house&&house.ink&&validInk(house.ink)){var svg=target.querySelector('svg');if(svg){var g=el('g',{'pointer-events':'none'});house.ink.forEach(function(s){g.appendChild(strokeNode(s))});svg.appendChild(g)}}
    return r;
  }
  window.CasasV5={render:render,validInk:validInk,strokeNode:strokeNode,WAXES:WAXES,GRAPHITE:GRAPHITE,setCommunity:function(){}};
})();
