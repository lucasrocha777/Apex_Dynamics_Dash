/* Apex Dash v2 · painel (celular) */
import { ApexLink, ApexRoom } from "./link.js";
import * as Lay from "./layout.js";

(function(){
"use strict";
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v))};
var pad=function(n,l){n=String(n);while(n.length<(l||2))n="0"+n;return n};
var comma=function(x,d){return x.toFixed(d).replace(".",",")};
var fmtLap=function(t){var m=Math.floor(t/60),s=t-m*60;return m+":"+pad(comma(Math.floor(s*10)/10,1),4)};
var fmtLap2=function(t){var m=Math.floor(t/60),s=t-m*60;return m+":"+pad(comma(s,2),5)};
var fmtD=function(d){return (d>0?"+":d<0?"−":"±")+comma(Math.abs(d),2)};
var thou=function(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,".")};
var MIRROR=/[?&]espelho/.test(location.search);

/* ---------- tela cheia, orientação e escala ---------- */
var stage=$("#stage");
function insets(){var cs=getComputedStyle($("#sa"));return{t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0}}
function rescale(){var vw=window.innerWidth,vh=window.innerHeight,i=insets(),aw=vw-i.l-i.r,ah=vh-i.t-i.b,s=Math.min(aw/1280,ah/720);
  var x=i.l+(aw-1280*s)/2,y=i.t+(ah-720*s)/2;stage.style.transform="translate("+x+"px,"+y+"px) scale("+s+")";checkRot()}
window.addEventListener("resize",rescale);window.addEventListener("orientationchange",function(){setTimeout(rescale,250)});
function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement}
function canFs(){var d=document.documentElement;return !!(d.requestFullscreen||d.webkitRequestFullscreen)}
function standalone(){return (window.matchMedia&&matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches)||navigator.standalone===true}
function lockLand(){try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock("landscape").catch(function(){})}catch(e){}}
function goFull(){if(MIRROR||fsEl()||!canFs()){lockLand();return}var d=document.documentElement,p;
  try{p=d.requestFullscreen?d.requestFullscreen({navigationUI:"hide"}):d.webkitRequestFullscreen();if(p&&p.then)p.then(lockLand,function(){});else setTimeout(lockLand,300)}catch(e){}}
var fsHide=null;
function fsButton(){var b=$("#fsBtn"),show=!MIRROR&&canFs()&&!fsEl()&&!standalone();b.classList.toggle("on",show);clearTimeout(fsHide);if(show)fsHide=setTimeout(function(){b.classList.remove("on")},6000)}
document.addEventListener("fullscreenchange",function(){fsButton();rescale();queueStatus()});
document.addEventListener("webkitfullscreenchange",function(){fsButton();rescale()});
document.addEventListener("pointerdown",function(e){if(e.target.closest("#fsBtn"))return;if(!fsEl()&&S.on)fsButton()},true);
$("#fsBtn").addEventListener("click",function(){goFull();this.classList.remove("on")});
$("#fsHint").classList.toggle("on",!MIRROR&&!canFs()&&!standalone()&&/iP(hone|od)/.test(navigator.userAgent));
var rotSkipped=false;
function checkRot(){$("#rot").classList.toggle("on",!MIRROR&&!rotSkipped&&window.innerHeight>window.innerWidth*1.1)}
$("#rotSkip").addEventListener("click",function(){rotSkipped=true;checkRot()});
$("#rotGo").addEventListener("click",function(){goFull();boot();rotSkipped=true;setTimeout(checkRot,50)});
/* mantém a tela acesa durante a apresentação (precisa de HTTPS) */
var wake=null;
function keepAwake(){if(MIRROR||!navigator.wakeLock||wake)return;navigator.wakeLock.request("screen").then(function(l){wake=l;l.addEventListener("release",function(){wake=null})}).catch(function(){})}
document.addEventListener("visibilitychange",function(){if(!document.hidden&&S.on)keepAwake()});
document.addEventListener("contextmenu",function(e){e.preventDefault()});

/* ---------- estado e preferências ---------- */
var DEF_SET={ww:100,wc:110,ow:120,oc:135,fw:15,snd2:true,vol:70,theme:"auto",tips:false};
var settings=clone(DEF_SET),lay=Lay.clone(Lay.DEFAULT);
function clone(o){return JSON.parse(JSON.stringify(o))}
try{var a=localStorage.getItem("apexv2.set"),b=localStorage.getItem("apexv3.lay")||localStorage.getItem("apexv2.lay");if(a)settings=Object.assign(clone(DEF_SET),JSON.parse(a));if(b)lay=Lay.normalize(JSON.parse(b))}catch(e){}
function save(){if(MIRROR)return;try{localStorage.setItem("apexv2.set",JSON.stringify(settings));localStorage.setItem("apexv3.lay",JSON.stringify(lay))}catch(e){}}

var S={car:"track",p:0,lapT:0,lapN:4,v:0,rpm:900,gear:0,water:90,oil:100,boost:0,fuel:62,heat:0,oilBias:0,boostBias:0,fuelDrain:false,pace:1,cp:[0],sp:[0],nextCp:1,amb:50,view:"painel",editing:false,sel:null,on:false};
var LAPLEN=1100,SHIFT=6500;
function prof(p){return clamp(118+62*Math.sin(6.2832*(2*p)+.6)+26*Math.sin(6.2832*(5*p)+1.1),52,192)}
var GR=[0,232,136,85,56.5,40.6,33.9],THR=[0,0,28,48,76,115,160];
function gearOf(v){var g=1;for(var i=1;i<7;i++)if(v>=THR[i])g=i;return g}
function simLap(pace){var p=0,v=prof(0)*pace,t=0,dt=.05,cp=[0],sp=[v],nx=1;
  while(p<1){var tg=prof(p)*pace;v+=(tg-v)*Math.min(1,dt*3);p+=v/3.6*dt/LAPLEN;t+=dt;while(nx<=100&&p>=nx/100){cp.push(t);sp.push(v);nx++}}
  while(cp.length<101){cp.push(t);sp.push(v)}return{time:t,cp:cp,sp:sp}}
var laps=[1.0,1.016,.99].map(function(pc,i){var l=simLap(pc);l.n=i+1;return l});
function bestLap(){return laps.reduce(function(a,b){return !a||b.time<a.time?b:a},null)}

/* ---------- ícones ---------- */
var ICON={
 1:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="10.8" y="10" width="2.4" height="7.5" fill="currentColor"/><circle cx="12" cy="6.8" r="1.6" fill="currentColor"/></svg>',
 2:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 L23 21.5 H1 Z" fill="currentColor"/><rect x="10.8" y="8.5" width="2.4" height="7" fill="#FFB020"/><circle cx="12" cy="18.3" r="1.5" fill="#FFB020"/></svg>',
 3:'<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7.6,1 16.4,1 23,7.6 23,16.4 16.4,23 7.6,23 1,16.4 1,7.6" fill="#fff"/><rect x="10.7" y="5.5" width="2.6" height="9" fill="#CC2A2A"/><circle cx="12" cy="18" r="1.7" fill="#CC2A2A"/></svg>',
 ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M7 12.5 l3.2 3.2 L17 8.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
var SYM={
 water:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="21" y="5" width="6" height="22" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><line x1="27" y1="11" x2="33" y2="11" stroke="currentColor" stroke-width="3"/><line x1="27" y1="18" x2="33" y2="18" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="30" r="4.5" fill="currentColor"/><path d="M5 37 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0" fill="none" stroke="currentColor" stroke-width="3"/><path d="M5 44 q4.75 -5 9.5 0 t9.5 0 t9.5 0 t9.5 0" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
 oil:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 20 h22 l6 -4 l9 3 l-12 14 H12 a4 4 0 0 1 -4 -4 Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M14 20 v-5 h8 v5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M3 24 l5 -2" stroke="currentColor" stroke-width="3"/><path d="M43 36 q2 4 0 6 q-2 -2 0 -6 Z" fill="currentColor"/></svg>',
 boost:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="22" cy="26" r="15" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 26 m0 -8 a8 8 0 1 1 -8 8" fill="none" stroke="currentColor" stroke-width="3"/><path d="M33 15 l10 -8 M37 7 h6 v6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
 fuel:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="6" width="20" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><rect x="12" y="10" width="12" height="9" fill="currentColor"/><path d="M28 18 h5 a3 3 0 0 1 3 3 v14 a3 3 0 0 0 6 0 V16 l-5 -6" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><line x1="5" y1="42" x2="31" y2="42" stroke="currentColor" stroke-width="3"/></svg>',
 lap:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="27" r="16" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 27 V17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M19 5 h10 M24 5 v6" stroke="currentColor" stroke-width="3"/></svg>',
 empty:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="5" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 5"/></svg>'};
var NAME={water:"Água",oil:"Óleo",boost:"Turbo",fuel:"Combustível",lap:"Tempo de volta",empty:"Vazio"};

/* ---------- medidores ---------- */
var GZ={water:{min:60,max:130,unit:"°C",d:0,dir:1,r:function(){return[settings.ww,settings.wc]}},
        oil:{min:60,max:160,unit:"°C",d:0,dir:1,r:function(){return[settings.ow,settings.oc]}},
        boost:{min:-0.5,max:2.0,unit:"bar",d:2,dir:1,r:function(){return[1.6,1.8]}},
        fuel:{min:0,max:100,unit:"%",d:0,dir:-1,r:function(){return[settings.fw,7]}}};
function lvlOf(id,v){var z=GZ[id],r=z.r();if(z.dir>0)return v>=r[1]?3:v>=r[0]?2:0;return v<=r[1]?3:v<=r[0]?2:(id==="fuel"&&v<=25?1:0)}
function pc(z,x){return clamp((x-z.min)/(z.max-z.min),0,1)*100}
function hintOf(id){var r=GZ[id].r(),u=GZ[id].unit,f=function(x){return GZ[id].d?comma(x,1):x};return "Atenção: "+f(r[0])+" "+u+"\nCrítico: "+f(r[1])+" "+u}
/* ---------- lugares e medidores (regras do layout em src/layout.js) ---------- */
var HIST={water:[],oil:[],boost:[],fuel:[]},PEAK={water:-1e9,oil:-1e9,boost:-1e9};
function slotEl(side,i){return $('#side-'+side+' .slot[data-i="'+i+'"]')}
function eachPlace(fn){Lay.places(lay).forEach(function(p){var el=slotEl(p.side,p.i);if(el)fn(el,p.item,p)})}
function slotInner(id,sz){
  if(id==="empty")return '<div class="emptytxt">Espaço livre</div>';
  if(id==="lap")return '<div class="gh">'+SYM.lap+'<span>Volta</span></div><div class="gv" data-r="v">0:00,0</div><div class="meta" data-r="m"></div>'+(sz>=4?'<div class="meta" data-r="m2"></div>':'')+(sz===6?'<div class="lapl" data-r="list"></div>':'');
  var z=GZ[id];
  return '<div class="gh">'+SYM[id]+'<span>'+NAME[id]+'</span></div><em class="tag" data-r="tag"></em><div class="gv"><span data-r="v">--</span><small>'+z.unit+'</small></div><div class="ghint" data-r="h"></div>'
    +(sz>=4?'<div class="meta" data-r="m"></div>':'')
    +(sz===6?'<div class="tlbl">ÚLTIMOS 90 s</div><svg class="trend" data-r="t" viewBox="0 0 276 140" preserveAspectRatio="none" aria-hidden="true"></svg>':'')
    +'<div class="bar"><div class="fill" data-r="f"></div></div><div class="zones" data-r="z"></div>'}
function renderSlots(){
  Lay.SIDES.forEach(function(s){var sizes=Lay.FORMATS[lay[s].f];
    $("#side-"+s).innerHTML=sizes.map(function(sz,i){var id=lay[s].items[i];
      return '<div class="slot sz'+sz+(id==="empty"?" empty":"")+(id==="lap"?" lapw":"")+'" data-side="'+s+'" data-i="'+i+'" data-item="'+id+'" style="grid-row:span '+sz+'">'
        +slotInner(id,sz)+'<div class="ectl"><b>'+NAME[id]+'</b><span>'+Lay.SIZE_NAME[sz]+'</span><i>Trocar aqui</i></div></div>'}).join("")+gripHtml(s)});
  eachPlace(function(el,id){if(GZ[id])updZones(el,id)});markSel();updGauges();slowTick(true)}
/* alça: só onde o arrasto não tira ninguém da tela (colunas com 1 ou 2 quadros). Com 3 compactos, o tamanho muda pelo ajuste, que avisa antes */
var GRIP_SVG='<svg viewBox="0 0 72 28" aria-hidden="true"><path d="M36 2 l7 7 h-14 Z M36 26 l7 -7 h-14 Z" fill="currentColor"/><line x1="6" y1="11" x2="24" y2="11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="6" y1="17" x2="24" y2="17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="48" y1="11" x2="66" y2="11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="48" y1="17" x2="66" y2="17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
function gripHtml(s){var sizes=Lay.FORMATS[lay[s].f];if(sizes.length>2)return "";
  var top=sizes.length===1?"calc(100% - 34px)":"calc("+sizes[0]+" * (100% + 16px) / 6 - 8px)";
  return '<button type="button" class="grip" data-side="'+s+'" style="top:'+top+'" aria-label="Redimensionar a coluna '+Lay.SIDE_NAME[s]+'">'+GRIP_SVG+'</button>'}
function updZones(el,id){var z=GZ[id],r=z.r(),zz=$("[data-r=z]",el);if(!zz)return;
  if(z.dir>0)zz.innerHTML='<i class="za" style="left:'+pc(z,r[0])+'%;width:'+(pc(z,r[1])-pc(z,r[0]))+'%"></i><i class="zc" style="left:'+pc(z,r[1])+'%;right:0"></i>';
  else zz.innerHTML='<i class="zc" style="left:0;width:'+pc(z,r[1])+'%"></i><i class="za" style="left:'+pc(z,r[1])+'%;width:'+(pc(z,r[0])-pc(z,r[1]))+'%"></i>';
  var h=$("[data-r=h]",el);if(h)h.textContent=hintOf(id)}
function metaOf(id){
  if(id==="fuel"){var h=HIST.fuel;if(h.length<20)return "Consumo: calculando…";var rate=(h[0]-h[h.length-1])/(h.length-1);
    if(rate<=1e-4)return "Consumo: calculando…";var n=S.fuel/(rate*bestLap().time);return n<1?"Dá para menos de 1 volta":"Dá para ~"+Math.floor(n)+" volta"+(n>=2?"s":"")}
  if(PEAK[id]<-1e8)return "";return "Máximo: "+(GZ[id].d?comma(PEAK[id],2):Math.round(PEAK[id]))+" "+GZ[id].unit}
function updGauges(){
  eachPlace(function(el,id,p){if(id==="empty")return;
    if(id==="lap"){var b=bestLap(),lst=laps[laps.length-1];$("[data-r=v]",el).textContent=fmtLap(S.lapT);
      $("[data-r=m]",el).textContent=p.size>2?"Melhor "+fmtLap(b.time):"";
      var m2=$("[data-r=m2]",el);if(m2)m2.textContent="Última "+fmtLap(lst.time)+(lst===b?" ★":" · "+fmtD(lst.time-b.time));return}
    var z=GZ[id],v=S[id],st=lvlOf(id,v);
    $("[data-r=v]",el).textContent=z.d?comma(v,z.d).replace("-","−"):Math.round(v);
    var f=$("[data-r=f]",el);f.style.width=pc(z,v)+"%";f.className="fill"+(st===3?" c":st===2?" w":"");
    el.classList.toggle("st2",st===2);el.classList.toggle("st3",st===3);
    $("[data-r=tag]",el).textContent=st===3?"CRÍTICO":st===2?"ATENÇÃO":""})}
/* 1 vez por segundo: histórico, máximos, tendência e lista de voltas (só nos lugares grandes) */
var slowLast=0;
function slowTick(force){var now=performance.now();if(!force){if(now-slowLast<1000)return;slowLast=now;
    ["water","oil","boost","fuel"].forEach(function(k){HIST[k].push(S[k]);if(HIST[k].length>90)HIST[k].shift();if(k!=="fuel")PEAK[k]=Math.max(PEAK[k],S[k])})}
  eachPlace(function(el,id,p){
    var m=$("[data-r=m]",el);if(m&&id!=="lap")m.textContent=metaOf(id);
    if(p.size===6&&GZ[id])drawTrend($("[data-r=t]",el),id);
    if(p.size===6&&id==="lap")drawLapList($("[data-r=list]",el))})}
function drawTrend(svg,id){if(!svg)return;var z=GZ[id],r=z.r(),h=HIST[id],W=276,H=140,y=function(v){return (H-4)-(clamp((v-z.min)/(z.max-z.min),0,1))*(H-8)},x=function(i){return h.length<2?0:i*(W/(89))};
  var s='<line x1="0" x2="'+W+'" y1="'+y(r[0]).toFixed(1)+'" y2="'+y(r[0]).toFixed(1)+'" stroke="var(--amber)" stroke-width="3" stroke-dasharray="10 8"/>'
       +'<line x1="0" x2="'+W+'" y1="'+y(r[1]).toFixed(1)+'" y2="'+y(r[1]).toFixed(1)+'" stroke="var(--red)" stroke-width="3" stroke-dasharray="10 8"/>';
  if(h.length>1){var off=90-h.length;s+='<polyline fill="none" stroke="var(--text)" stroke-width="4" stroke-linejoin="round" points="'+h.map(function(v,i){return x(i+off).toFixed(1)+","+y(v).toFixed(1)}).join(" ")+'"/>'}
  svg.innerHTML=s}
function drawLapList(box){if(!box)return;var b=bestLap();
  box.innerHTML=laps.slice(-5).reverse().map(function(l){return '<div><span>'+l.n+'</span><b>'+fmtLap2(l.time)+'</b><span>'+(l===b?"melhor":fmtD(l.time-b.time))+'</span></div>'}).join("")}


/* ---------- centro: arco, marcha, velocidade, rotação ---------- */
(function buildCenter(){
  var cx=288,cy=300,R=230,arcLen=Math.PI*R,h="";
  var a0=SHIFT/8000;
  h+='<g id="leds">';for(var i=0;i<10;i++)h+='<rect x="'+(43+i*50)+'" y="6" width="40" height="22" rx="4" fill="var(--card2)" stroke="var(--line)" stroke-width="2"/>';h+='</g>';
  h+='<path d="M'+(cx-R)+' '+cy+' A'+R+' '+R+' 0 0 1 '+(cx+R)+' '+cy+'" fill="none" stroke="var(--card2)" stroke-width="26"/>';
  h+='<path d="M'+(cx-R)+' '+cy+' A'+R+' '+R+' 0 0 1 '+(cx+R)+' '+cy+'" fill="none" stroke="var(--amber)" stroke-width="8" stroke-dasharray="'+((1-a0)*arcLen).toFixed(1)+' '+arcLen.toFixed(1)+'" stroke-dashoffset="'+(-a0*arcLen).toFixed(1)+'" style="opacity:.9" id="zoneA"/>';
  h+='<path id="rpmArc" d="M'+(cx-R)+' '+cy+' A'+R+' '+R+' 0 0 1 '+(cx+R)+' '+cy+'" fill="none" stroke="var(--text)" stroke-width="26" stroke-dasharray="0 '+arcLen.toFixed(1)+'"/>';
  for(var k=0;k<=8;k++){var a=Math.PI+(k/8)*Math.PI,x1=cx+Math.cos(a)*(R-18),y1=cy+Math.sin(a)*(R-18),x2=cx+Math.cos(a)*(R+16),y2=cy+Math.sin(a)*(R+16),xl=cx+Math.cos(a)*(R-46),yl=cy+Math.sin(a)*(R-46);
    h+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var(--sub)" stroke-width="3"/><text x="'+xl.toFixed(1)+'" y="'+(yl+9).toFixed(1)+'" text-anchor="middle" font-size="26" font-weight="700" fill="var(--sub)">'+k+'</text>'}
  h+='<text x="'+cx+'" y="305" id="gear" text-anchor="middle" font-size="200" font-weight="800" fill="var(--text)">N</text>';
  h+='<text x="322" y="392" id="spd" text-anchor="end" font-size="80" font-weight="700" fill="var(--text)" style="font-variant-numeric:tabular-nums">0</text>';
  h+='<text x="334" y="392" text-anchor="start" font-size="26" font-weight="700" fill="var(--sub)" letter-spacing="2">KM/H</text>';
  h+='<text x="'+cx+'" y="440" id="rpmv" text-anchor="middle" font-size="32" font-weight="700" fill="var(--text)" style="font-variant-numeric:tabular-nums">900 rpm</text>';
  $("#rpmSvg").innerHTML=h})();

/* ---------- alertas ---------- */
var ack={},peak={},lastBeep=0,critStart=0,transient=[],lastSk="";
function activeAlerts(){var a=[];
  var w=lvlOf("water",S.water),o=lvlOf("oil",S.oil),b=lvlOf("boost",S.boost),f=lvlOf("fuel",S.fuel);
  if(w)a.push({id:"water",lv:w,v:S.water,t:w===3?"Água muito quente":"Água quente",d:Math.round(S.water)+" °C · "+(w===3?"Reduza a carga e pare":"Alivie o acelerador")});
  if(o)a.push({id:"oil",lv:o,v:S.oil,t:o===3?"Óleo muito quente":"Óleo quente",d:Math.round(S.oil)+" °C · "+(o===3?"Pare quando for seguro":"Evite rotação alta")});
  if(b)a.push({id:"boost",lv:b,v:S.boost*20,t:b===3?"Turbo muito alto":"Turbo alto",d:comma(S.boost,2)+" bar · "+(b===3?"Alivie o acelerador":"Evite pé embaixo longo")});
  if(f)a.push({id:"fuel",lv:f,v:100-S.fuel,t:f===3?"Combustível na reserva":f===2?"Combustível baixo":"Combustível em "+Math.round(S.fuel)+"%",d:f===1?"Planeje o abastecimento":Math.round(S.fuel)+"% · "+(f===3?"Vá para os boxes":"Planeje o abastecimento")});
  var now=performance.now();transient=transient.filter(function(x){return x.until>now});transient.forEach(function(x){a.push(x)});
  a.sort(function(x,y){return y.lv-x.lv});return a}
function stripRender(){var a=activeAlerts(),top=a[0],el=$("#strip"),now=performance.now(),d=$("#dash");
  a.forEach(function(x){var p=peak[x.id];
    if(!p||x.lv>p.lv){peak[x.id]={lv:x.lv,v:x.v};delete ack[x.id];onNewAlert(x)}
    else if(x.v>=p.v+3&&x.lv>=2){p.v=x.v;delete ack[x.id];onNewAlert(x,true)}});
  Object.keys(peak).forEach(function(k){if(!a.some(function(x){return x.id===k})){delete peak[k];delete ack[k]}});
  var sk=a.map(function(x){return x.id+":"+x.lv+(ack[x.id]?"a":"")}).join(",");if(sk!==lastSk){lastSk=sk;queueStatus()}
  var key=top?top.lv+"|"+top.t+"|"+top.d+"|"+a.length:"ok|"+(S.car)+"|"+S.lapN+"|"+settings.tips+S.view+S.editing;
  if(el.dataset.k!==key){el.dataset.k=key;
    if(!top){el.className="strip";el.setAttribute("role","status");el.innerHTML=ICON.ok+'<div class="t">Sem alertas</div><span class="mode">'+(S.car==="track"?"PISTA · VOLTA "+S.lapN:(S.editing?"EDITANDO O LAYOUT":S.view==="painel"?"PARADO · TOQUE NUM QUADRO PARA AJUSTAR":"CARRO PARADO"))+'</span>'}
    else{el.className="strip l"+top.lv;el.setAttribute("role",top.lv===3?"alert":"status");
      el.innerHTML=ICON[top.lv]+'<div class="t"><b>'+top.t+'</b><span>'+top.d+'</span></div>'+(a.length>1?'<span class="more">+'+(a.length-1)+' alerta'+(a.length>2?'s':'')+'</span>':'')}}
  d.classList.toggle("crit",!!top&&top.lv===3);
  var crit=a.filter(function(x){return x.lv===3});
  if(crit.length){var intense=crit.some(function(x){return !ack[x.id]})&&now-critStart<15000;
    if(intense){if(now-lastBeep>500){tone((Math.round(now/500)%2)?1100:880,.32,true);lastBeep=now}}
    else if(now-lastBeep>5000){tone(880,.18,true);setTimeout(function(){tone(1100,.18,true)},220);lastBeep=now}}}
function onNewAlert(x,worse){var now=performance.now();
  if(x.lv===3){critStart=now;lastBeep=0}
  else if(x.lv===2&&settings.snd2){tone(660,.13);setTimeout(function(){tone(660,.13)},230)}}
function ackCrit(){var a=activeAlerts().filter(function(x){return x.lv===3});if(!a.length){demo("Nenhum alerta crítico ativo.");return}
  a.forEach(function(x){ack[x.id]=true});critStart=-1e9;lastBeep=performance.now();demo("Alerta crítico reconhecido: o tom virou lembrete a cada 5 s. A faixa continua até a causa sumir.")}

var actx=null;
function tone(freq,dur,crit){if(!actx)return;try{var o=actx.createOscillator(),g=actx.createGain();o.type="square";o.frequency.value=freq;g.gain.value=.0001;o.connect(g);g.connect(actx.destination);
  var vol=crit?Math.max(settings.vol,70):settings.vol,t=actx.currentTime,pk=.16*(vol/100);g.gain.exponentialRampToValueAtTime(Math.max(pk,.0002),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.start(t);o.stop(t+dur+.02)}catch(e){}}

var toastT=null,toastCb=null;
function toast(msg,cb){$("#toastText").textContent=msg;var b=$("#toastBtn");toastCb=cb||null;b.style.display=cb?"":"none";$("#toast").classList.add("on");clearTimeout(toastT);toastT=setTimeout(function(){$("#toast").classList.remove("on")},cb?6000:3500)}
$("#toastBtn").addEventListener("click",function(){if(toastCb)toastCb();$("#toast").classList.remove("on")});
var lastMsg="";
function hideToast(){$("#toast").classList.remove("on")}
function demo(m){lastMsg=m;queueStatus()}

/* ---------- ajustes ---------- */
var undoS=[];
function snapS(){undoS.push(clone(settings));if(undoS.length>30)undoS.shift();$("#aUndo").disabled=false}
function applyTheme(){var d=$("#dash"),th=settings.theme;if(th==="auto")th=S.amb<25?"noturno":S.amb>72?"sol":"pista";
  d.classList.remove("theme-pista","theme-noturno","theme-sol");d.classList.add("theme-"+th);d.classList.toggle("tips",!!settings.tips);
  document.body.style.background=th==="sol"?"#F2F3F4":"#000"}
function syncSettings(){
  [["sWW","ww","oWW"," °C"],["sWC","wc","oWC"," °C"],["sOW","ow","oOW"," °C"],["sOC","oc","oOC"," °C"],["sFW","fw","oFW","%"],["sVol","vol","oVol","%"]].forEach(function(a){$("#"+a[0]).value=settings[a[1]];$("#"+a[2]).textContent=settings[a[1]]+a[3]});
  var s=$("#swSnd");s.setAttribute("aria-checked",settings.snd2);$(".st",s).textContent=settings.snd2?"Sim":"Não";
  var t=$("#swTips");t.setAttribute("aria-checked",settings.tips);$(".st",t).textContent=settings.tips?"Sim":"Não";
  $$("#themeSeg button").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.th===settings.theme)});
  applyTheme();eachPlace(function(el,id){if(GZ[id])updZones(el,id)})}
[["sWW","ww"],["sWC","wc"],["sOW","ow"],["sOC","oc"],["sFW","fw"],["sVol","vol"]].forEach(function(a){var el=$("#"+a[0]),fresh=true,tm;
  el.addEventListener("input",function(){if(fresh){snapS();fresh=false}clearTimeout(tm);tm=setTimeout(function(){fresh=true},700);settings[a[1]]=+el.value;
    if(a[1]==="ww"&&settings.wc<=settings.ww)settings.wc=settings.ww+5;if(a[1]==="wc"&&settings.ww>=settings.wc)settings.ww=settings.wc-5;
    if(a[1]==="oc"&&settings.ow>=settings.oc)settings.ow=settings.oc-5;if(a[1]==="ow"&&settings.oc<=settings.ow)settings.oc=settings.ow+5;
    syncSettings();save()})});
$("#swSnd").addEventListener("click",function(){snapS();settings.snd2=!settings.snd2;syncSettings();save();if(settings.snd2){tone(660,.13);setTimeout(function(){tone(660,.13)},230)}});
$("#swTips").addEventListener("click",function(){snapS();settings.tips=!settings.tips;syncSettings();save()});
$("#themeSeg").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;snapS();settings.theme=b.dataset.th;syncSettings();save()});
$("#aUndo").addEventListener("click",function(){if(!undoS.length)return;settings=undoS.pop();$("#aUndo").disabled=!undoS.length;syncSettings();save();toast("Último ajuste desfeito.")});
$("#aReset").addEventListener("click",function(){snapS();snapL();settings=clone(DEF_SET);lay=Lay.clone(Lay.DEFAULT);renderSlots();syncSettings();save();
  toast("Padrões restaurados.",function(){settings=undoS.pop()||settings;lay=undoL.pop()||lay;$("#aUndo").disabled=!undoS.length;renderSlots();syncSettings();save()})});
$("#tests").innerHTML=[1,2,3].map(function(l){return '<button data-test="'+l+'" class="l'+l+'">'+(l===1?ICON[1]:l===2?'<svg viewBox="0 0 24 24"><path d="M12 2.5 L23 21.5 H1 Z" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>':'<svg viewBox="0 0 24 24"><polygon points="7.6,1 16.4,1 23,7.6 23,16.4 16.4,23 7.6,23 1,16.4 1,7.6" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>')+'Nível '+l+'</button>'}).join("");
$("#tests").addEventListener("click",function(e){var b=e.target.closest("[data-test]");if(!b)return;var lv=+b.dataset.test;
  transient.push({id:"test"+lv+"_"+Date.now(),lv:lv,v:0,t:"Teste · nível "+lv,d:["","Informação: sem som","Atenção: dois bipes","Crítico: tom contínuo e moldura"][lv],until:performance.now()+5000})});

/* ---------- edição do layout: só com o carro parado ----------
 * Toque num quadro: abre o ajuste (o que mostrar e tamanho), com a consequência de cada opção escrita antes.
 * Arrastar um quadro para outro troca os dois de lugar (acelerador); "Mover para outro lugar" faz o mesmo com dois toques.
 * Toda mudança vale na hora, fica salva e pode ser desfeita (30 passos). */
var undoL=[],selP=null,moveFrom=null,drag=null;
function snapL(){undoL.push(Lay.clone(lay));if(undoL.length>30)undoL.shift();$("#eUndo").disabled=false;$("#inUndo").disabled=false}
function commit(next){snapL();lay=Lay.normalize(next);renderSlots();save();queueStatus()}
function undoLayout(){if(!undoL.length)return false;lay=undoL.pop();var none=!undoL.length;$("#eUndo").disabled=none;$("#inUndo").disabled=none;renderSlots();save();queueStatus();
  if(selP){var n=Lay.FORMATS[lay[selP.side].f].length;selP.i=Math.min(selP.i,n-1);renderInsp()}return true}
function canEdit(){return !moving()&&S.on}
function samePlace(a,b){return !!a&&!!b&&a.side===b.side&&a.i===b.i}
function placeOf(el){return {side:el.dataset.side,i:+el.dataset.i}}
function markSel(){$$("#pgrid .slot").forEach(function(el){var p=placeOf(el);el.classList.toggle("sel",samePlace(p,selP));el.classList.toggle("from",samePlace(p,moveFrom))})}
function colRects(sizes,H,g){var U=(H-5*g)/6,y=0;return sizes.map(function(sz){var r={y:y,h:sz*U+(sz-1)*g};y+=r.h+g;return r})}
function sizeThumb(l,side,i){return '<svg viewBox="0 0 30 64" aria-hidden="true">'+colRects(Lay.FORMATS[l[side].f],60,2).map(function(r,k){return '<rect x="1.5" y="'+(r.y+2).toFixed(1)+'" width="27" height="'+r.h.toFixed(1)+'" rx="3" fill="'+(k===i?"var(--text)":"none")+'" stroke="var(--sub)" stroke-width="2"/>'}).join("")+'</svg>'}
function consequence(r,id,side){var t=[];
  if(r.removed.length)t.push(r.removed.map(function(x){return NAME[x]}).join(" e ")+" sai da tela");
  if(r.relocated.length)t.push(r.relocated.map(function(x){return NAME[x]}).join(" e ")+" vai para a outra coluna");
  r.changed.forEach(function(x){var w=Lay.where(r.lay,x);t.push(NAME[x]+" fica "+Lay.SIZE_NAME[Lay.FORMATS[r.lay[w.side].f][w.i]].toLowerCase())});
  var before=lay[side].items.filter(function(x){return x==="empty"}).length,after=r.lay[side].items.filter(function(x){return x==="empty"}).length;
  if(after>before)t.push("abre um espaço livre");
  return t.length?t.join("; "):"Nada mais muda"}
function openInsp(side,i){closePresets();cancelMove();hideToast();selP={side:side,i:i};renderInsp();$("#insp").className="insp on side-"+side;markSel()}
function closeInsp(){selP=null;$("#insp").className="insp";markSel()}
function renderInsp(){if(!selP)return;var s=selP.side,i=selP.i,id=lay[s].items[i],cur=Lay.FORMATS[lay[s].f][i];
  $("#inTitle").textContent=Lay.placeName(lay,s,i);
  $("#inSub").textContent="Agora: "+NAME[id]+" · "+Lay.SIZE_NAME[cur];$("#inSub").classList.remove("done");
  $("#inItems").innerHTML=Lay.ITEMS.concat("empty").map(function(x){var w=Lay.where(lay,x),away=w&&!samePlace(w,selP);
    return '<button type="button" data-pick="'+x+'" aria-pressed="'+(x===id)+'">'+SYM[x]+'<span>'+NAME[x]+(away?'<small>troca de lugar</small>':'')+'</span></button>'}).join("");
  $("#inSizes").innerHTML=Lay.SIZES.map(function(sz){var on=sz===cur,r=on?{lay:lay,index:i}:Lay.setSize(lay,s,i,sz);
    return '<button type="button" data-size="'+sz+'" aria-pressed="'+on+'">'+sizeThumb(r.lay,s,r.index)+'<span><b>'+Lay.SIZE_NAME[sz]+'</b><small>'+(on?"Tamanho atual":consequence(r,id,s))+'</small></span></button>'}).join("")}
function inMsg(t){var el=$("#inSub");el.textContent=t;el.classList.add("done")}
$("#inItems").addEventListener("click",function(e){var b=e.target.closest("[data-pick]");if(!b||!selP)return;var id=b.dataset.pick,s=selP.side,i=selP.i,cur=lay[s].items[i];if(id===cur)return;
  var r=Lay.setItem(lay,s,i,id);commit(r.lay);renderInsp();
  inMsg(r.swappedWith?NAME[id]+" e "+NAME[r.old]+" trocaram de lugar.":id==="empty"?"Lugar vazio. Os outros quadros não se mexeram.":NAME[id]+" neste lugar.")});
$("#inSizes").addEventListener("click",function(e){var b=e.target.closest("[data-size]");if(!b||!selP)return;var sz=+b.dataset.size,s=selP.side,i=selP.i;if(Lay.FORMATS[lay[s].f][i]===sz)return;
  var id=lay[s].items[i],r=Lay.setSize(lay,s,i,sz),msg=NAME[id]+": "+Lay.SIZE_NAME[sz].toLowerCase()+". "+consequence(r,id,s)+".";
  commit(r.lay);selP.i=r.index;renderInsp();markSel();inMsg(msg.replace("Nada mais muda.",""))});
$("#inUndo").addEventListener("click",function(){if(undoLayout())inMsg("Mudança desfeita.")});
$("#inMove").addEventListener("click",function(){if(!selP)return;var from=selP;closeInsp();startMove(from)});
$("#inDone").addEventListener("click",closeInsp);
/* mover com dois toques */
function startMove(from){moveFrom=from;$("#dash").classList.add("moving");
  $("#editHint").textContent="Toque no lugar para onde "+NAME[lay[from.side].items[from.i]]+" vai. O tamanho fica com o lugar.";markSel()}
function cancelMove(){if(!moveFrom)return;moveFrom=null;$("#dash").classList.remove("moving");$("#editHint").textContent=HINT;markSel()}
function doMove(a,b){var ia=lay[a.side].items[a.i],ib=lay[b.side].items[b.i];cancelMove();if(samePlace(a,b))return;
  commit(Lay.swap(lay,a,b));
  toast(ib==="empty"?NAME[ia]+" foi para "+Lay.placeName(lay,b.side,b.i).toLowerCase()+".":NAME[ia]+" e "+NAME[ib]+" trocaram de lugar.",function(){undoLayout()})}
$("#eCancel").addEventListener("click",cancelMove);
/* toque e arrasto nos quadros */
function stageXY(e){var r=stage.getBoundingClientRect(),s=r.width/1280;return{x:(e.clientX-r.left)/s,y:(e.clientY-r.top)/s,s:s}}
function slotAt(e){var el=document.elementFromPoint(e.clientX,e.clientY);return el&&el.closest?el.closest("#pgrid .slot"):null}
$("#pgrid").addEventListener("pointerdown",function(e){var el=e.target.closest(".slot");if(!el||!canEdit()||S.view!=="painel")return;
  drag={el:el,x:e.clientX,y:e.clientY,id:e.pointerId,on:false}});
window.addEventListener("pointermove",function(e){if(!drag||e.pointerId!==drag.id)return;
  if(!drag.on){if(!S.editing||drag.el.dataset.item==="empty"||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<14)return;
    closeInsp();cancelMove();var p=stageXY(e),r=drag.el.getBoundingClientRect(),g=drag.el.cloneNode(true);
    g.className+=" ghost";g.style.width=(r.width/p.s)+"px";g.style.height=(r.height/p.s)+"px";drag.dx=p.x-(r.left-stage.getBoundingClientRect().left)/p.s;drag.dy=p.y-(r.top-stage.getBoundingClientRect().top)/p.s;
    $("#dash").appendChild(g);drag.g=g;drag.on=true;drag.el.classList.add("lift")}
  var q=stageXY(e);drag.g.style.left=(q.x-drag.dx)+"px";drag.g.style.top=(q.y-drag.dy)+"px";
  var t=slotAt(e);$$("#pgrid .slot").forEach(function(x){x.classList.toggle("drop",x===t&&x!==drag.el)})});
function endDrag(){if(!drag)return;if(drag.g)drag.g.remove();drag.el.classList.remove("lift");$$("#pgrid .slot.drop").forEach(function(x){x.classList.remove("drop")});drag=null}
window.addEventListener("pointerup",function(e){if(!drag||e.pointerId!==drag.id)return;var d=drag;
  if(d.on){var t=slotAt(e);endDrag();if(t&&t!==d.el)doMove(placeOf(d.el),placeOf(t));return}
  drag=null;tapSlot(d.el)});
window.addEventListener("pointercancel",endDrag);
function tapSlot(el){if(!canEdit()||S.view!=="painel")return;var p=placeOf(el);
  if(!S.editing){setView("editar");openInsp(p.side,p.i);return}
  if(moveFrom){doMove(moveFrom,p);return}
  if(samePlace(selP,p))closeInsp();else openInsp(p.side,p.i)}
/* redimensionar arrastando a alça: o quadro de cima vai para o tamanho da grade mais próximo do dedo (prévia ao vivo) */
var rs=null;
function sizesText(side){return lay[side].items.map(function(x,k){return NAME[x]+": "+Lay.SIZE_NAME[Lay.FORMATS[lay[side].f][k]].toLowerCase()}).join(" · ")}
$("#pgrid").addEventListener("pointerdown",function(e){var g=e.target.closest(".grip");if(!g||!S.editing||!canEdit())return;e.preventDefault();e.stopPropagation();
  closeInsp();cancelMove();hideToast();var s=g.dataset.side;
  rs={side:s,id:e.pointerId,start:Lay.clone(lay),size:Lay.FORMATS[lay[s].f][0],opts:Lay.FORMATS[lay[s].f].length===1?[2,3,4,6]:[2,3,4],rect:$("#side-"+s).getBoundingClientRect()};
  $("#dash").classList.add("resizing");$("#editHint").textContent=sizesText(s)},true);
window.addEventListener("pointermove",function(e){if(!rs||e.pointerId!==rs.id)return;var r=rs.rect,k=r.height/600,
    units=(e.clientY-r.top+8*k)/((r.height+16*k)/6),best=rs.opts.reduce(function(a,b){return Math.abs(b-units)<Math.abs(a-units)?b:a});
  if(best===rs.size)return;var res=Lay.setSize(rs.start,rs.side,0,best);if(res.removed.length)return;
  rs.size=best;lay=res.lay;renderSlots();$("#editHint").textContent=sizesText(rs.side)});
function endResize(ok){if(!rs)return;var d=rs;rs=null;$("#dash").classList.remove("resizing");$("#editHint").textContent=HINT;
  if(!ok){lay=d.start;renderSlots();return}
  if(JSON.stringify(lay)===JSON.stringify(d.start))return;
  undoL.push(d.start);if(undoL.length>30)undoL.shift();$("#eUndo").disabled=false;$("#inUndo").disabled=false;save();queueStatus();
  toast(sizesText(d.side)+".",function(){undoLayout()})}
window.addEventListener("pointerup",function(e){if(rs&&e.pointerId===rs.id)endResize(true)});
window.addEventListener("pointercancel",function(){endResize(false)});
/* modelos prontos */
function dashThumb(l){var s='<svg viewBox="0 0 128 72" aria-hidden="true"><rect x="2" y="2" width="124" height="9" rx="2" fill="var(--card2)"/>';
  [["L",2],["R",94]].forEach(function(c){colRects(Lay.FORMATS[l[c[0]].f],57,2).forEach(function(r,k){var it=l[c[0]].items[k];
    s+='<rect x="'+c[1]+'" y="'+(13+r.y).toFixed(1)+'" width="32" height="'+r.h.toFixed(1)+'" rx="2" fill="'+(it==="empty"?"none":"var(--card2)")+'" stroke="var(--sub)" stroke-width="1.2"'+(it==="empty"?' stroke-dasharray="3 2"':'')+'/>'})});
  return s+'<path d="M44 52 A20 20 0 0 1 84 52" fill="none" stroke="var(--text)" stroke-width="4"/><rect x="36" y="13" width="56" height="57" rx="2" fill="none" stroke="var(--line)" stroke-width="1.2"/></svg>'}
function openPresets(){closeInsp();cancelMove();hideToast();var cur=Lay.presetOf(lay);
  $("#prOpts").innerHTML=Object.keys(Lay.PRESETS).map(function(k){var p=Lay.PRESETS[k];
    return '<button type="button" data-preset="'+k+'" aria-pressed="'+(k===cur)+'">'+dashThumb(Lay.normalize(p.lay))+'<b>'+p.name+(k===cur?' · atual':'')+'</b><span>'+p.desc+'</span></button>'}).join("");
  $("#presets").classList.add("on")}
function closePresets(){$("#presets").classList.remove("on")}
function applyPreset(k){var p=Lay.PRESETS[k];if(!p)return false;if(Lay.presetOf(lay)===k)return true;commit(p.lay);toast("Modelo "+p.name+" aplicado.",function(){undoLayout()});return true}
$("#prOpts").addEventListener("click",function(e){var b=e.target.closest("[data-preset]");if(!b)return;closePresets();applyPreset(b.dataset.preset)});
$("#prCancel").addEventListener("click",closePresets);
$("#ePresets").addEventListener("click",openPresets);
$("#eUndo").addEventListener("click",function(){if(undoLayout())toast("Mudança desfeita.")});
$("#eDone").addEventListener("click",function(){setView("painel")});
var HINT="Toque num quadro para escolher o que ele mostra e o tamanho. Arraste a alça entre dois quadros para redimensionar; arraste um quadro para trocar de lugar.";
function closeEditUI(){closeInsp();closePresets();cancelMove();endDrag();endResize(true)}


/* ---------- navegação (só parado) ---------- */
function moving(){return S.car==="track"||S.v>=5}
function setView(v){if(moving()&&v!=="painel")return;
  S.editing=v==="editar";var view=S.editing?"painel":v;S.view=view;closeEditUI();$("#editHint").textContent=HINT;
  $$(".view").forEach(function(x){x.classList.toggle("on",x.id==="v-"+view)});
  $$("#nav button").forEach(function(b){if(b.dataset.view===view)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  $("#dash").classList.toggle("editing",S.editing);
  if(view==="voltas")renderLaps();if(view==="ajustes")syncSettings()}
$("#nav").addEventListener("click",function(e){var b=e.target.closest("button");if(b)setView(b.dataset.view)});
$("#aEdit").addEventListener("click",function(){setView("editar")});

/* ---------- voltas ---------- */
function renderLaps(){var best=bestLap(),box=$("#laps");if(!S.sel||laps.indexOf(S.sel)<0)S.sel=laps[laps.length-1];
  box.innerHTML="";laps.slice().reverse().forEach(function(l){var d=l.time-best.time,b=document.createElement("button");b.setAttribute("aria-pressed",l===S.sel);
    b.innerHTML='<span>'+l.n+'</span><span class="'+(l===best?"bst":"")+'">'+fmtLap2(l.time)+(l===best?" ★":"")+'</span><span style="text-align:right">'+(l===best?"melhor":fmtD(d)+" s")+'</span>';
    b.addEventListener("click",function(){S.sel=l;renderLaps()});box.appendChild(b)});
  var W=760,H=250,l0=58,b0=34,x=function(i){return l0+(i/100)*(W-l0-12)},y=function(v){return 10+(1-(v-40)/(200-40))*(H-10-b0)},h="";
  [60,100,140,180].forEach(function(v){h+='<line x1="'+l0+'" x2="'+(W-12)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(l0-10)+'" y="'+(y(v)+7)+'" text-anchor="end" font-size="22" font-weight="600" fill="var(--sub)">'+v+'</text>'});
  [["S1",16.5],["S2",50],["S3",83]].forEach(function(s){h+='<text x="'+x(s[1])+'" y="'+(H-6)+'" text-anchor="middle" font-size="22" font-weight="700" fill="var(--sub)">'+s[0]+'</text>'});
  [33,66].forEach(function(p){h+='<line x1="'+x(p)+'" x2="'+x(p)+'" y1="10" y2="'+(H-b0)+'" stroke="var(--sub)" stroke-dasharray="2 6"/>'});
  function pl(l,dash,w){return '<polyline fill="none" stroke="'+(dash?"var(--sub)":"var(--text)")+'" stroke-width="'+w+'" '+(dash?'stroke-dasharray="10 8"':'')+' points="'+l.sp.map(function(v,i){return x(i).toFixed(1)+","+y(v).toFixed(1)}).join(" ")+'"/>'}
  h+=pl(best,true,4);if(S.sel!==best)h+=pl(S.sel,false,4);
  $("#chart").innerHTML=h;$("#chartTitle").textContent="Volta "+S.sel.n+" contra a melhor (volta "+best.n+")";$("#lgSel").textContent="Volta "+S.sel.n;
  var sec=$("#secs");sec.innerHTML="";[[0,33],[33,66],[66,100]].forEach(function(r,i){var a=S.sel.cp[r[1]]-S.sel.cp[r[0]],b=best.cp[r[1]]-best.cp[r[0]],d=a-b;
    var div=document.createElement("div");div.className="sec";var same=S.sel===best;
    div.innerHTML="<span>SETOR "+(i+1)+"</span><b class='"+(!same&&d<0?"gain":"")+"'>"+(same?comma(a,2)+" s":fmtD(d)+" s")+"</b><span>"+(same?"melhor volta":d<0?"ganhou tempo":"perdeu tempo")+"</span>";sec.appendChild(div)})}

/* ---------- simulação ---------- */
function step(dt){var mv=S.car==="track";
  if(mv){var tg=prof(S.p)*S.pace;S.v+=(tg-S.v)*Math.min(1,dt*3);S.p+=S.v/3.6*dt/LAPLEN;S.lapT+=dt;
    while(S.nextCp<=100&&S.p>=S.nextCp/100){S.cp[S.nextCp]=S.lapT;S.sp[S.nextCp]=S.v;S.nextCp++}if(S.p>=1)finishLap()}
  else{S.v+=(0-S.v)*Math.min(1,dt*2.5);if(S.v<.4)S.v=0}
  var g=S.v<2?0:gearOf(S.v);S.gear=g;
  var tr=g?S.v*GR[g]+Math.sin(performance.now()/90)*18:900+Math.sin(performance.now()/130)*12;S.rpm+=(Math.max(900,tr)-S.rpm)*Math.min(1,dt*10);
  var wt=(mv?88+S.v/190*7:84)+S.heat,rate=wt>S.water?(S.heat>0?1.5:.5):(S.heat===0&&S.water>wt+1?2:.3);S.water+=clamp(wt-S.water,-rate*dt,rate*dt);
  var ot=(mv?98+S.v/190*14:94)+S.oilBias,or=ot>S.oil?(S.oilBias>0?1.6:.5):(S.oilBias===0&&S.oil>ot+1?2:.3);S.oil+=clamp(ot-S.oil,-or*dt,or*dt);
  var bt=mv?clamp((S.rpm-3000)/3500*1.45,-0.4,1.45)+S.boostBias*(S.rpm>4000?1:.4):-0.4;S.boost+=(bt-S.boost)*Math.min(1,dt*(S.boostBias?1.2:6));
  if(S.fuelDrain&&S.fuel>5)S.fuel-=.9*dt;else if(mv)S.fuel-=.012*dt;S.fuel=Math.max(0,S.fuel)}
function finishLap(){var l={n:S.lapN,time:S.lapT,cp:S.cp.slice(),sp:S.sp.slice()};l.cp[0]=0;l.cp[100]=S.lapT;l.sp[100]=S.v;
  var pb=bestLap();laps.push(l);if(laps.length>12)laps.shift();
  if(l.time<pb.time)transient.push({id:"best"+l.n,lv:1,v:0,t:"Melhor volta: "+fmtLap2(l.time),d:fmtD(l.time-pb.time)+" s sobre a anterior",until:performance.now()+6000});
  S.lapN++;S.p=0;S.lapT=0;S.cp=[0];S.sp=[S.v];S.nextCp=1;S.pace=.975+Math.random()*.05}
var lastDelta=0;
function render(){var now=performance.now(),R=230,arcLen=Math.PI*R,rv=clamp(S.rpm/8000,0,1),hot=S.rpm>=SHIFT;
  var arc=$("#rpmArc");arc.setAttribute("stroke-dasharray",(rv*arcLen).toFixed(1)+" "+arcLen.toFixed(1));arc.setAttribute("stroke",hot?"var(--amber)":"var(--text)");
  $("#gear").textContent=S.gear?S.gear:"N";$("#spd").textContent=Math.round(S.v);$("#rpmv").textContent=thou(Math.round(S.rpm/10)*10)+" rpm";
  var n=clamp(Math.floor((S.rpm-5000)/150),0,10);$$("#leds rect").forEach(function(el,i){var on=hot||i<n;el.setAttribute("fill",on?(hot?"var(--amber)":"var(--text)"):"var(--card2)");el.setAttribute("stroke",on&&hot?"var(--amber)":"var(--line)")});
  updGauges();slowTick();
  var best=bestLap();
  if(now-lastDelta>200){lastDelta=now;var dl=$("#dl"),dir=$("#dlDir");
    if(S.car==="track"&&S.p>.02){var i=Math.min(99,Math.floor(S.p*100)),f=S.p*100-i,ref=best.cp[i]+(best.cp[i+1]-best.cp[i])*f,d=S.lapT-ref;
      dl.textContent=fmtD(d);dl.className=d<0?"gain":"";dir.textContent=d<0?"MAIS RÁPIDO":"MAIS LENTO";dir.className="dir"+(d<0?" gain":"")}
    else{dl.textContent="--";dl.className="";dir.textContent="VS. MELHOR VOLTA";dir.className="dir"}
    $("#lapLine").textContent="VOLTA "+S.lapN+" · "+fmtLap(S.lapT)}
  stripRender()}
var last=performance.now();
setInterval(function(){var n=performance.now(),dt=Math.min(.2,(n-last)/1000);last=n;if(!S.on)return;step(dt);
  var park=!moving();var d=$("#dash");if(d.classList.contains("parked")!==park){d.classList.toggle("parked",park);if(!park&&(S.view!=="painel"||S.editing))setView("painel");if(!park){$("#toast").classList.remove("on")}}
  render()},50);

/* ---------- abertura ---------- */
function boot(){var sp=$("#splash");if(S.on||sp.classList.contains("booting"))return;
  if(!MIRROR){try{if(!actx)actx=new (window.AudioContext||window.webkitAudioContext)();if(actx.state==="suspended")actx.resume()}catch(e){}keepAwake()}
  sp.classList.add("booting");setTimeout(function(){sp.classList.add("off");sp.classList.remove("booting");S.on=true;last=performance.now();posFive();fsButton();queueStatus()},1600)}
$("#splash").addEventListener("click",function(){goFull();boot()});
function reboot(){S.on=false;$("#splash").classList.remove("off");closeEditUI();demo("Painel religado: toque na tela do celular para ligar.");if(MIRROR)setTimeout(boot,1200)}

/* ---------- comandos (os mesmos do painel de demonstração do protótipo) ---------- */
function setCar(c){if((c!=="track"&&c!=="parked")||c===S.car)return;S.car=c;
  if(c==="track"){S.p=0;S.lapT=0;S.cp=[0];S.sp=[0];S.nextCp=1;S.pace=1}
  demo(c==="track"?"Em movimento: só telemetria na tela.":"Parado: Painel, Voltas e Ajustes liberados quando a velocidade cair abaixo de 5 km/h.")}
var SIMTXT={water:"água do motor esquentando",oil:"óleo esquentando",boost:"turbo acima do limite",fuel:"combustível acabando",clear:"tudo voltando ao normal"};
function sim(k){if(!SIMTXT[k])return;
  if(k==="water")S.heat=26;if(k==="oil")S.oilBias=48;if(k==="boost")S.boostBias=.9;
  if(k==="fuel"){S.fuelDrain=true;if(S.fuel>27)S.fuel=27}
  if(k==="clear"){S.heat=0;S.oilBias=0;S.boostBias=0;S.fuelDrain=false;S.fuel=Math.max(S.fuel,62)}
  demo(S.on?"Simulando: "+SIMTXT[k]+".":"Recebido ("+SIMTXT[k]+"), mas o painel ainda está na tela de abertura: toque nele para ligar.")}
function setAmb(v){if(!isFinite(v))return;S.amb=clamp(v,0,100);applyTheme()}
function setFive(on){posFive();$("#fivedeg").classList.toggle("on",on)}
function posFive(){var f=$("#fivedeg"),dsz=325;var gy=104+235,dy=104+450+6+42,my=(gy+dy)/2;
  f.style.width=dsz+"px";f.style.height=dsz+"px";f.style.left=(640-dsz/2)+"px";f.style.top=(my-dsz/2)+"px"}

/* teclado (útil quando o painel está aberto no próprio PC, ligado a um projetor) */
document.addEventListener("keydown",function(e){var t=e.target;if(t&&t.tagName==="INPUT")return;
  if(e.code==="Space"){e.preventDefault();if(t&&t.blur)t.blur();ackCrit();return}
  var k={"1":"water","2":"oil","3":"boost","4":"fuel","0":"clear"}[e.key];if(k){sim(k);return}
  if(e.key==="p"||e.key==="P"){setCar(S.car==="track"?"parked":"track");return}
  if(e.key==="f"||e.key==="F"){goFull();return}
  if(e.key==="Escape"){if(moveFrom)cancelMove();else closeEditUI()}},true);

/* ---------- sala: liga este painel ao controle remoto ---------- */
var ROOM=ApexRoom.fromPage()||ApexRoom.make();ApexRoom.save(ROOM);
if(!MIRROR&&!/sala=/.test(location.hash)){try{history.replaceState(null,"",location.pathname+location.search+"#sala="+ROOM)}catch(e){}}
var netState="",ctlSeen=0,link=null,stT=null;
function roomInfo(){var el=$("#roomInfo"),txt;
  if(ctlSeen)txt="controle remoto conectado";else if(netState==="online")txt="pronto · abra o controle no PC com este código";
  else if(netState==="offline")txt="sem conexão com o servidor (tentando de novo)";else if(netState==="local")txt="espelho";else txt="conectando…";
  el.className="room"+(netState==="online"?" ok":netState==="offline"?" bad":"");el.innerHTML='<i></i>Sala<b>'+ROOM+'</b>· '+txt}
function sendStatus(pong){if(!link||MIRROR)return;var a=activeAlerts();
  link.send({t:"st",on:S.on,car:S.car,amb:S.amb,five:$("#fivedeg").classList.contains("on"),fs:!!fsEl()||standalone(),
    sims:{water:S.heat>0,oil:S.oilBias>0,boost:S.boostBias>0,fuel:S.fuelDrain},
    layout:Lay.presetOf(lay)||"personalizado",alerts:a.slice(0,5).map(function(x){return{lv:x.lv,t:x.t,d:x.d,ack:!!ack[x.id]}}),msg:lastMsg,pong:pong||null})}
function queueStatus(){if(MIRROR)return;clearTimeout(stT);stT=setTimeout(function(){sendStatus()},500)}
function onMsg(m){if(m.role!=="controle")return;if(!ctlSeen){ctlSeen=Date.now();roomInfo()}
  if(m.t==="ping"){sendStatus(m.p);return}
  if(m.t!=="cmd")return;var a=m.a,v=m.v;
  if(a==="car")setCar(v);else if(a==="sim")sim(v);else if(a==="ack")ackCrit();else if(a==="amb")setAmb(+v);
  else if(a==="five")setFive(!!v);else if(a==="reboot")reboot();
  else if(a==="layout"){if(!Lay.PRESETS[v])return;if(moving())demo("Pedido de layout recusado: o layout só muda com o carro parado.");else{applyPreset(v);demo("Modelo de layout: "+Lay.PRESETS[v].name+".")}}
  queueStatus()}
link=ApexLink({room:ROOM,role:"painel",net:!MIRROR,onMsg:onMsg,onState:function(s){var was=netState;netState=s;roomInfo();if(s==="online"&&was!=="online")queueStatus()}});
/* sinal de vida a cada 8 s: o controle sabe se o celular continua com o painel aberto */
if(!MIRROR)setInterval(function(){if(!document.hidden)sendStatus()},8000);

renderSlots();syncSettings();updGauges();rescale();roomInfo();
if(MIRROR){$("#splash").classList.add("off");S.on=true}
})();
