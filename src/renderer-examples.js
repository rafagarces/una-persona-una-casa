// Motor de ejemplos (portada y casas de ejemplo de la galería). Identidad propia:
// lápiz de un solo trazo con grano de grafito, motivos de ventana enmarcada, puerta
// de tablones, tejados tramados y escena (suelo, sol, nubes, pájaros). No renderiza
// casas de visitantes: esas siguen en los motores rv1-rv6.

(function(){
  var PAGE='#a9c3dd',INK='#34322c',LASTGY=83;
  var INKS=['#34322c','#3a3833','#2e3134','#403b32','#333d52'];
  function hx(n){n=Math.max(0,Math.min(255,Math.round(n)));return(n<16?'0':'')+n.toString(16)}
  function hsl(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;var a=s*Math.min(l,1-l);
    function k(n){var m=(n+h/30)%12;return l-a*Math.max(-1,Math.min(m-3,9-m,1))}
    return'#'+hx(k(0)*255)+hx(k(8)*255)+hx(k(4)*255)}
  function makeBG(){return hsl(R(0,360),R(45,90),R(36,62))}
  function makePool(bg){var pool=[],t=0;
    while(pool.length<14&&t++<200){
      var m=rnd(),c=m<.3?hsl(R(0,360),R(25,60),R(80,92)):m<.55?hsl(R(0,360),R(55,90),R(60,76)):m<.8?hsl(R(0,360),R(40,80),R(40,58)):hsl(R(30,60),R(10,35),R(88,96));
      if(dist(c,bg)>110)pool.push(c)}
    return pool}
  var seed;
  function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}
  function R(a,b){return a+(b-a)*rnd()}
  function pick(a){return a[Math.floor(rnd()*a.length)]}
  function f(n){return Math.round(n*100)/100}
  function J(p,a){return[p[0]+R(-a,a),p[1]+R(-a,a)]}
  function path(pts){return'M'+pts.map(function(p){return f(p[0])+' '+f(p[1])}).join('L')+'Z'}
  function rot(pts,ang){var cx=0,cy=0;pts.forEach(function(p){cx+=p[0];cy+=p[1]});cx/=pts.length;cy/=pts.length;
    var c=Math.cos(ang),s=Math.sin(ang);return pts.map(function(p){var x=p[0]-cx,y=p[1]-cy;return[cx+x*c-y*s,cy+x*s+y*c]})}
  function dist(a,b){var x=rgb(a),y=rgb(b);return Math.sqrt(Math.pow(x[0]-y[0],2)+Math.pow(x[1]-y[1],2)+Math.pow(x[2]-y[2],2))}
  function rgb(h){return[1,3,5].map(function(i){return parseInt(h.substr(i,2),16)})}

  // Recorte de papel: silueta geométrica con leve temblor de tijera y sombra sutil.
  function piece(pts,fill,wob){
    pts=rot(pts.map(function(p){return J(p,wob==null?1.1:wob)}),R(-.06,.06));
    return'<path d="'+path(pts)+'" fill="'+fill+'" filter="url(#sh)"/>';
  }
  function rect(x,y,w,h){return[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}
  function ngon(cx,cy,r,n,j){var pts=[],a0=R(0,6.28);for(var i=0;i<n;i++){var a=a0+i*Math.PI*2/n;pts.push([cx+Math.cos(a)*r*R(1-j,1+j),cy+Math.sin(a)*r*R(1-j,1+j)])}return pts}

  // Lápiz: un solo trazo por gesto, segmentos casi rectos con temblor leve y grano.
  // Nada de dobles pasadas ni curvas de bucle: ésa era la firma del motor anterior.
  function pen(pts,w,op){
    var q=[];
    for(var i=0;i<pts.length;i++){
      q.push(J(pts[i],.22));
      if(i<pts.length-1){var a=pts[i],b=pts[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);
        if(L>6)q.push(J([(a[0]+b[0])/2,(a[1]+b[1])/2],.3))}
    }
    var d='M'+q.map(function(p){return f(p[0])+' '+f(p[1])}).join('L');
    return'<path d="'+d+'" fill="none" stroke="'+INK+'" stroke-width="'+f((w||.5)*R(.85,1.15))+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+f((op||1)*R(.55,.78))+'" filter="url(#gr)"/>';
  }
  function line(x1,y1,x2,y2,w,op){return pen([[x1,y1],[x2,y2]],w,op)}
  // Tramado recto recortado a una silueta (tejados): paralelas separadas, de verdad a lápiz.
  var CLIPN=0;
  function hatchIn(pts,ang,gap,w){
    var xs=pts.map(function(p){return p[0]}),ys=pts.map(function(p){return p[1]});
    var mnx=Math.min.apply(null,xs),mxx=Math.max.apply(null,xs),mny=Math.min.apply(null,ys),mxy=Math.max.apply(null,ys);
    var cx=(mnx+mxx)/2,cy=(mny+mxy)/2,c=Math.cos(ang),s=Math.sin(ang),o='',cid='hx'+(++CLIPN);
    var diag=Math.hypot(mxx-mnx,mxy-mny);
    for(var t=-diag;t<=diag;t+=gap){
      var px=cx-s*t,py=cy+c*t;
      o+=line(px-c*diag/2,py-s*diag/2,px+c*diag/2,py+s*diag/2,w,.5);
    }
    return'<clipPath id="'+cid+'"><path d="'+path(pts)+'"/></clipPath><g clip-path="url(#'+cid+')">'+o+'</g>';
  }
  // Ventana enmarcada: contorno cerrado de un trazo, cruceta y alféizar.
  function frameWin(cx,cy,w,h){
    var o=pen([[cx-w/2,cy-h/2],[cx+w/2,cy-h/2],[cx+w/2,cy+h/2],[cx-w/2,cy+h/2],[cx-w/2,cy-h/2]],.55);
    o+=line(cx-w/2,cy,cx+w/2,cy,.4,.8)+line(cx,cy-h/2,cx,cy+h/2,.4,.8);
    if(rnd()<.6)o+=line(cx-w/2-1,cy+h/2+1,cx+w/2+1,cy+h/2+1,.5,.7);
    return o;
  }
  function roundWin(cx,cy,r){
    return pen(ngon(cx,cy,r,9,.06).concat([[cx+r,cy]]),.5)+line(cx-r,cy,cx+r,cy,.35,.7)+line(cx,cy-r,cx,cy+r,.35,.7);
  }
  // Puerta de tablones a lápiz, con pomo.
  function plankDoor(x,y,w,h){
    var o=pen([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],.55),n=Math.max(2,Math.round(w/3.2));
    for(var i=1;i<n;i++)o+=line(x+w*i/n,y+.6,x+w*i/n,y+h,.3,.55);
    o+=pen([[x+w*.78,y+h*.5],[x+w*.82,y+h*.52]],.9);
    return o;
  }
  // Escena: suelo con caída, hierba, sol de rayos rectos, nube, pájaros, camino de piedras.
  function ground(y){var pts=[],n=8;for(var i=0;i<=n;i++)pts.push([24+52*i/n,y+R(-.9,.9)]);return pen(pts,.5,.85)}
  function grass(x,y){var o='';for(var i=0;i<3;i++)o+=line(x+i*1.1-1.1,y,x+i*1.1-1.1+R(-.7,.7),y-R(1.8,3),.4,.7);return o}
  function sun(cx,cy,r){var o=pen(ngon(cx,cy,r,10,.05).concat([[cx+r,cy]]),.5),n=Math.round(R(6,9));
    for(var i=0;i<n;i++){var a=i*Math.PI*2/n+R(-.15,.15);o+=line(cx+Math.cos(a)*r*1.35,cy+Math.sin(a)*r*1.35,cx+Math.cos(a)*r*R(1.8,2.2),cy+Math.sin(a)*r*R(1.8,2.2),.4,.75)}
    return o}
  function cloud(cx,cy,w){var pts=[],n=Math.round(R(4,6));pts.push([cx-w/2,cy]);
    for(var i=0;i<n;i++){var bx=cx-w/2+w*(i+.5)/n;pts.push([bx-w/(n*2),cy-R(1.5,3)],[bx,cy-R(2.5,4)],[bx+w/(n*2),cy-R(1.5,3)])}
    pts.push([cx+w/2,cy]);return pen(pts,.45,.7)}
  function birds(cx,cy){var o='',n=Math.round(R(2,3));for(var i=0;i<n;i++){var bx=cx+i*R(3,5),by=cy+R(-2,2),s=R(1.2,2);o+=pen([[bx-s,by],[bx,by-s*.8],[bx+s,by]],.4,.8)}return o}
  function smoke(cx,cy){var pts=[];for(var i=0;i<=9;i++){var a=i*.55,r=.25+i*.18;pts.push([cx+Math.cos(a)*r,cy-i*.62+Math.sin(a)*r*.5])}return pen(pts,.4,.6)}
  function tree(x,baseY,s,colr){var o=piece(rect(x-s*.14,baseY-s*.7,s*.28,s*.7),colr());
    o+=piece(ngon(x,baseY-s*.95,s*.55,9,.18),colr());return o}

  function house(){
    var bg=makeBG(),others=makePool(bg),used=[],t0=0;
    do{PAGE=hsl(R(0,360),R(25,65),rnd()<.25?R(24,40):R(62,86));t0++}while(dist(PAGE,bg)<100&&t0<40);
    INK=pick(INKS);
    function col(){var c,t=0;do{c=pick(others);t++}while(used.indexOf(c)>-1&&t<20);used.push(c);return c}
    function colFar(far){var c,t=0;do{c=col();t++}while(dist(c,far)<55&&t<25);return c}

    var out='',penTop='',penBack='',extra='';
    var baseY=R(80,84);
    var kind=Math.floor(R(0,6));
    var bodyCol=col(),roofCol=rnd()<.25?'#f6f3ee':colFar(bodyCol),doorCol=colFar(bodyCol);
    var cx0=R(40,60); // centro compositivo variable, no siempre centrado
    var doorX=null,doorBase=null;

    function paperWin(cx,cy,w,h,c){out+=piece(rect(cx-w/2,cy-h/2,w,h),c||col(),.5)}
    function chimney(x,y,w,h,c){out+=piece(rect(x,y,w,h),c||col(),.8);if(rnd()<.55)extra+=smoke(x+w/2,y-1)}

    if(kind===0){ // casa alta con tejado inclinado (shed)
      var bw=R(20,27),bh=R(30,40),bx=cx0-bw/2,by=baseY-bh,sl=rnd()<.5?1:-1;
      var roof=[[bx-3,by+ (sl>0?5:0)],[bx+bw+3,by+(sl>0?0:5)],[bx+bw+4,by+(sl>0?3:8)+3],[bx-4,by+(sl>0?8:3)+3]];
      extra+=hatchIn(roof,sl>0?.5:-.5,R(2.2,3),.3);
      if(rnd()<.45)chimney(sl>0?bx+bw-6:bx+2,by-6,R(3.5,5.5),R(7,11));
      out+=piece(rect(bx,by,bw,bh),bodyCol);
      out+=piece(roof,roofCol);
      var dw=R(7.5,10),dh=R(12,16);doorX=bx+bw/2-dw/2;doorBase=baseY;
      out+=piece(rect(doorX,baseY-dh,dw,dh),doorCol,.5);
      penTop+=pen([[doorX+dw*.75,baseY-dh*.5],[doorX+dw*.79,baseY-dh*.48]],.8);
      if(rnd()<.6)penTop+=frameWin(bx+bw*R(.3,.7),by+bh*R(.22,.4),R(5.5,7.5),R(6,8));
      else paperWin(bx+bw*R(.3,.7),by+bh*.3,R(4.5,6),R(4.5,6));
    }
    else if(kind===1){ // casa ancha de tejado plano con vuelo
      var bw=R(36,48),bh=R(18,25),bx=cx0-bw/2,by=baseY-bh;
      out+=piece(rect(bx,by,bw,bh),bodyCol);
      out+=piece(rect(bx-R(3,5),by-R(3.4,4.6),bw+R(6,10),R(3,4)),roofCol);
      var n=Math.round(R(2,4)),ww=bw/(n+2);
      var dw=R(6.5,9),dh=R(11,14);doorX=rnd()<.5?bx+bw-dw-2:bx+2;doorBase=baseY;
      for(var i=0;i<n;i++){var wx=bx+ww*(i+1.4);if(wx>doorX-3&&wx<doorX+dw+3)continue;if(rnd()<.7)paperWin(wx,by+bh*R(.42,.55),R(3.6,4.8),R(3.6,4.8));else penTop+=frameWin(wx,by+bh*.48,R(4.5,6),R(4.5,5.5))}
      out+=piece(rect(doorX,baseY-dh,dw,dh),doorCol,.5);
      penTop+=pen([[doorX+dw*.7,baseY-dh*.5],[doorX+dw*.74,baseY-dh*.48]],.7);
    }
    else if(kind===2){ // dos volúmenes: torre con frontón + bloque bajo
      var tw=R(17,23),th=R(28,38),tx=cx0-tw/2-R(4,8),ty=baseY-th;
      var w2=R(15,22),h2=R(14,20),x2=tx+tw-1,y2=baseY-h2;
      if(x2+w2>88){x2=tx-w2+1}
      out+=piece(rect(x2,y2,w2,h2),col());
      out+=piece(rect(tx,ty,tw,th),bodyCol);
      var apex=[tx+tw*R(.35,.65),ty-R(10,15)];
      var roof=[[tx-3,ty+1],apex,[tx+tw+3,ty+1]];
      extra+=hatchIn(roof,rnd()<.5?.55:-.55,R(2.4,3.2),.3);
      out+=piece(roof,roofCol);
      out+=piece(rect(x2-2,y2-3,w2+4,3.4),colFar(bodyCol));
      penTop+=frameWin(tx+tw/2,ty+th*R(.2,.32),R(5,6.5),R(5.5,7));
      if(rnd()<.5)penTop+=frameWin(tx+tw/2,ty+th*.55,R(4.5,6),R(5,6));
      paperWin(x2+w2*.5,y2+h2*.38,R(3.6,4.6),R(3.6,4.6));
      var dw=R(6.5,8.5),dh=R(10,13);doorX=x2+w2/2-dw/2;doorBase=baseY;
      if(rnd()<.5){out+=piece(rect(doorX,baseY-dh,dw,dh),doorCol,.5)}
      else penTop+=plankDoor(doorX,baseY-dh,dw,dh);
      if(rnd()<.5)chimney(tx+tw*R(.15,.3),ty-R(4,7),R(3,4.5),R(6,9));
    }
    else if(kind===3){ // cubierta curva (barrel) y ventana redonda
      var bw=R(26,34),bh=R(20,28),bx=cx0-bw/2,by=baseY-bh;
      out+=piece(rect(bx,by,bw,bh),bodyCol);
      var roof=[[bx-3,by+2]],n=8;
      for(var i=0;i<=n;i++){var a=Math.PI-Math.PI*i/n;roof.push([bx+bw/2+Math.cos(a)*(bw/2+3),by+2-Math.sin(a)*R(9,13)])}
      roof.push([bx+bw+3,by+2]);
      out+=piece(roof,roofCol);
      if(rnd()<.5)extra+=hatchIn(roof,Math.PI/2,R(2.6,3.4),.28);
      penTop+=roundWin(bx+bw/2,by+bh*R(.25,.35),R(2.8,3.8));
      var dw=R(7,9.5),dh=R(11,15);doorX=bx+bw/2-dw/2+R(-4,4);doorBase=baseY;
      penTop+=plankDoor(doorX,baseY-dh,dw,dh);
    }
    else if(kind===4){ // tejado mariposa con ala lateral
      var bw=R(21,29),bh=R(24,33),bx=cx0-bw/2+R(-4,4),by=baseY-bh;
      var w2=R(13,19),h2=R(12,18),side=rnd()<.5?1:-1,x2=side>0?bx+bw-1:bx-w2+1,y2=baseY-h2;
      out+=piece(rect(x2,y2,w2,h2),col());
      out+=piece(rect(bx,by,bw,bh),bodyCol);
      var mid=[bx+bw/2,by+R(2,4)],eaveL=[bx-3,by+R(0,1.5)],eaveR=[bx+bw+3,by+R(0,1.5)],midLow=[bx+bw/2,by+R(6,8.5)];
      var roof=[eaveL,mid,eaveR,[bx+bw+1,by+R(3,4.5)],midLow,[bx-1,by+R(3,4.5)]];
      extra+=hatchIn(roof,.9,R(2.4,3.2),.28);
      out+=piece(roof,roofCol);
      paperWin(bx+bw*R(.25,.4),by+bh*R(.3,.42),R(3.8,5),R(3.8,5));
      penTop+=frameWin(x2+w2/2,y2+h2*.4,R(4,5.5),R(4.5,5.5));
      var dw=R(6.5,8.5),dh=R(10,13);doorX=bx+bw*R(.6,.75);doorBase=baseY;
      out+=piece(rect(doorX,baseY-dh,dw,dh),doorCol,.5);
      penTop+=pen([[doorX+dw*.72,baseY-dh*.5],[doorX+dw*.76,baseY-dh*.48]],.7);
      if(rnd()<.4)extra+=tree(side>0?bx-R(6,9):bx+bw+R(6,9),baseY,R(6,9),col);
    }
    else { // frontón con buhardilla
      var bw=R(26,34),bh=R(20,27),bx=cx0-bw/2,by=baseY-bh,rh=R(15,22);
      out+=piece(rect(bx,by,bw,bh),bodyCol);
      var apex=[bx+bw/2,by-rh];
      var roof=[[bx-4,by+1],apex,[bx+bw+4,by+1]];
      extra+=hatchIn(roof,rnd()<.5?.6:-.6,R(2.4,3.4),.3);
      out+=piece(roof,roofCol);
      var dw2=R(4,5.5),dh2=R(4,5.5),dxx=bx+bw/2+R(-3,3),dyy=by-rh*R(.3,.5);
      out+=piece([[dxx-dw2/2-1.5,dyy+dh2/2],[dxx,dyy-dh2/2-2],[dxx+dw2/2+1.5,dyy+dh2/2]],colFar(roofCol),.5);
      out+=piece(rect(dxx-dw2/2,dyy-dh2/2,dw2,dh2),col(),.4);
      penTop+=frameWin(bx+bw*.25,by+bh*R(.35,.45),R(4.5,6),R(5,6));
      penTop+=frameWin(bx+bw*.75,by+bh*R(.35,.45),R(4.5,6),R(5,6));
      var dw=R(7,9),dh=R(11,14);doorX=bx+bw/2-dw/2;doorBase=baseY;
      if(rnd()<.5){out+=piece(rect(doorX,baseY-dh,dw,dh),doorCol,.5);penTop+=pen([[doorX+dw*.72,baseY-dh*.5],[doorX+dw*.76,baseY-dh*.48]],.7)}
      else penTop+=plankDoor(doorX,baseY-dh,dw,dh);
    }

    // Escena a lápiz: suelo siempre; el resto por sorteo, poco y suelto.
    LASTGY=baseY+R(1.2,2);var sky=ground(LASTGY);
    var nGrass=Math.round(R(0,3));
    for(var gi=0;gi<nGrass;gi++)sky+=grass(R(18,82),LASTGY+R(.3,1.5));
    if(rnd()<.4)sky+=sun(R(18,82),R(15,26),R(3,4.5));
    if(rnd()<.3)sky+=cloud(R(20,80),R(16,26),R(9,15));
    if(rnd()<.25)sky+=birds(R(25,70),R(18,28));

    var rotp=R(-1.4,1.4),rotb=R(-1.8,1.8),gseed=Math.floor(R(1,99));
    var svg='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'+
     '<defs><filter id="sh" x="-10%" y="-10%" width="125%" height="125%"><feDropShadow dx=".06" dy=".1" stdDeviation=".1" flood-color="#241a30" flood-opacity=".11"/></filter>'+
     '<filter id="gr" filterUnits="userSpaceOnUse" x="-60" y="-60" width="220" height="220"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="'+gseed+'" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -7 6.55" result="m"/><feGaussianBlur in="SourceGraphic" stdDeviation=".05" result="b"/><feComposite in="b" in2="m" operator="in"/></filter></defs>'+
     '<g transform="rotate('+f(rotp)+' 50 50)"><rect x="3" y="3" width="94" height="94" fill="#f7f5f0"/>'+
     '<g transform="rotate('+f(rotb)+' 50 50)"><path d="'+path([J([10,9],.8),J([91,8],.8),J([90.5,89],.8),J([9.5,90],.8)])+'" fill="'+bg+'"/>'+
     '<g id="sc">'+sky+'</g><g id="hs"><g id="hb">'+penBack+out+penTop+'</g>'+extra+'</g></g>'+
     '<image x="3" y="3" width="94" height="94" href="paper.png" preserveAspectRatio="none"/></g></svg>';
    return svg;
  }

  var renderCount=0;
  function render(target,piece_,fixedSeed){
    seed=fixedSeed==null?(Math.random()*4294967296)>>>0:fixedSeed;
    var markup=house(),uid='-ex-r'+(++renderCount);
    ['sh','gr'].forEach(function(id){markup=markup.split('id="'+id+'"').join('id="'+id+uid+'"').split('url(#'+id+')').join('url(#'+id+uid+')')});
    markup=markup.split('id="hx').join('id="hx'+uid+'-').split('url(#hx').join('url(#hx'+uid+'-');
    target.innerHTML=markup;
    var g=target.querySelector('#hs'),b=target.querySelector('#hb').getBBox(),k=Math.min(74/b.width,74/b.height)*R(.92,1);
    var cx=b.x+b.width/2,cy=b.y+b.height/2,tx=50+R(-2.5,2.5),ty=LASTGY-.5-k*b.height/2;
    g.setAttribute('transform','translate('+f(tx)+' '+f(ty)+') rotate('+f(R(-1.6,1.6))+') scale('+f(k)+') translate('+f(-cx)+' '+f(-cy)+')');
    return {background:PAGE,shared:false};
  }
  window.CasasEx={render:render,setCommunity:function(){}};
})();
