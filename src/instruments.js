const profiles = {
  rpm:[0,8000,"#ffc62d","bar"], boost:[-.5,2,"#58dc99","dial"],
  pressure:[0,6,"#ffab42","bar"], water:[60,130,"#42c8ff","dial"],
  oil:[60,160,"#ff7558","dial"], fuel:[0,100,"#a0de5b","bar"],
  speed:[0,240,"#e8edf2","dial"], gear:[0,6,"#ffffff","number"],
  lap:[0,0,"#ffffff","number"]
};
export const profile = id => profiles[id];
function mark(lo,hi,f,id){
  const value=lo+(hi-lo)*f;
  return String(Number((id==="rpm"?value/1000:value).toFixed(2))).replace(".",",");
}
function dial(lo,hi,id){
  const ticks=[];
  for(let n=0;n<=40;n++){
    const angle=-130+260*n/40,major=n%8===0;
    ticks.push('<line x1="100" y1="14" x2="100" y2="'+(major?25:19)+'" transform="rotate('+angle+' 100 100)" stroke="'+(major?"#e3e7eb":"#74818a")+'"/>');
    if(major){
      const rad=angle*Math.PI/180;
      ticks.push('<text x="'+(100+62*Math.sin(rad))+'" y="'+(104-62*Math.cos(rad))+'">'+mark(lo,hi,n/40,id)+'</text>');
    }
  }
  return '<svg class="dialFace" viewBox="0 0 200 180" aria-hidden="true"><path d="M 31.06 157.85 A 90 90 0 1 1 168.94 157.85" fill="none" stroke="#303439" stroke-width="6"/><path class="dialArc" d="M 31.06 157.85 A 90 90 0 1 1 168.94 157.85" fill="none" stroke="currentColor" stroke-width="6" pathLength="100"/>'+ticks.join("")+'<g class="needle"><path d="M98 103 L100 28 L103 103 Z" fill="currentColor"/><circle cx="100" cy="100" r="5" fill="#eee"/></g></svg>';
}
export function buildInstrument(el,i,name,unit){
  const [lo,hi,,defaultStyle]=profile(i.id);
  const style=hi===lo?"number":i.style||defaultStyle;
  el.dataset.style=style;
  const scale=Array.from({length:5},(_,n)=>"<i>"+mark(lo,hi,n/4,i.id)+"</i>").join("");
  el.innerHTML='<header><small></small><label></label></header>'+
    (style==="dial"?dial(lo,hi,i.id):"")+'<strong></strong>'+
    (style==="bar"?'<div class="barTrack"><b></b></div><div class="barScale">'+scale+'</div>':"");
  el.querySelector("small").textContent=name;
  el.querySelector("label").textContent=unit+(i.id==="rpm"&&style!=="number"?" · ×1000":"");
  const readout=el.querySelector("strong"),bar=el.querySelector(".barTrack b"),arc=el.querySelector(".dialArc"),needle=el.querySelector(".needle");
  return value=>{
    const text=String(value).replace(".",",");
    if(readout.textContent===text)return;
    readout.textContent=text;
    const f=Math.min(1,Math.max(0,((Number(value)||0)-lo)/(hi-lo||1)));
    if(bar)bar.style.transform="scaleX("+f+")";
    if(arc){arc.setAttribute("stroke-dasharray",100*f+" 100");needle.setAttribute("transform","rotate("+(-130+260*f)+" 100 100)")}
  };
}
