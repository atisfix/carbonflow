import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ═══ CONFIG ═══ */
const COLS = [
  { id: "backlog", label: "Backlog", color: "#64748B" },
  { id: "todo", label: "To Do", color: "#3B82F6" },
  { id: "inprogress", label: "In Progress", color: "#F59E0B" },
  { id: "review", label: "Review", color: "#A78BFA" },
  { id: "done", label: "Done", color: "#34D399" },
];
const PRI = {
  high: { label: "High", color: "#F43F5E", dot: 10 },
  medium: { label: "Medium", color: "#F59E0B", dot: 8 },
  low: { label: "Low", color: "#34D399", dot: 6 },
};
const TYPES = {
  epic: { label: "Epic", color: "#A78BFA", icon: "◆", nodeSize: 28 },
  story: { label: "Story", color: "#3B82F6", icon: "○", nodeSize: 22 },
  task: { label: "Task", color: "#64748B", icon: "·", nodeSize: 16 },
};
const ROLES = {
  owner: { label: "Product Owner", short: "PO", color: "#A78BFA", perms: ["create","edit","delete","prioritize","comment","move","sprint"] },
  developer: { label: "Developer", short: "DEV", color: "#3B82F6", perms: ["edit","comment","move"] },
};
const SPRINTS = [
  { id: "s1", name: "Sprint 1", sub: "Foundation", start: "Feb 10", end: "Feb 24", active: false },
  { id: "s2", name: "Sprint 2", sub: "Carbon Core", start: "Feb 24", end: "Mar 10", active: true },
  { id: "s3", name: "Sprint 3", sub: "Reporting", start: "Mar 10", end: "Mar 24", active: false },
];
const LOG_T = {
  created: { icon: "+", color: "#34D399" }, moved: { icon: "→", color: "#3B82F6" },
  edited: { icon: "✎", color: "#F59E0B" }, commented: { icon: "◻", color: "#A78BFA" },
  deleted: { icon: "✕", color: "#F43F5E" }, prioritized: { icon: "▲", color: "#F43F5E" },
  sprint: { icon: "⏱", color: "#3B82F6" }, deadline: { icon: "◷", color: "#F59E0B" },
  reordered: { icon: "↕", color: "#64748B" }, completed: { icon: "✓", color: "#34D399" },
};
const ts = () => { const d=new Date(); return `${d.getHours()%12||12}:${String(d.getMinutes()).padStart(2,"0")} ${d.getHours()>=12?"PM":"AM"}`; };
const dlStatus = (dl) => {
  if (!dl) return null;
  const t=new Date(); t.setHours(0,0,0,0);
  const dd=new Date(dl+"T00:00:00");
  const diff=Math.ceil((dd-t)/(864e5));
  if (diff<0) return { text:`${Math.abs(diff)}d overdue`, color:"#F43F5E", urgent:true };
  if (diff===0) return { text:"Today", color:"#F43F5E", urgent:true };
  if (diff<=3) return { text:`${diff}d`, color:"#F59E0B", urgent:true };
  if (diff<=7) return { text:`${diff}d`, color:"#F59E0B", urgent:false };
  return { text:`${diff}d`, color:"#64748B", urgent:false };
};
const fmtDl = (d) => { if(!d) return ""; return new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}); };

const INIT_ITEMS = [
  { id:"e1", title:"Carbon Dashboard", type:"epic", priority:"high", column:"inprogress", desc:"Main carbon tracking dashboard with real-time Scope 1,2,3 emissions.", parentId:null, assignee:"owner", sprintId:"s2", tags:["core","mvp"], comments:[{author:"owner",text:"Core feature for MVP — must ship Sprint 2",time:"2h ago"}], created:"Feb 3", deadline:"2026-03-10", order:0 },
  { id:"s1i", title:"Emissions Chart", type:"story", priority:"high", column:"inprogress", desc:"Interactive chart showing emissions breakdown over time with drill-down.", parentId:"e1", assignee:"developer", sprintId:"s2", tags:["frontend"], comments:[{author:"developer",text:"Using recharts, spike done",time:"1h ago"}], created:"Feb 5", deadline:"2026-03-05", order:0 },
  { id:"t1", title:"Chart API integration", type:"task", priority:"medium", column:"todo", desc:"Connect chart to /api/emissions. Handle pagination and caching.", parentId:"s1i", assignee:"developer", sprintId:"s2", tags:["api"], comments:[], created:"Feb 7", deadline:"2026-02-28", order:0 },
  { id:"t2", title:"Chart animations", type:"task", priority:"low", column:"backlog", desc:"Enter/exit transitions, hover tooltips, smooth axis updates.", parentId:"s1i", assignee:null, sprintId:null, tags:["polish"], comments:[], created:"Feb 7", deadline:null, order:0 },
  { id:"s2i", title:"KPI Summary Cards", type:"story", priority:"medium", column:"todo", desc:"Cards: Total CO₂e, YoY reduction %, target progress, offset balance.", parentId:"e1", assignee:null, sprintId:"s2", tags:["frontend"], comments:[], created:"Feb 5", deadline:"2026-03-08", order:0 },
  { id:"t5", title:"KPI data service", type:"task", priority:"medium", column:"todo", desc:"Backend service to aggregate KPI metrics from multiple sources.", parentId:"s2i", assignee:"developer", sprintId:"s2", tags:["backend"], comments:[], created:"Feb 8", deadline:"2026-02-26", order:1 },
  { id:"e2", title:"User Management", type:"epic", priority:"medium", column:"backlog", desc:"Authentication, RBAC, team invitations, and SSO integration.", parentId:null, assignee:"owner", sprintId:null, tags:["infra"], comments:[], created:"Feb 3", deadline:"2026-04-01", order:0 },
  { id:"s3i", title:"Login & Auth", type:"story", priority:"high", column:"review", desc:"OAuth2 + SAML SSO login. JWT management with refresh rotation.", parentId:"e2", assignee:"developer", sprintId:"s2", tags:["auth","security"], comments:[{author:"developer",text:"PR #42 ready — all tests pass",time:"30m ago"},{author:"owner",text:"Will review today",time:"15m ago"}], created:"Feb 4", deadline:"2026-02-28", order:0 },
  { id:"t3", title:"JWT token handling", type:"task", priority:"high", column:"done", desc:"Secure token storage, auto refresh, logout cleanup.", parentId:"s3i", assignee:"developer", sprintId:"s2", tags:["security"], comments:[{author:"developer",text:"Done and tested",time:"3h ago"}], created:"Feb 6", deadline:"2026-02-20", order:0 },
  { id:"s4i", title:"Role permissions", type:"story", priority:"low", column:"backlog", desc:"RBAC: Admin, Editor, Viewer roles with granular permissions.", parentId:"e2", assignee:null, sprintId:"s3", tags:["auth"], comments:[], created:"Feb 5", deadline:null, order:0 },
  { id:"e3", title:"ESG Reporting", type:"epic", priority:"high", column:"backlog", desc:"Automated ESG/CSRD compliance reporting with multi-framework support.", parentId:null, assignee:"owner", sprintId:"s3", tags:["compliance","core"], comments:[{author:"owner",text:"Critical for EU clients — CSRD deadline",time:"1d ago"}], created:"Feb 3", deadline:"2026-03-24", order:1 },
  { id:"s5i", title:"Report Generator", type:"story", priority:"medium", column:"todo", desc:"Branded PDF reports from emissions data. CSRD, CDP, GRI templates.", parentId:"e3", assignee:null, sprintId:"s3", tags:["reporting"], comments:[], created:"Feb 5", deadline:"2026-03-20", order:2 },
  { id:"s6i", title:"Framework Mapping", type:"story", priority:"low", column:"backlog", desc:"Map internal data to GRI, CDP, TCFD, ISSB fields automatically.", parentId:"e3", assignee:null, sprintId:"s3", tags:["compliance"], comments:[], created:"Feb 5", deadline:null, order:1 },
  { id:"t4", title:"PDF template engine", type:"task", priority:"medium", column:"backlog", desc:"Reusable PDF layout with branding, charts, data tables.", parentId:"s5i", assignee:null, sprintId:"s3", tags:["reporting"], comments:[], created:"Feb 8", deadline:null, order:2 },
  { id:"e4", title:"Supply Chain Tracking", type:"epic", priority:"low", column:"backlog", desc:"Scope 3 supplier emissions tracking and supply chain mapping.", parentId:null, assignee:null, sprintId:null, tags:["scope3"], comments:[], created:"Feb 10", deadline:null, order:3 },
  { id:"s7i", title:"Supplier Portal", type:"story", priority:"low", column:"backlog", desc:"Self-service portal for suppliers to submit emissions data.", parentId:"e4", assignee:null, sprintId:null, tags:["scope3","portal"], comments:[], created:"Feb 10", deadline:null, order:0 },
];

const INIT_LOGS = [
  { id:"l1",type:"created",item:"Carbon Dashboard",detail:"Epic created",role:"owner",time:"Feb 3, 9:00 AM" },
  { id:"l2",type:"moved",item:"Carbon Dashboard",detail:"Backlog → In Progress",role:"owner",time:"Feb 5, 10:00 AM" },
  { id:"l3",type:"completed",item:"JWT token handling",detail:"Moved to Done",role:"developer",time:"Feb 14, 11:30 AM" },
  { id:"l4",type:"commented",item:"Login & Auth",detail:"PR #42 ready for review",role:"developer",time:"Feb 14, 1:30 PM" },
];

/* ═══ PARTICLES BG ═══ */
function Particles() {
  const ref=useRef(null);
  useEffect(()=>{
    const c=ref.current; if(!c) return; const ctx=c.getContext("2d"); let aid;
    const ps=[]; const resize=()=>{c.width=window.innerWidth;c.height=window.innerHeight;};
    resize(); window.addEventListener("resize",resize);
    for(let i=0;i<30;i++) ps.push({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*0.2,vy:(Math.random()-0.5)*0.2,r:Math.random()*1.5+0.4,a:Math.random()*0.08+0.02});
    const draw=()=>{ctx.clearRect(0,0,c.width,c.height);ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=c.width;if(p.x>c.width)p.x=0;if(p.y<0)p.y=c.height;if(p.y>c.height)p.y=0;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(52,211,153,${p.a})`;ctx.fill();});for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const d=Math.hypot(ps[i].x-ps[j].x,ps[i].y-ps[j].y);if(d<120){ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.strokeStyle=`rgba(52,211,153,${0.025*(1-d/120)})`;ctx.lineWidth=0.5;ctx.stroke();}}aid=requestAnimationFrame(draw);};
    draw(); return ()=>{cancelAnimationFrame(aid);window.removeEventListener("resize",resize);};
  },[]); return <canvas ref={ref} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}} />;
}

/* ═══ PROGRESS BAR (mini) ═══ */
function MiniProgress({pct,w=48,h=4,color="#34D399"}){
  return <div style={{width:w,height:h,borderRadius:h,background:"#1E293B",overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:h,background:color,transition:"width 0.4s ease"}} /></div>;
}

/* ═══ CARD (readable, with node dot) ═══ */
function Card({item,items,isSelected,onClick,onDragStart,isDragging,onReorder,showConnDot}){
  const typ=TYPES[item.type]; const pri=PRI[item.priority]; const dl=dlStatus(item.deadline);
  const children=items.filter(i=>i.parentId===item.id);
  const childDone=children.filter(c=>c.column==="done").length;
  const pct=children.length>0?Math.round((childDone/children.length)*100):item.column==="done"?100:0;
  const assignee=item.assignee?ROLES[item.assignee]:null;
  const sprint=SPRINTS.find(s=>s.id===item.sprintId);

  return (
    <div draggable onDragStart={e=>onDragStart(e,item.id)} onClick={e=>{e.stopPropagation();onClick(item.id);}}
      style={{
        position:"relative", background:isSelected?"#1E293B":"#141926",
        border:`1px solid ${isSelected?typ.color+"66":"#1E293B"}`,
        borderRadius:10, padding:"12px 14px 12px 26px", cursor:"grab",
        transition:"all 0.2s ease", opacity:isDragging?0.3:1,
        boxShadow:isSelected?`0 0 0 1px ${typ.color}33, 0 8px 24px rgba(0,0,0,0.3)`:"0 1px 3px rgba(0,0,0,0.2)",
        transform:isSelected?"scale(1.02)":"scale(1)",
        marginBottom:6,
      }}
    >
      {/* ── Node dot (connection anchor) ── */}
      {showConnDot && (
        <div className="node-dot" style={{
          position:"absolute", left:-5, top:"50%", transform:"translateY(-50%)",
          width:10, height:10, borderRadius:"50%",
          background:typ.color, border:"2px solid #0B0F19",
          boxShadow:`0 0 8px ${typ.color}44`,
          zIndex:5,
        }} />
      )}

      {/* ── Left accent stripe ── */}
      <div style={{ position:"absolute", left:0, top:8, bottom:8, width:3, borderRadius:2, background:typ.color, opacity:0.6 }} />

      {/* ── Top row: type badge + priority + deadline ── */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
        <span style={{ fontSize:10, fontWeight:700, color:typ.color, opacity:0.8 }}>{typ.icon}</span>
        <span style={{ fontSize:9, color:"#94A3B8", fontWeight:600, flex:1 }}>{typ.label}</span>
        {/* Priority dot */}
        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
          <div style={{ width:pri.dot, height:pri.dot, borderRadius:"50%", background:pri.color, boxShadow:`0 0 4px ${pri.color}44` }} />
          <span style={{ fontSize:9, color:pri.color, fontWeight:700 }}>{pri.label}</span>
        </div>
      </div>

      {/* ── Title ── */}
      <h4 style={{ margin:"0 0 6px", fontSize:13, fontWeight:700, color:"#E2E8F0", lineHeight:1.35, letterSpacing:"-0.2px" }}>{item.title}</h4>

      {/* ── Bottom row: assignee, progress, deadline, sprint ── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        {/* Assignee */}
        {assignee ? (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:`${assignee.color}22`, border:`1.5px solid ${assignee.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:assignee.color, fontWeight:800 }}>{assignee.short[0]}</div>
            <span style={{ fontSize:9, color:"#64748B", fontWeight:600 }}>{assignee.short}</span>
          </div>
        ) : (
          <span style={{ fontSize:9, color:"#334155" }}>Unassigned</span>
        )}

        {/* Progress (if has children) */}
        {children.length>0 && (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <MiniProgress pct={pct} color={pct===100?"#34D399":typ.color} />
            <span style={{ fontSize:9, color:pct===100?"#34D399":"#64748B", fontWeight:700 }}>{pct}%</span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* Deadline */}
        {item.deadline && (
          <div style={{ display:"flex", alignItems:"center", gap:3 }}>
            {dl?.urgent && <div style={{ width:5, height:5, borderRadius:"50%", background:dl.color, animation:"pulse 1.5s infinite" }} />}
            <span style={{ fontSize:9, color:dl?.color||"#475569", fontWeight:dl?.urgent?700:500 }}>{fmtDl(item.deadline)}</span>
            {dl && <span style={{ fontSize:8, color:dl.color, fontWeight:600, opacity:0.7 }}>({dl.text})</span>}
          </div>
        )}

        {/* Sprint badge */}
        {sprint && (
          <span style={{ fontSize:8, padding:"2px 6px", borderRadius:4, background:sprint.active?"#34D39912":"#1E293B", color:sprint.active?"#34D399":"#475569", fontWeight:600, border:`1px solid ${sprint.active?"#34D39922":"#1E293B"}` }}>S{sprint.id.slice(1)}</span>
        )}

        {/* Comment count */}
        {item.comments.length>0 && (
          <span style={{ fontSize:9, color:"#475569" }}>💬{item.comments.length}</span>
        )}
      </div>

      {/* Reorder buttons */}
      <div style={{ position:"absolute", right:6, top:6, display:"flex", flexDirection:"column", gap:1, opacity:0 }}
        className="reorder-btns">
        <button onClick={e=>{e.stopPropagation();onReorder(item.id,-1);}} style={{ width:16, height:14, background:"#1E293Bcc", border:"1px solid #334155", borderRadius:3, color:"#94A3B8", fontSize:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>▲</button>
        <button onClick={e=>{e.stopPropagation();onReorder(item.id,1);}} style={{ width:16, height:14, background:"#1E293Bcc", border:"1px solid #334155", borderRadius:3, color:"#94A3B8", fontSize:7, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>▼</button>
      </div>
    </div>
  );
}

/* ═══ CONNECTION LINES (board view) ═══ */
function Connections({items,cardRefs}){
  const [lines,setLines]=useState([]);
  const calc=useCallback(()=>{
    const out=[]; const board=document.querySelector("[data-board]");
    if(!board) return; const br=board.getBoundingClientRect();
    items.forEach(item=>{
      if(!item.parentId) return;
      const cEl=cardRefs.current[item.id]; const pEl=cardRefs.current[item.parentId];
      if(!cEl||!pEl) return;
      // Find the node dots
      const cDot=cEl.querySelector(".node-dot"); const pDot=pEl.querySelector(".node-dot");
      if(!cDot||!pDot) return;
      const c=cDot.getBoundingClientRect(); const p=pDot.getBoundingClientRect();
      out.push({
        id:`${item.parentId}-${item.id}`,
        x1:p.left+p.width/2-br.left, y1:p.top+p.height/2-br.top,
        x2:c.left+c.width/2-br.left, y2:c.top+c.height/2-br.top,
        pType:items.find(i=>i.id===item.parentId)?.type||"epic",
        same:item.column===items.find(i=>i.id===item.parentId)?.column,
        done:item.column==="done",
      });
    });
    setLines(out);
  },[items,cardRefs]);
  useEffect(()=>{const t=setTimeout(calc,100);const iv=setInterval(calc,500);return()=>{clearTimeout(t);clearInterval(iv);};},[calc]);

  return (
    <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}>
      <defs><filter id="lg"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {lines.map(l=>{
        const c=TYPES[l.pType]?.color||"#64748B";
        const mx=(l.x1+l.x2)/2;
        return <path key={l.id}
          d={l.same?`M${l.x1} ${l.y1} C${l.x1-40} ${(l.y1+l.y2)/2}, ${l.x2-40} ${(l.y1+l.y2)/2}, ${l.x2} ${l.y2}`:`M${l.x1} ${l.y1} C${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`}
          fill="none" stroke={l.done?`#34D39930`:`${c}30`} strokeWidth={1.2}
          strokeDasharray={l.same?"none":"5 4"} filter="url(#lg)"
        />;
      })}
    </svg>
  );
}

/* ═══ NODE MAP VIEW ═══ */
function NodeMap({items,onSelect,selectedId}){
  const containerRef=useRef(null);
  const [positions,setPositions]=useState({});
  const [dragging,setDragging]=useState(null);
  const [offset,setOffset]=useState({x:0,y:0});

  // Layout: group by column, arrange vertically
  useEffect(()=>{
    const pos={};
    COLS.forEach((col,ci)=>{
      const colItems=items.filter(i=>i.column===col.id);
      colItems.forEach((item,ri)=>{
        const typ=TYPES[item.type];
        pos[item.id]={
          x: 100 + ci * 200 + (item.type==="task"?20:item.type==="story"?10:0),
          y: 80 + ri * 80,
          ...positions[item.id], // Preserve user-dragged positions
        };
      });
    });
    setPositions(prev=>{
      const merged={};
      Object.keys(pos).forEach(k=>{ merged[k]=prev[k]||pos[k]; });
      return merged;
    });
  },[items]);

  const handleMouseDown=(e,id)=>{
    const p=positions[id]; if(!p) return;
    setDragging(id);
    const rect=containerRef.current.getBoundingClientRect();
    setOffset({x:e.clientX-rect.left-p.x, y:e.clientY-rect.top-p.y});
  };
  const handleMouseMove=(e)=>{
    if(!dragging) return;
    const rect=containerRef.current.getBoundingClientRect();
    setPositions(prev=>({...prev,[dragging]:{x:e.clientX-rect.left-offset.x,y:e.clientY-rect.top-offset.y}}));
  };
  const handleMouseUp=()=>setDragging(null);

  // Draw connections
  const lines=[];
  items.forEach(item=>{
    if(!item.parentId||!positions[item.id]||!positions[item.parentId]) return;
    const c=positions[item.id]; const p=positions[item.parentId];
    lines.push({id:`${item.parentId}-${item.id}`,x1:p.x,y1:p.y,x2:c.x,y2:c.y,pType:items.find(i=>i.id===item.parentId)?.type||"epic",done:item.column==="done"});
  });

  return (
    <div ref={containerRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      style={{ width:"100%", height:"100%", position:"relative", overflow:"auto", cursor:dragging?"grabbing":"default" }}>

      {/* Column labels */}
      {COLS.map((col,i)=>(
        <div key={col.id} style={{
          position:"absolute", top:16, left:100+i*200-40, width:120, textAlign:"center",
          fontSize:10, fontWeight:800, color:col.color, textTransform:"uppercase", letterSpacing:2, opacity:0.4,
        }}>{col.label}</div>
      ))}

      {/* Connection lines */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
        <defs><filter id="ng"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {lines.map(l=>{
          const c=TYPES[l.pType]?.color||"#64748B";
          const mx=(l.x1+l.x2)/2;
          return <path key={l.id}
            d={`M${l.x1} ${l.y1} C${mx} ${l.y1}, ${mx} ${l.y2}, ${l.x2} ${l.y2}`}
            fill="none" stroke={l.done?`#34D39950`:`${c}50`} strokeWidth={1.5} filter="url(#ng)"
          />;
        })}
      </svg>

      {/* Nodes */}
      {items.map(item=>{
        const p=positions[item.id]; if(!p) return null;
        const typ=TYPES[item.type]; const pri=PRI[item.priority];
        const col=COLS.find(c=>c.id===item.column);
        const isSel=selectedId===item.id;
        const children=items.filter(i=>i.parentId===item.id);
        const childDone=children.filter(c=>c.column==="done").length;
        const pct=children.length>0?Math.round((childDone/children.length)*100):0;

        return (
          <div key={item.id}
            onMouseDown={e=>{e.stopPropagation();handleMouseDown(e,item.id);}}
            onClick={e=>{e.stopPropagation();onSelect(item.id);}}
            style={{
              position:"absolute", left:p.x-typ.nodeSize, top:p.y-typ.nodeSize,
              display:"flex", alignItems:"center", gap:10, cursor:"grab", zIndex:isSel?10:1,
            }}
          >
            {/* The node circle */}
            <div style={{
              width:typ.nodeSize*2, height:typ.nodeSize*2, borderRadius:"50%", flexShrink:0,
              background:`radial-gradient(circle at 35% 35%, ${typ.color}44, ${typ.color}11)`,
              border:`${item.type==="epic"?3:item.type==="story"?2:1.5}px solid ${isSel?"#fff":typ.color}`,
              boxShadow:isSel?`0 0 0 3px ${typ.color}55, 0 0 20px ${typ.color}33`:`0 0 12px ${typ.color}22`,
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.2s",
            }}>
              {/* Priority pip */}
              <div style={{position:"absolute",top:-2,right:-2,width:10,height:10,borderRadius:"50%",background:pri.color,border:"2px solid #0B0F19",zIndex:2}} />
              <span style={{fontSize:typ.nodeSize*0.5,color:typ.color,fontWeight:800}}>{typ.icon}</span>
            </div>

            {/* Label card (appears next to node) */}
            <div style={{
              background:"#141926ee", border:`1px solid ${isSel?typ.color+"44":"#1E293B"}`,
              borderRadius:8, padding:"8px 12px", minWidth:140, maxWidth:200,
              backdropFilter:"blur(8px)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)",
            }}>
              <div style={{fontSize:11,fontWeight:700,color:"#E2E8F0",lineHeight:1.3,marginBottom:3}}>{item.title}</div>
              <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                <span style={{fontSize:8,color:col?.color,fontWeight:600}}>{col?.label}</span>
                <span style={{fontSize:8,color:pri.color,fontWeight:600}}>{pri.label}</span>
                {children.length>0 && <span style={{fontSize:8,color:"#64748B"}}>{pct}%</span>}
                {item.deadline && <span style={{fontSize:8,color:dlStatus(item.deadline)?.color||"#475569"}}>{fmtDl(item.deadline)}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ LIST VIEW ═══ */
function ListView({items,onSelect,selectedId,onReorder}){
  const sorted=[...items].sort((a,b)=>{const t={epic:0,story:1,task:2};const p={high:0,medium:1,low:2};return t[a.type]-t[b.type]||p[a.priority]-p[b.priority]||(a.order||0)-(b.order||0);});
  return (
    <div style={{padding:"4px 0"}}>
      <div style={{display:"grid",gridTemplateColumns:"28px 1fr 64px 64px 72px 72px 56px 40px",padding:"8px 18px",gap:6,alignItems:"center",borderBottom:"1px solid #1E293B"}}>
        {["","Title","Type","Priority","Status","Deadline","Sprint",""].map((h,i)=><span key={i} style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:800}}>{h}</span>)}
      </div>
      {sorted.map(item=>{
        const typ=TYPES[item.type];const pri=PRI[item.priority];const col=COLS.find(c=>c.id===item.column);
        const sp=SPRINTS.find(s=>s.id===item.sprintId);const dl=dlStatus(item.deadline);
        const parent=item.parentId?items.find(i=>i.id===item.parentId):null;const isSel=selectedId===item.id;
        return (
          <div key={item.id} onClick={()=>onSelect(item.id)} style={{
            display:"grid",gridTemplateColumns:"28px 1fr 64px 64px 72px 72px 56px 40px",
            padding:"9px 18px",gap:6,alignItems:"center",cursor:"pointer",
            background:isSel?"#1E293B44":"transparent",borderLeft:isSel?`3px solid ${typ.color}`:"3px solid transparent",
            borderBottom:"1px solid #0F1219",transition:"background 0.15s",
          }}>
            <div style={{width:22,height:22,borderRadius:"50%",background:`${typ.color}15`,border:`1.5px solid ${typ.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:typ.color}}>{typ.icon}</div>
            <div><div style={{fontSize:12,fontWeight:600,color:"#D1D5DB"}}>{item.title}</div>{parent&&<div style={{fontSize:9,color:"#475569",marginTop:1}}>↳ {parent.title}</div>}</div>
            <span style={{fontSize:9,color:typ.color,fontWeight:600}}>{typ.label}</span>
            <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:6,height:6,borderRadius:"50%",background:pri.color}}/><span style={{fontSize:9,color:pri.color,fontWeight:600}}>{pri.label}</span></div>
            <span style={{fontSize:9,color:col.color,fontWeight:600}}>{col.label}</span>
            <span style={{fontSize:9,color:dl?.color||"#334155",fontWeight:dl?.urgent?700:500}}>{item.deadline?fmtDl(item.deadline):"—"}</span>
            <span style={{fontSize:8,color:sp?.active?"#34D399":"#475569"}}>{sp?`S${sp.id.slice(1)}`:"—"}</span>
            <div style={{display:"flex",gap:1}}>
              <button onClick={e=>{e.stopPropagation();onReorder(item.id,-1);}} style={{width:16,height:14,background:"#0F1219",border:"1px solid #1E293B",borderRadius:2,color:"#475569",fontSize:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▲</button>
              <button onClick={e=>{e.stopPropagation();onReorder(item.id,1);}} style={{width:16,height:14,background:"#0F1219",border:"1px solid #1E293B",borderRadius:2,color:"#475569",fontSize:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>▼</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══ SPRINT PANEL ═══ */
function SprintPanel({items,onClose,onAssignSprint,role}){
  const can=ROLES[role].perms.includes("sprint");
  return (
    <div style={{width:290,height:"100%",background:"#0B0F19",borderRight:"1px solid #1E293B",padding:"16px 0",overflowY:"auto",fontFamily:"'Overpass Mono',monospace",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"0 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #1E293B"}}>
        <h3 style={{margin:0,fontSize:13,fontWeight:800,color:"#E2E8F0"}}>Sprints</h3>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:16,cursor:"pointer"}}>✕</button>
      </div>
      {SPRINTS.map(sp=>{
        const si=items.filter(i=>i.sprintId===sp.id);const done=si.filter(i=>i.column==="done").length;
        const pct=si.length?Math.round((done/si.length)*100):0;
        return (
          <div key={sp.id} style={{margin:"8px 12px",padding:12,borderRadius:10,background:sp.active?"#34D39908":"#0F1219",border:`1px solid ${sp.active?"#34D39922":"#1E293B"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {sp.active&&<div style={{width:6,height:6,borderRadius:"50%",background:"#34D399",boxShadow:"0 0 6px #34D39955",animation:"pulse 2s infinite"}}/>}
                <span style={{fontSize:11,fontWeight:700,color:sp.active?"#34D399":"#94A3B8"}}>{sp.name}</span>
              </div>
              <span style={{fontSize:9,color:sp.active?"#34D399":"#475569",fontWeight:700}}>{pct}%</span>
            </div>
            <div style={{fontSize:9,color:"#475569",marginBottom:6}}>{sp.start} — {sp.end} · {sp.sub}</div>
            <MiniProgress pct={pct} w={999} color={sp.active?"#34D399":"#64748B"} />
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:2}}>
              {si.map(item=>{const typ=TYPES[item.type];const col=COLS.find(c=>c.id===item.column);return(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",background:"#0B0F19aa",borderRadius:5}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:typ.color}} />
                  <span style={{flex:1,fontSize:9,color:"#CBD5E1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</span>
                  <div style={{width:4,height:4,borderRadius:"50%",background:col.color}} />
                </div>
              );})}
              {si.length===0&&<div style={{padding:8,textAlign:"center",fontSize:9,color:"#334155",border:"1px dashed #1E293B",borderRadius:5}}>Empty</div>}
            </div>
          </div>
        );
      })}
      <div style={{margin:"8px 12px",padding:12,borderRadius:10,background:"#0F1219",border:"1px solid #1E293B"}}>
        <span style={{fontSize:10,fontWeight:700,color:"#475569",marginBottom:6,display:"block"}}>Unassigned</span>
        {items.filter(i=>!i.sprintId).map(item=>{const typ=TYPES[item.type];return(
          <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",marginBottom:2}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:typ.color}} />
            <span style={{flex:1,fontSize:9,color:"#64748B",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</span>
            {can&&<select onClick={e=>e.stopPropagation()} onChange={e=>{if(e.target.value)onAssignSprint(item.id,e.target.value);}} value="" style={{background:"#0F1219",border:"1px solid #1E293B",borderRadius:3,color:"#475569",fontSize:8,padding:"1px 3px",fontFamily:"'Overpass Mono',monospace",cursor:"pointer"}}><option value="">+</option>{SPRINTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>}
          </div>
        );})}
      </div>
    </div>
  );
}

/* ═══ ACTIVITY LOG ═══ */
function LogPanel({logs,onClose}){
  const [filter,setFilter]=useState("all");
  const f=filter==="all"?logs:logs.filter(l=>l.type===filter);
  return (
    <div style={{width:340,height:"100%",background:"#0B0F19",borderLeft:"1px solid #1E293B",fontFamily:"'Overpass Mono',monospace",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:"1px solid #1E293B",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h3 style={{margin:0,fontSize:13,fontWeight:800,color:"#E2E8F0"}}>Activity Log</h3><span style={{fontSize:9,color:"#475569"}}>{logs.length} events</span></div>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:16,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{padding:"8px 16px",display:"flex",gap:4,flexWrap:"wrap",borderBottom:"1px solid #0F1219"}}>
        <button onClick={()=>setFilter("all")} style={{padding:"3px 8px",borderRadius:4,fontSize:8,fontWeight:700,cursor:"pointer",background:filter==="all"?"#34D39915":"transparent",border:`1px solid ${filter==="all"?"#34D39933":"#1E293B"}`,color:filter==="all"?"#34D399":"#475569",fontFamily:"'Overpass Mono',monospace"}}>All</button>
        {Object.entries(LOG_T).map(([k,v])=><button key={k} onClick={()=>setFilter(k)} style={{padding:"3px 8px",borderRadius:4,fontSize:8,fontWeight:700,cursor:"pointer",background:filter===k?`${v.color}15`:"transparent",border:`1px solid ${filter===k?`${v.color}33`:"#1E293B"}`,color:filter===k?v.color:"#334155",fontFamily:"'Overpass Mono',monospace"}}>{v.icon}</button>)}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"6px 14px"}}>
        {f.slice().reverse().map((l,i)=>{const lt=LOG_T[l.type]||LOG_T.edited;const role=ROLES[l.role];return(
          <div key={l.id||i} style={{display:"flex",gap:10,padding:"10px 4px",borderBottom:"1px solid #0B0F19"}}>
            <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:`${lt.color}12`,border:`1px solid ${lt.color}28`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:lt.color,fontWeight:700}}>{lt.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:2}}>
                <span style={{fontSize:10.5,fontWeight:700,color:"#CBD5E1"}}>{l.item}</span>
                <span style={{fontSize:8,color:"#334155",flexShrink:0,marginLeft:6}}>{l.time}</span>
              </div>
              <div style={{fontSize:9.5,color:"#64748B",lineHeight:1.4}}>{l.detail}</div>
              <div style={{fontSize:8,color:role?.color||"#475569",marginTop:1,fontWeight:600}}>{role?.label||l.role}</div>
            </div>
          </div>
        );})}
        {f.length===0&&<p style={{textAlign:"center",color:"#334155",fontSize:10,padding:20}}>No events</p>}
      </div>
    </div>
  );
}

/* ═══ DETAIL PANEL ═══ */
function Detail({item,items,onClose,onUpdate,onAddComment,onDelete,role}){
  const [comment,setComment]=useState("");const [editing,setEditing]=useState(false);
  const [eTitle,setETitle]=useState(item.title);const [eDesc,setEDesc]=useState(item.desc);const [eDl,setEDl]=useState(item.deadline||"");
  const typ=TYPES[item.type];const pri=PRI[item.priority];const dl=dlStatus(item.deadline);
  const parent=item.parentId?items.find(i=>i.id===item.parentId):null;
  const children=items.filter(i=>i.parentId===item.id);const perms=ROLES[role].perms;
  const sprint=SPRINTS.find(s=>s.id===item.sprintId);

  return (
    <div style={{position:"fixed",top:0,right:0,width:400,height:"100vh",background:"#0B0F19",borderLeft:`1px solid ${typ.color}22`,zIndex:100,display:"flex",flexDirection:"column",fontFamily:"'Overpass Mono',monospace",boxShadow:"-16px 0 60px rgba(0,0,0,0.5)"}}>
      <div style={{padding:"18px 20px 14px",borderBottom:`1px solid #1E293B`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${typ.color}12`,color:typ.color,fontWeight:700}}>{typ.icon} {typ.label}</span>
            <span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:`${pri.color}12`,color:pri.color,fontWeight:700}}>{pri.label}</span>
            {sprint&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:6,background:sprint.active?"#34D39912":"#1E293B",color:sprint.active?"#34D399":"#475569",fontWeight:600}}>{sprint.name}</span>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#475569",fontSize:18,cursor:"pointer",lineHeight:1}}>✕</button>
        </div>
        {dl&&<div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:6,background:`${dl.color}0a`,border:`1px solid ${dl.color}18`,marginBottom:8}}><span style={{fontSize:10,color:dl.color,fontWeight:700}}>📅 {fmtDl(item.deadline)}</span><span style={{fontSize:9,color:dl.color,opacity:0.7}}>· {dl.text}</span></div>}
        {item.tags?.length>0&&<div style={{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}}>{item.tags.map(t=><span key={t} style={{fontSize:8,padding:"2px 6px",borderRadius:4,background:"#F59E0B0a",color:"#F59E0B",border:"1px solid #F59E0B15"}}>{t}</span>)}</div>}
        {editing&&perms.includes("edit")?(
          <div>
            <input value={eTitle} onChange={e=>setETitle(e.target.value)} style={{width:"100%",background:"#0F1219",border:`1px solid ${typ.color}33`,borderRadius:8,padding:"10px 12px",color:"#E2E8F0",fontSize:15,fontWeight:700,fontFamily:"'Overpass Mono',monospace",marginBottom:8,boxSizing:"border-box",outline:"none"}} />
            <textarea value={eDesc} onChange={e=>setEDesc(e.target.value)} rows={3} style={{width:"100%",background:"#0F1219",border:`1px solid ${typ.color}33`,borderRadius:8,padding:"10px 12px",color:"#94A3B8",fontSize:11,fontFamily:"'Overpass Mono',monospace",resize:"vertical",boxSizing:"border-box",outline:"none",marginBottom:8}} />
            <label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700}}>DEADLINE</label>
            <input type="date" value={eDl} onChange={e=>setEDl(e.target.value)} style={{background:"#0F1219",border:`1px solid ${typ.color}33`,borderRadius:6,padding:"6px 10px",color:"#E2E8F0",fontSize:11,fontFamily:"'Overpass Mono',monospace",outline:"none",colorScheme:"dark",marginBottom:10}} />
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{onUpdate(item.id,{title:eTitle,desc:eDesc,deadline:eDl||null});setEditing(false);}} style={{background:typ.color,border:"none",color:"#fff",padding:"8px 18px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",fontWeight:700}}>Save</button>
              <button onClick={()=>{setEditing(false);setETitle(item.title);setEDesc(item.desc);setEDl(item.deadline||"");}} style={{background:"#0F1219",border:"1px solid #334155",color:"#94A3B8",padding:"8px 18px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"'Overpass Mono',monospace"}}>Cancel</button>
            </div>
          </div>
        ):(
          <div onDoubleClick={()=>{if(perms.includes("edit")){setEditing(true);setETitle(item.title);setEDesc(item.desc);setEDl(item.deadline||"");}}}>
            <h2 style={{color:"#E2E8F0",fontSize:17,fontWeight:800,margin:"0 0 6px",lineHeight:1.3}}>{item.title}</h2>
            <p style={{color:"#64748B",fontSize:12,margin:0,lineHeight:1.6}}>{item.desc}</p>
            {perms.includes("edit")&&<span style={{color:"#1E293B",fontSize:9,marginTop:4,display:"block"}}>Double-click to edit</span>}
          </div>
        )}
      </div>
      <div style={{padding:"10px 20px",borderBottom:"1px solid #141926",display:"flex",flexDirection:"column",gap:7,fontSize:11}}>
        <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#475569"}}>Status</span>
          {perms.includes("move")?<select value={item.column} onChange={e=>onUpdate(item.id,{column:e.target.value})} style={{background:"#0F1219",border:"1px solid #1E293B",borderRadius:5,padding:"2px 6px",color:COLS.find(c=>c.id===item.column)?.color,fontSize:10,fontFamily:"'Overpass Mono',monospace",cursor:"pointer",outline:"none"}}>{COLS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>:<span style={{color:COLS.find(c=>c.id===item.column)?.color}}>{COLS.find(c=>c.id===item.column)?.label}</span>}
        </div>
        {parent&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#475569"}}>Parent</span><span style={{color:TYPES[parent.type].color}}>{parent.title}</span></div>}
        {children.length>0&&<div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"#475569"}}>Children</span><span style={{color:"#CBD5E1"}}>{children.filter(c=>c.column==="done").length}/{children.length} done</span></div>}
        {perms.includes("prioritize")&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{color:"#475569"}}>Priority</span>
            <div style={{display:"flex",gap:4}}>{Object.entries(PRI).map(([k,p])=><button key={k} onClick={()=>onUpdate(item.id,{priority:k})} style={{width:18,height:18,borderRadius:"50%",cursor:"pointer",background:item.priority===k?p.color:`${p.color}22`,border:item.priority===k?"2px solid #fff":"2px solid transparent",transition:"all 0.2s"}} title={p.label}/>)}</div>
          </div>
        )}
      </div>
      {children.length>0&&(
        <div style={{padding:"10px 20px",borderBottom:"1px solid #141926"}}>
          <span style={{color:"#475569",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5}}>Connected</span>
          <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:3}}>
            {children.map(ch=>{const ct=TYPES[ch.type];const cc=COLS.find(c=>c.id===ch.column);return(
              <div key={ch.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:"#0F121966",borderRadius:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:ct.color}} />
                <span style={{flex:1,fontSize:10,color:"#CBD5E1"}}>{ch.title}</span>
                <span style={{fontSize:8,color:cc.color,fontWeight:600}}>{cc.label}</span>
              </div>
            );})}
          </div>
        </div>
      )}
      <div style={{flex:1,padding:"10px 20px",overflowY:"auto"}}>
        <span style={{color:"#475569",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5}}>Discussion ({item.comments.length})</span>
        <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:6}}>
          {item.comments.map((c,i)=>{const r=ROLES[c.author];return(
            <div key={i} style={{background:"#0F121966",borderRadius:8,padding:"10px 12px",borderLeft:`3px solid ${r?.color||"#475569"}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:r?.color||"#475569",fontSize:9.5,fontWeight:700}}>{r?.label||c.author}</span>
                <span style={{color:"#1E293B",fontSize:8}}>{c.time}</span>
              </div>
              <p style={{color:"#94A3B8",fontSize:11,margin:0,lineHeight:1.5}}>{c.text}</p>
            </div>
          );})}
          {item.comments.length===0&&<p style={{textAlign:"center",color:"#1E293B",fontSize:10,padding:14}}>No comments yet</p>}
        </div>
      </div>
      {perms.includes("comment")&&(
        <div style={{padding:"10px 20px",borderTop:"1px solid #141926"}}>
          <div style={{display:"flex",gap:6}}>
            <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Comment..." onKeyDown={e=>{if(e.key==="Enter"&&comment.trim()){onAddComment(item.id,comment);setComment("");}}} style={{flex:1,background:"#0F1219",border:"1px solid #1E293B",borderRadius:8,padding:"9px 12px",color:"#E2E8F0",fontSize:11,fontFamily:"'Overpass Mono',monospace",outline:"none"}} />
            <button onClick={()=>{if(comment.trim()){onAddComment(item.id,comment);setComment("");}}} style={{background:typ.color,border:"none",borderRadius:8,padding:"9px 14px",color:"#fff",fontSize:10,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",fontWeight:700}}>↵</button>
          </div>
        </div>
      )}
      {perms.includes("delete")&&<div style={{padding:"0 20px 12px"}}><button onClick={()=>{onDelete(item.id);onClose();}} style={{width:"100%",background:"#F43F5E08",border:"1px solid #F43F5E18",borderRadius:8,padding:"8px",color:"#F43F5E",fontSize:10,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",fontWeight:600}}>Delete</button></div>}
    </div>
  );
}

/* ═══ CREATE MODAL ═══ */
function CreateModal({onClose,onCreate,items}){
  const [title,setTitle]=useState("");const [desc,setDesc]=useState("");const [type,setType]=useState("story");
  const [pri,setPri]=useState("medium");const [parentId,setParentId]=useState("");const [tags,setTags]=useState("");
  const [sprintId,setSprintId]=useState("");const [deadline,setDeadline]=useState("");
  const parents=items.filter(i=>{if(type==="story")return i.type==="epic";if(type==="task")return i.type==="story";return false;});
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0F1219",borderRadius:16,padding:"28px 30px",width:460,border:"1px solid #1E293B",fontFamily:"'Overpass Mono',monospace",boxShadow:"0 32px 80px rgba(0,0,0,0.7)",maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 22px",fontSize:16,fontWeight:800,color:"#E2E8F0",display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff"}}>+</div>
          New Node
        </h3>
        <label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>TYPE</label>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {Object.entries(TYPES).map(([k,t])=><button key={k} onClick={()=>{setType(k);setParentId("");}} style={{flex:1,padding:"8px",borderRadius:8,background:type===k?`${t.color}18`:"#0B0F19",border:`1.5px solid ${type===k?t.color:"#1E293B"}`,color:type===k?t.color:"#475569",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Overpass Mono',monospace"}}>{t.icon} {t.label}</button>)}
        </div>
        <label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>TITLE</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g., Carbon calculator..." style={{width:"100%",background:"#0B0F19",border:"1px solid #1E293B",borderRadius:8,padding:"10px 12px",color:"#E2E8F0",fontSize:13,fontFamily:"'Overpass Mono',monospace",outline:"none",marginBottom:14,boxSizing:"border-box"}} />
        <label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>DESCRIPTION</label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Describe..." style={{width:"100%",background:"#0B0F19",border:"1px solid #1E293B",borderRadius:8,padding:"10px 12px",color:"#E2E8F0",fontSize:11,fontFamily:"'Overpass Mono',monospace",outline:"none",resize:"vertical",marginBottom:14,boxSizing:"border-box"}} />
        <div style={{display:"flex",gap:12,marginBottom:14}}>
          <div style={{flex:1}}><label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>PRIORITY</label><div style={{display:"flex",gap:5}}>{Object.entries(PRI).map(([k,p])=><button key={k} onClick={()=>setPri(k)} style={{flex:1,padding:"7px",borderRadius:6,background:pri===k?`${p.color}18`:"#0B0F19",border:`1.5px solid ${pri===k?p.color:"#1E293B"}`,color:pri===k?p.color:"#475569",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Overpass Mono',monospace"}}>{p.label}</button>)}</div></div>
          <div style={{flex:1}}><label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>DEADLINE</label><input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{width:"100%",background:"#0B0F19",border:"1px solid #1E293B",borderRadius:6,padding:"7px 10px",color:"#E2E8F0",fontSize:10,fontFamily:"'Overpass Mono',monospace",outline:"none",boxSizing:"border-box",colorScheme:"dark"}} /></div>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:14}}>
          <div style={{flex:1}}><label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>SPRINT</label><select value={sprintId} onChange={e=>setSprintId(e.target.value)} style={{width:"100%",background:"#0B0F19",border:"1px solid #1E293B",borderRadius:6,padding:"7px 10px",color:"#94A3B8",fontSize:10,fontFamily:"'Overpass Mono',monospace",outline:"none",boxSizing:"border-box"}}><option value="">None</option>{SPRINTS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          {type!=="epic"&&parents.length>0&&<div style={{flex:1}}><label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>CONNECT TO {type==="story"?"EPIC":"STORY"}</label><select value={parentId} onChange={e=>setParentId(e.target.value)} style={{width:"100%",background:"#0B0F19",border:"1px solid #1E293B",borderRadius:6,padding:"7px 10px",color:"#94A3B8",fontSize:10,fontFamily:"'Overpass Mono',monospace",outline:"none",boxSizing:"border-box"}}><option value="">None</option>{parents.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>}
        </div>
        <label style={{color:"#475569",fontSize:9,display:"block",marginBottom:4,fontWeight:700,letterSpacing:1.5}}>TAGS</label>
        <input value={tags} onChange={e=>setTags(e.target.value)} placeholder="mvp, frontend..." style={{width:"100%",background:"#0B0F19",border:"1px solid #1E293B",borderRadius:6,padding:"7px 10px",color:"#94A3B8",fontSize:10,fontFamily:"'Overpass Mono',monospace",outline:"none",boxSizing:"border-box",marginBottom:20}} />
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid #334155",borderRadius:8,padding:"9px 20px",color:"#94A3B8",fontSize:11,cursor:"pointer",fontFamily:"'Overpass Mono',monospace"}}>Cancel</button>
          <button onClick={()=>{if(title.trim()){onCreate({title:title.trim(),desc:desc.trim(),type,priority:pri,parentId:parentId||null,column:"backlog",sprintId:sprintId||null,tags:tags.split(",").map(t=>t.trim()).filter(Boolean),deadline:deadline||null});onClose();}}} style={{background:"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:8,padding:"9px 24px",color:"#fff",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",boxShadow:"0 4px 16px rgba(52,211,153,0.25)"}}>Create</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
export default function CarbonFlow(){
  const [items,setItems]=useState(INIT_ITEMS);const [logs,setLogs]=useState(INIT_LOGS);
  const [selId,setSelId]=useState(null);const [role,setRole]=useState("owner");
  const [showCreate,setShowCreate]=useState(false);const [dragCol,setDragCol]=useState(null);
  const [dragId,setDragId]=useState(null);const [fType,setFType]=useState("all");
  const [fPri,setFPri]=useState("all");const [showConn,setShowConn]=useState(true);
  const [view,setView]=useState("board");const [showSprints,setShowSprints]=useState(false);
  const [showLog,setShowLog]=useState(false);const [search,setSearch]=useState("");
  const cardRefs=useRef({});const selItem=items.find(i=>i.id===selId);

  const addLog=useCallback((type,item,detail)=>{setLogs(p=>[...p,{id:`l_${Date.now()}`,type,item,detail,role,time:`Today, ${ts()}`}]);},[role]);

  const filtered=useMemo(()=>items.filter(i=>{
    if(fType!=="all"&&i.type!==fType) return false;
    if(fPri!=="all"&&i.priority!==fPri) return false;
    if(search){const q=search.toLowerCase();return i.title.toLowerCase().includes(q)||i.desc?.toLowerCase().includes(q)||i.tags?.some(t=>t.toLowerCase().includes(q));}
    return true;
  }),[items,fType,fPri,search]);

  const onDragStart=(e,id)=>{setDragId(id);e.dataTransfer.effectAllowed="move";};
  const onDrop=(e,colId)=>{e.preventDefault();if(dragId){const item=items.find(i=>i.id===dragId);if(item&&item.column!==colId){const from=COLS.find(c=>c.id===item.column)?.label;const to=COLS.find(c=>c.id===colId)?.label;setItems(p=>p.map(i=>i.id===dragId?{...i,column:colId}:i));if(colId==="done")addLog("completed",item.title,`Moved to Done from ${from}`);else addLog("moved",item.title,`${from} → ${to}`);}}setDragCol(null);setDragId(null);};
  const onUpdate=(id,u)=>{const item=items.find(i=>i.id===id);if(!item)return;setItems(p=>p.map(i=>i.id===id?{...i,...u}:i));if(u.priority&&u.priority!==item.priority)addLog("prioritized",item.title,`${PRI[item.priority].label} → ${PRI[u.priority].label}`);if(u.column&&u.column!==item.column){const f=COLS.find(c=>c.id===item.column)?.label;const t=COLS.find(c=>c.id===u.column)?.label;if(u.column==="done")addLog("completed",item.title,`Done from ${f}`);else addLog("moved",item.title,`${f} → ${t}`);}if(u.deadline!==undefined&&u.deadline!==item.deadline)addLog("deadline",item.title,u.deadline?`Set to ${fmtDl(u.deadline)}`:"Removed");if(u.title||u.desc)addLog("edited",item.title,"Updated");};
  const onComment=(id,text)=>{const item=items.find(i=>i.id===id);setItems(p=>p.map(i=>i.id===id?{...i,comments:[...i.comments,{author:role,text,time:"Just now"}]}:i));if(item)addLog("commented",item.title,text.substring(0,50));};
  const onDelete=(id)=>{const item=items.find(i=>i.id===id);setItems(p=>p.filter(i=>i.id!==id&&i.parentId!==id));setSelId(null);if(item)addLog("deleted",item.title,`${TYPES[item.type].label} removed`);};
  const onCreate=(n)=>{setItems(p=>[...p,{...n,id:`n_${Date.now()}`,assignee:null,comments:[],created:"Today",order:p.filter(i=>i.column===n.column&&i.priority===n.priority).length}]);addLog("created",n.title,`${TYPES[n.type].label} created`);};
  const onAssignSprint=(id,sid)=>{const item=items.find(i=>i.id===id);setItems(p=>p.map(i=>i.id===id?{...i,sprintId:sid}:i));if(item)addLog("sprint",item.title,`→ ${SPRINTS.find(s=>s.id===sid)?.name}`);};
  const onReorder=(id,dir)=>{setItems(prev=>{const item=prev.find(i=>i.id===id);if(!item)return prev;const sibs=prev.filter(i=>i.column===item.column&&i.priority===item.priority).sort((a,b)=>(a.order||0)-(b.order||0));const idx=sibs.findIndex(i=>i.id===id);const si=idx+dir;if(si<0||si>=sibs.length)return prev;const swap=sibs[si];addLog("reordered",item.title,`Moved ${dir<0?"up":"down"}`);return prev.map(i=>{if(i.id===id)return{...i,order:swap.order??si};if(i.id===swap.id)return{...i,order:item.order??idx};return i;});});};

  const stats=useMemo(()=>({
    total:items.length,done:items.filter(i=>i.column==="done").length,
    active:items.filter(i=>i.column==="inprogress").length,
    urgent:items.filter(i=>i.priority==="high"&&i.column!=="done").length,
    overdue:items.filter(i=>{const d=dlStatus(i.deadline);return d&&d.text.includes("overdue");}).length,
    pct:items.length?Math.round((items.filter(i=>i.column==="done").length/items.length)*100):0,
  }),[items]);

  return (
    <div style={{minHeight:"100vh",background:"#0B0F19",fontFamily:"'Overpass Mono',monospace",color:"#E2E8F0",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Overpass+Mono:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E293B;border-radius:8px}
        *{scrollbar-width:thin;scrollbar-color:#1E293B transparent}
        [draggable]:hover .reorder-btns{opacity:1!important}
      `}</style>
      <Particles />

      {/* ─── HEADER ─── */}
      <header style={{position:"relative",zIndex:50,background:"#0B0F19dd",backdropFilter:"blur(16px)",borderBottom:"1px solid #1E293B",padding:"10px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#34D399,#059669)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(52,211,153,0.2)",fontSize:12,color:"#fff",fontWeight:800}}>◉</div>
            <div>
              <h1 style={{margin:0,fontSize:14,fontWeight:800,fontFamily:"'DM Sans',sans-serif",background:"linear-gradient(135deg,#34D399,#A7F3D0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"-0.5px"}}>CARBONFLOW</h1>
              <span style={{fontSize:7,color:"#334155",letterSpacing:2.5,textTransform:"uppercase",fontWeight:600}}>Sustainability Backlog</span>
            </div>
          </div>
          <div style={{height:24,width:1,background:"#1E293B"}} />
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <MiniProgress pct={stats.pct} w={40} h={5} color="#34D399" />
            <span style={{fontSize:10,fontWeight:700,color:"#34D399"}}>{stats.pct}%</span>
            {[{l:"Total",v:stats.total,c:"#64748B"},{l:"Active",v:stats.active,c:"#F59E0B"},{l:"Done",v:stats.done,c:"#34D399"},{l:"Urgent",v:stats.urgent,c:"#F43F5E"},...(stats.overdue?[{l:"Overdue",v:stats.overdue,c:"#F43F5E"}]:[])].map(s=>(
              <div key={s.l} style={{textAlign:"center"}}>
                <div style={{fontSize:13,fontWeight:800,color:s.c,fontFamily:"'DM Sans',sans-serif"}}>{s.v}</div>
                <div style={{fontSize:7,color:"#334155",letterSpacing:0.8,fontWeight:700}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{position:"relative"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{width:120,background:"#0F1219",border:"1px solid #1E293B",borderRadius:6,padding:"5px 8px 5px 22px",color:"#CBD5E1",fontSize:10,fontFamily:"'Overpass Mono',monospace",outline:"none"}} /><span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"#334155"}}>⌕</span></div>
          <select value={fType} onChange={e=>setFType(e.target.value)} style={{background:"#0F1219",border:"1px solid #1E293B",borderRadius:5,padding:"5px 6px",color:"#94A3B8",fontSize:9,fontFamily:"'Overpass Mono',monospace",cursor:"pointer",outline:"none"}}><option value="all">All Types</option>{Object.entries(TYPES).map(([k,t])=><option key={k} value={k}>{t.label}s</option>)}</select>
          <select value={fPri} onChange={e=>setFPri(e.target.value)} style={{background:"#0F1219",border:"1px solid #1E293B",borderRadius:5,padding:"5px 6px",color:"#94A3B8",fontSize:9,fontFamily:"'Overpass Mono',monospace",cursor:"pointer",outline:"none"}}><option value="all">All Priority</option>{Object.entries(PRI).map(([k,p])=><option key={k} value={k}>{p.label}</option>)}</select>
          <div style={{display:"flex",background:"#0F1219",borderRadius:5,border:"1px solid #1E293B",overflow:"hidden"}}>
            {[{id:"board",icon:"▤",tip:"Board"},{id:"list",icon:"☰",tip:"List"},{id:"map",icon:"◎",tip:"Node Map"}].map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)} title={v.tip} style={{padding:"4px 10px",background:view===v.id?"#34D39912":"transparent",border:"none",color:view===v.id?"#34D399":"#334155",fontSize:11,cursor:"pointer",transition:"all 0.15s"}}>{v.icon}</button>
            ))}
          </div>
          {view==="board"&&<button onClick={()=>setShowConn(!showConn)} style={{background:showConn?"#34D39910":"#0F1219",border:`1px solid ${showConn?"#34D39928":"#1E293B"}`,borderRadius:5,padding:"4px 8px",color:showConn?"#34D399":"#334155",fontSize:9,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",fontWeight:700}}>{showConn?"◉":"○"}</button>}
          <button onClick={()=>setShowSprints(!showSprints)} style={{background:showSprints?"#3B82F610":"#0F1219",border:`1px solid ${showSprints?"#3B82F628":"#1E293B"}`,borderRadius:5,padding:"4px 8px",color:showSprints?"#3B82F6":"#334155",fontSize:9,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",fontWeight:700}}>⏱</button>
          <button onClick={()=>setShowLog(!showLog)} style={{background:showLog?"#F59E0B10":"#0F1219",border:`1px solid ${showLog?"#F59E0B28":"#1E293B"}`,borderRadius:5,padding:"4px 8px",color:showLog?"#F59E0B":"#334155",fontSize:9,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",fontWeight:700}}>📋 {logs.length}</button>
          <div style={{display:"flex",background:"#0F1219",borderRadius:5,border:"1px solid #1E293B",overflow:"hidden"}}>{Object.entries(ROLES).map(([k,r])=><button key={k} onClick={()=>setRole(k)} style={{padding:"4px 10px",background:role===k?`${r.color}10`:"transparent",border:"none",color:role===k?r.color:"#334155",fontSize:9,fontWeight:700,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",borderRight:k==="owner"?"1px solid #1E293B":"none"}}>{r.short}</button>)}</div>
          {ROLES[role].perms.includes("create")&&<button onClick={()=>setShowCreate(true)} style={{background:"linear-gradient(135deg,#34D399,#059669)",border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",fontSize:10,fontWeight:800,cursor:"pointer",fontFamily:"'Overpass Mono',monospace",boxShadow:"0 3px 12px rgba(52,211,153,0.2)",display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:14,lineHeight:1}}>+</span>New</button>}
        </div>
      </header>

      {/* ─── BODY ─── */}
      <div style={{display:"flex",flex:1,overflow:"hidden",position:"relative"}}>
        {showSprints&&<SprintPanel items={items} onClose={()=>setShowSprints(false)} onAssignSprint={onAssignSprint} role={role} />}

        <div style={{flex:1,overflow:"auto",position:"relative"}}>
          {view==="board"&&(
            <div data-board style={{display:"flex",gap:0,padding:"12px 8px",minHeight:"calc(100vh - 58px)",position:"relative"}}>
              {showConn&&<Connections items={filtered} cardRefs={cardRefs} />}
              {COLS.map(col=>{
                const ci=filtered.filter(i=>i.column===col.id);const isOver=dragCol===col.id;
                return(
                  <div key={col.id} onDragOver={e=>{e.preventDefault();setDragCol(col.id);}} onDragLeave={()=>setDragCol(null)} onDrop={e=>onDrop(e,col.id)}
                    style={{flex:1,minWidth:200,display:"flex",flexDirection:"column",borderRight:col.id!=="done"?"1px solid #141926":"none",background:isOver?`${col.color}06`:"transparent",transition:"background 0.25s",position:"relative",zIndex:1}}>
                    <div style={{padding:"6px 10px 10px",textAlign:"center",position:"sticky",top:0,zIndex:2}}>
                      <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:14,background:`${col.color}08`,border:`1px solid ${col.color}18`}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:col.color}} />
                        <span style={{fontSize:10,fontWeight:800,color:col.color,textTransform:"uppercase",letterSpacing:2}}>{col.label}</span>
                        <span style={{fontSize:9,fontWeight:800,color:"#0B0F19",background:col.color,borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{ci.length}</span>
                      </div>
                    </div>
                    <div style={{flex:1,padding:"0 6px",overflowY:"auto"}}>
                      {ci.sort((a,b)=>{const p={high:0,medium:1,low:2};const t={epic:0,story:1,task:2};return p[a.priority]-p[b.priority]||t[a.type]-t[b.type]||(a.order||0)-(b.order||0);}).map(item=>(
                        <div key={item.id} ref={el=>{if(el)cardRefs.current[item.id]=el;}}>
                          <Card item={item} items={items} isSelected={selId===item.id} onClick={setSelId} onDragStart={onDragStart} isDragging={dragId===item.id} onReorder={onReorder} showConnDot={showConn} />
                        </div>
                      ))}
                      {ci.length===0&&<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:60,opacity:0.15}}><div style={{width:28,height:28,borderRadius:"50%",border:`2px dashed ${col.color}44`}} /></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {view==="list"&&<ListView items={filtered} onSelect={setSelId} selectedId={selId} onReorder={onReorder} />}
          {view==="map"&&<NodeMap items={filtered} onSelect={setSelId} selectedId={selId} />}
        </div>

        {showLog&&<LogPanel logs={logs} onClose={()=>setShowLog(false)} />}
      </div>

      {selItem&&<><div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:99}} onClick={()=>setSelId(null)} /><Detail item={selItem} items={items} onClose={()=>setSelId(null)} onUpdate={onUpdate} onAddComment={onComment} onDelete={onDelete} role={role} /></>}
      {showCreate&&<CreateModal onClose={()=>setShowCreate(false)} onCreate={onCreate} items={items} />}

      {/* Legend */}
      <div style={{position:"fixed",bottom:10,left:showSprints?302:10,display:"flex",gap:10,background:"#0B0F19ee",backdropFilter:"blur(10px)",padding:"7px 14px",borderRadius:10,border:"1px solid #1E293B",zIndex:50,transition:"left 0.3s"}}>
        {Object.entries(TYPES).map(([k,t])=><div key={k} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:8,height:8,borderRadius:"50%",background:t.color,opacity:0.7}} /><span style={{fontSize:8,color:"#475569",fontWeight:600}}>{t.label}</span></div>)}
        <div style={{width:1,background:"#1E293B"}} />
        {Object.entries(PRI).map(([k,p])=><div key={k} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:p.dot-2,height:p.dot-2,borderRadius:"50%",background:p.color}} /><span style={{fontSize:8,color:"#475569",fontWeight:600}}>{p.label}</span></div>)}
      </div>
    </div>
  );
}
