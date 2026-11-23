import { profile, buildInstrument } from "./instruments.js";
export function setupConsole({state, moving, legacy, setView, simulate, drive, toast, lap, mirror}) {
  const q = s => document.querySelector(s);
  const dash = q("#dash"), board = q("#freeBoard"), menu = q("#functions"), tools = q("#layoutTools");
  const sensors = {
    rpm:["Rotação","rpm",()=>Math.round(state.rpm/10)*10],
    boost:["Pressão de turbo","bar",()=>state.boost.toFixed(2)],
    pressure:["Pressão de óleo","bar",()=>Math.min(6,1.1+state.rpm/1650).toFixed(1)],
    oil:["Temperatura do óleo","°C",()=>Math.round(state.oil)],
    water:["Temperatura da água","°C",()=>Math.round(state.water)],
    fuel:["Combustível","%",()=>Math.round(state.fuel)],
    speed:["Velocidade","km/h",()=>Math.round(state.v)],
    gear:["Marcha","",()=>state.gear||"N"],
    lap:["Tempo de volta","",lap]
  };
  const key="apex.console.v1", limit=(v,min,max)=>Math.max(min,Math.min(max,v));
  let renderers=[];
  let saved=null, draft=null, selected=-1, gesture=null;
  try {const data=JSON.parse(localStorage.getItem(key)); if(Array.isArray(data?.items)&&data.items.every(i=>Object.hasOwn(sensors,i.id)&&[i.x,i.y,i.w,i.h].every(Number.isFinite))) saved=data} catch {}
  function item(id,x,y,w,h){return {id,x,y,w,h,color:profile(id)[2],style:profile(id)[3]}}
  function initial(){
    const items=[item("rpm",1,1,98,23),item("gear",1,27,20,43),item("speed",23,27,33,70)];
    const positions={E1:[58,27,20,43],E2:[79,27,20,43],D1:[1,73,20,24],D2:[58,73,41,24]};
    Object.entries(legacy()).forEach(([slot,id])=>{
      if(sensors[id]&&positions[slot]){
        const gauge=item(id,...positions[slot]);
        if(slot.startsWith("D")&&id!=="lap")gauge.style="bar";
        items.push(gauge);
      }
    });    return {items,bg:""};
  }
  function place(el,i){
    Object.assign(el.style,{left:i.x+"%",top:i.y+"%",width:i.w+"%",height:i.h+"%",color:i.color});
  }
  function controls(){
    const i=draft?.items[selected];
    q("#removeGauge").disabled=q("#gaugeColor").disabled=!i;
    q("#gaugeStyle").disabled=!i||i.id==="lap";
    q("#gaugeStyle").value=i?(i.style||profile(i.id)[3]):"bar";
    if(i)q("#gaugeColor").value=i.color;
    [...board.children].forEach((e,n)=>e.classList.toggle("picked",!!draft&&n===selected));
  }
  function draw(){
    const layout=draft||saved;
    dash.classList.toggle("free",!!layout);
    dash.classList.toggle("design",!!draft);
    tools.hidden=!draft; board.replaceChildren();renderers=[];
    board.style.backgroundImage=layout?.bg?'url("'+layout.bg+'")':"none";
    layout?.items.forEach((i,n)=>{
      const el=document.createElement("div");el.className="meter";el.dataset.n=n;place(el,i);
      renderers.push(buildInstrument(el,i,...sensors[i.id]));
      if(draft){el.tabIndex=0;const grip=document.createElement("b");grip.className="grip";grip.textContent="↘";el.append(grip)}
      board.append(el);
    });controls();update();
  }
  function update(){(draft||saved)?.items.forEach((i,n)=>renderers[n](sensors[i.id][2]()))}
  function original(){
    const previous=saved;
    try{localStorage.removeItem(key)}catch{toast("Não foi possível restaurar o painel.");return}
    saved=null;setView("painel");
    toast("Painel original restaurado.",previous?()=>{
      try{localStorage.setItem(key,JSON.stringify(previous));saved=previous;draw()}catch{toast("Não foi possível recuperar o layout.")}
    }:null);
  }
  function leave(){q("#addGauge").open=false;draft=null;gesture=null;selected=-1;menu.hidden=true;delete dash.dataset.section;draw()}
  function open(){if(moving()||!state.on||mirror)return;leave();setView("painel");menu.hidden=false;q("#functions button").focus()}
  function edit(){if(moving()||mirror)return;setView("painel");menu.hidden=true;draft=JSON.parse(JSON.stringify(saved||initial()));selected=-1;draw()}
  const edge=q("#menuEdge");edge.onclick=open;
  edge.onpointerdown=e=>{edge.setPointerCapture(e.pointerId);edge.dataset.start=e.clientX};
  edge.onpointermove=e=>{if(edge.hasPointerCapture(e.pointerId)&&e.clientX-Number(edge.dataset.start)>32){edge.releasePointerCapture(e.pointerId);open()}};
  menu.onclick=e=>{
    const action=e.target.closest("button")?.dataset.action;if(!action)return;
    menu.hidden=true;
    if(action==="layout")edit();
    if(action==="original")original();
    if(["sound","alerts"].includes(action)){setView("ajustes");dash.dataset.section=action}
    if(action==="simulation"){menu.hidden=false;q("#simOptions").hidden=false;q("#functionList").hidden=true}
    if(action==="laps")setView("voltas");
  };
  edge.addEventListener("pointerdown",resetList);edge.addEventListener("click",resetList);
  function resetList(){q("#simOptions").hidden=true;q("#functionList").hidden=false}
  q("#simOptions").onclick=e=>{const k=e.target.closest("button")?.dataset.sim;if(!k)return;if(k==="back"){resetList();return}if(k==="track")drive("track");else simulate(k);menu.hidden=true;resetList();toast(k==="track"?"Em pista":e.target.textContent)};
  const catalog=q("#addGauge");
  function insert(id,x=50,y=50){
    if(!draft)return;
    draft.items.push(item(id,limit(x-14,0,72),limit(y-16,0,68),28,32));
    selected=draft.items.length-1;catalog.open=false;draw();
  }
  Object.entries(sensors).forEach(([id,[name]])=>{
    const option=document.createElement("button");option.textContent=name;
    q("#gaugeOptions").append(option);
    option.onclick=()=>insert(id);
    option.onpointerdown=e=>option.setPointerCapture(e.pointerId);
    option.onpointerup=e=>{
      const r=board.getBoundingClientRect(),target=document.elementFromPoint(e.clientX,e.clientY);
      if(target&&board.contains(target)){
        option.onclick=null;
        insert(id,(e.clientX-r.left)*100/r.width,(e.clientY-r.top)*100/r.height);
        setTimeout(()=>option.onclick=()=>insert(id),0);
      }
    };
  });
  board.onpointerdown=e=>{
    const el=e.target.closest(".meter");if(!draft||!el)return;
    selected=Number(el.dataset.n);controls();el.focus();
    gesture={pid:e.pointerId,startX:e.clientX,startY:e.clientY,resize:e.target.matches(".grip"),base:{...draft.items[selected]}};
    board.setPointerCapture(e.pointerId);
  };
  board.onpointermove=e=>{
    if(!gesture||gesture.pid!==e.pointerId||!draft)return;
    const r=board.getBoundingClientRect(),g=gesture,b=g.base,i=draft.items[selected],dx=(e.clientX-g.startX)*100/r.width,dy=(e.clientY-g.startY)*100/r.height;
    if(g.resize){i.w=limit(b.w+dx,14,100-b.x);i.h=limit(b.h+dy,18,100-b.y)}
    else{i.x=limit(b.x+dx,0,100-b.w);i.y=limit(b.y+dy,0,100-b.h)}
    place(board.children[selected],i);
  };
  board.onlostpointercapture=()=>gesture=null;
  q("#gaugeColor").oninput=e=>{if(draft?.items[selected]){draft.items[selected].color=e.target.value;place(board.children[selected],draft.items[selected])}};
  q("#removeGauge").onclick=()=>{draft.items.splice(selected,1);selected=-1;draw()};
  q("#backFile").onchange=async e=>{
    const file=e.target.files[0],target=draft;e.target.value="";if(!file||!target)return;
    const url=URL.createObjectURL(file);
    try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1280/img.width,720/img.height),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);if(draft===target){draft.bg=canvas.toDataURL("image/jpeg",.8);draw()}}catch{toast("Não foi possível abrir a imagem.")}finally{URL.revokeObjectURL(url)}
  };
  q("#clearBg").onclick=()=>{draft.bg="";draw()};
  q("#cancelLayout").onclick=leave;
  q("#restoreLayout").onclick=original;
  q("#gaugeStyle").onchange=e=>{const i=draft?.items[selected];if(i){i.style=e.target.value;draw()}};
  q("#saveLayout").onclick=()=>{try{localStorage.setItem(key,JSON.stringify(draft));saved=draft;leave();toast("Layout salvo neste aparelho.")}catch{toast("Sem espaço para salvar. Tente remover o fundo.")}};
  draw();return {edit,leave,update};
}
