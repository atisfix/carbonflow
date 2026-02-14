import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ─── CONSTANTS ─── */
const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "#546A7B", emoji: "📋" },
  { id: "todo", label: "To Do", color: "#4A90D9", emoji: "📌" },
  { id: "inprogress", label: "In Progress", color: "#E6A817", emoji: "⚡" },
  { id: "review", label: "Review", color: "#9B6DFF", emoji: "🔍" },
  { id: "done", label: "Done", color: "#2ECC71", emoji: "✅" },
];

const PRIORITIES = {
  high: { label: "High", color: "#FF5A5F", size: 76, glow: "0 0 24px rgba(255,90,95,0.35)", weight: 3 },
  medium: { label: "Medium", color: "#E6A817", size: 62, glow: "0 0 18px rgba(230,168,23,0.25)", weight: 2 },
  low: { label: "Low", color: "#2ECC71", size: 50, glow: "0 0 14px rgba(46,204,113,0.25)", weight: 1 },
};

const ITEM_TYPES = {
  epic: { label: "Epic", icon: "◆", color: "#9B6DFF", ring: 4, dash: "none" },
  story: { label: "Story", icon: "○", color: "#4A90D9", ring: 3, dash: "none" },
  task: { label: "Task", icon: "·", color: "#546A7B", ring: 2, dash: "4 3" },
};

const ROLES = {
  owner: { label: "Product Owner", short: "PO", color: "#9B6DFF", permissions: ["create","edit","delete","prioritize","comment","move","sprint"] },
  developer: { label: "Developer", short: "DEV", color: "#4A90D9", permissions: ["edit","comment","move"] },
};

const SPRINTS = [
  { id: "s1", name: "Sprint 1 — Foundation", startDate: "Feb 10", endDate: "Feb 24", active: false },
  { id: "s2", name: "Sprint 2 — Carbon Core", startDate: "Feb 24", endDate: "Mar 10", active: true },
  { id: "s3", name: "Sprint 3 — Reporting", startDate: "Mar 10", endDate: "Mar 24", active: false },
];

const initialItems = [
  { id: "e1", title: "Carbon Dashboard", type: "epic", priority: "high", column: "inprogress", description: "Main carbon tracking dashboard with real-time Scope 1, 2 & 3 emissions data visualization and KPIs.", parentId: null, assignee: "owner", sprintId: "s2", tags: ["core", "mvp"], comments: [{ author: "owner", text: "Core feature for MVP launch — must ship by Sprint 2 end", time: "2h ago" }], createdAt: "Feb 3" },
  { id: "s1i", title: "Emissions Chart", type: "story", priority: "high", column: "inprogress", description: "Interactive D3 chart showing Scope 1, 2, 3 emissions breakdown over time with drill-down capability.", parentId: "e1", assignee: "developer", sprintId: "s2", tags: ["frontend"], comments: [{ author: "developer", text: "Using recharts, spike done", time: "1h ago" }], createdAt: "Feb 5" },
  { id: "t1", title: "Chart API integration", type: "task", priority: "medium", column: "todo", description: "Connect emissions chart to the /api/emissions endpoint. Handle pagination and caching.", parentId: "s1i", assignee: "developer", sprintId: "s2", tags: ["api"], comments: [], createdAt: "Feb 7" },
  { id: "t2", title: "Chart animations", type: "task", priority: "low", column: "backlog", description: "Add enter/exit transitions, hover tooltips with CO₂ values, and smooth axis updates.", parentId: "s1i", assignee: null, sprintId: null, tags: ["polish"], comments: [], createdAt: "Feb 7" },
  { id: "s2i", title: "KPI Summary Cards", type: "story", priority: "medium", column: "todo", description: "Dashboard cards: Total CO₂e, YoY reduction %, target progress, and offset credits balance.", parentId: "e1", assignee: null, sprintId: "s2", tags: ["frontend"], comments: [], createdAt: "Feb 5" },
  { id: "t5", title: "KPI data service", type: "task", priority: "medium", column: "todo", description: "Backend service to aggregate KPI metrics from multiple data sources.", parentId: "s2i", assignee: "developer", sprintId: "s2", tags: ["backend"], comments: [], createdAt: "Feb 8" },
  { id: "e2", title: "User Management", type: "epic", priority: "medium", column: "backlog", description: "Authentication, role-based access control, team invitations, and SSO integration.", parentId: null, assignee: "owner", sprintId: null, tags: ["infra"], comments: [], createdAt: "Feb 3" },
  { id: "s3i", title: "Login & Auth", type: "story", priority: "high", column: "review", description: "OAuth2 + SAML SSO login flow. JWT token management with refresh rotation.", parentId: "e2", assignee: "developer", sprintId: "s2", tags: ["auth", "security"], comments: [{ author: "developer", text: "PR #42 ready for review — all tests pass", time: "30m ago" }, { author: "owner", text: "Will review today", time: "15m ago" }], createdAt: "Feb 4" },
  { id: "t3", title: "JWT token handling", type: "task", priority: "high", column: "done", description: "Implement secure token storage, automatic refresh, and logout cleanup.", parentId: "s3i", assignee: "developer", sprintId: "s2", tags: ["security"], comments: [{ author: "developer", text: "Done and tested", time: "3h ago" }], createdAt: "Feb 6" },
  { id: "s4i", title: "Role permissions", type: "story", priority: "low", column: "backlog", description: "RBAC system: Admin, Editor, Viewer roles with granular resource permissions.", parentId: "e2", assignee: null, sprintId: "s3", tags: ["auth"], comments: [], createdAt: "Feb 5" },
  { id: "e3", title: "ESG Reporting", type: "epic", priority: "high", column: "backlog", description: "Automated ESG/CSRD compliance reporting module with multi-framework support.", parentId: null, assignee: "owner", sprintId: "s3", tags: ["compliance", "core"], comments: [{ author: "owner", text: "Critical for EU clients — CSRD deadline approaching", time: "1d ago" }], createdAt: "Feb 3" },
  { id: "s5i", title: "Report Generator", type: "story", priority: "medium", column: "todo", description: "Generate branded PDF reports from emissions data. Support CSRD, CDP, GRI templates.", parentId: "e3", assignee: null, sprintId: "s3", tags: ["reporting"], comments: [], createdAt: "Feb 5" },
  { id: "s6i", title: "Framework Mapping", type: "story", priority: "low", column: "backlog", description: "Map internal data model to GRI, CDP, TCFD, ISSB framework fields automatically.", parentId: "e3", assignee: null, sprintId: "s3", tags: ["compliance"], comments: [], createdAt: "Feb 5" },
  { id: "t4", title: "PDF template engine", type: "task", priority: "medium", column: "backlog", description: "Build reusable PDF layout engine with company branding, charts, and data tables.", parentId: "s5i", assignee: null, sprintId: "s3", tags: ["reporting"], comments: [], createdAt: "Feb 8" },
  { id: "e4", title: "Supply Chain Tracking", type: "epic", priority: "low", column: "backlog", description: "Scope 3 supplier emissions tracking, data collection portal, and supply chain mapping.", parentId: null, assignee: null, sprintId: null, tags: ["scope3"], comments: [], createdAt: "Feb 10" },
  { id: "s7i", title: "Supplier Portal", type: "story", priority: "low", column: "backlog", description: "Self-service portal for suppliers to submit emissions data and upload evidence.", parentId: "e4", assignee: null, sprintId: null, tags: ["scope3", "portal"], comments: [], createdAt: "Feb 10" },
];

/* ─── Floating Particles Background ─── */
function ParticlesBg() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    const particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5, a: Math.random() * 0.15 + 0.05,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(46,204,113,${p.a})`; ctx.fill();
      });
      // Draw faint lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(46,204,113,${0.04 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ─── Progress Ring ─── */
function ProgressRing({ progress, size = 36, stroke = 3, color = "#2ECC71" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2230" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

/* ─── Bubble Node ─── */
function Bubble({ item, items, isSelected, onClick, onDragStart, isDragging }) {
  const [hovered, setHovered] = useState(false);
  const pri = PRIORITIES[item.priority];
  const typ = ITEM_TYPES[item.type];
  const children = items.filter(i => i.parentId === item.id);
  const childDone = children.filter(c => c.column === "done").length;
  const hasChildren = children.length > 0;
  const progress = hasChildren ? Math.round((childDone / children.length) * 100) : item.column === "done" ? 100 : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item.id)}
      onClick={(e) => { e.stopPropagation(); onClick(item.id); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: pri.size,
        height: pri.size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${typ.color}55, ${typ.color}15 70%, transparent)`,
        border: `${typ.ring}px solid ${isSelected ? "#fff" : hovered ? `${typ.color}cc` : `${typ.color}88`}`,
        boxShadow: isSelected
          ? `0 0 0 3px ${typ.color}, ${pri.glow}, inset 0 0 20px ${typ.color}22`
          : hovered ? `${pri.glow}, inset 0 0 15px ${typ.color}11` : `inset 0 0 10px ${typ.color}08`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: "grab", position: "relative", zIndex: isSelected ? 10 : hovered ? 5 : 1,
        transform: isSelected ? "scale(1.18)" : hovered ? "scale(1.08)" : "scale(1)",
        transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        margin: "8px auto",
        opacity: isDragging ? 0.4 : 1,
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Priority pip */}
      <div style={{
        position: "absolute", top: -2, right: -2,
        width: 12, height: 12, borderRadius: "50%",
        background: `radial-gradient(circle at 40% 40%, ${pri.color}, ${pri.color}aa)`,
        border: "2px solid #0b0d12", zIndex: 3,
        boxShadow: `0 0 6px ${pri.color}66`,
      }} />

      {/* Progress ring (for epics/stories with children) */}
      {hasChildren && (
        <div style={{ position: "absolute", inset: -5, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <ProgressRing progress={progress} size={pri.size + 10} stroke={2} color={progress === 100 ? "#2ECC71" : typ.color} />
        </div>
      )}

      {/* Connection dot bottom */}
      {hasChildren && (
        <div style={{
          position: "absolute", bottom: -5, width: 6, height: 6, borderRadius: "50%",
          background: typ.color, border: "2px solid #0b0d12", zIndex: 3,
        }} />
      )}

      {/* Tags indicator */}
      {item.tags && item.tags.length > 0 && (
        <div style={{
          position: "absolute", top: -2, left: -2,
          width: 10, height: 10, borderRadius: "50%",
          background: "#E6A817", border: "2px solid #0b0d12", zIndex: 3,
          fontSize: 6, display: "flex", alignItems: "center", justifyContent: "center",
          color: "#0b0d12", fontWeight: 800,
        }}>{item.tags.length}</div>
      )}

      {/* Sprint indicator */}
      {item.sprintId && (
        <div style={{
          position: "absolute", bottom: -2, left: -2,
          width: 10, height: 10, borderRadius: "50%",
          background: SPRINTS.find(s => s.id === item.sprintId)?.active ? "#2ECC71" : "#546A7B",
          border: "2px solid #0b0d12", zIndex: 3,
        }} />
      )}

      {/* Content */}
      <span style={{ fontSize: item.type === "epic" ? 12 : 10, color: typ.color, fontWeight: 800, lineHeight: 1, opacity: 0.9 }}>
        {typ.icon}
      </span>
      <span style={{
        fontSize: 7.5, color: "#c8d1dc", textAlign: "center", lineHeight: 1.15,
        maxWidth: pri.size - 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, marginTop: 2, letterSpacing: "-0.2px",
      }}>{item.title}</span>

      {/* Hover tooltip */}
      {hovered && !isSelected && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)",
          background: "#1a1e28", border: "1px solid #2a2f3d", borderRadius: 10, padding: "10px 14px",
          minWidth: 180, zIndex: 100, pointerEvents: "none",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.4, marginBottom: 6 }}>
            {item.description?.substring(0, 80)}{item.description?.length > 80 ? "..." : ""}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${typ.color}22`, color: typ.color }}>{typ.label}</span>
            <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${pri.color}22`, color: pri.color }}>{pri.label}</span>
            {hasChildren && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: "#2ECC7122", color: "#2ECC71" }}>{progress}%</span>}
            {item.comments.length > 0 && <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: "#546A7B22", color: "#546A7B" }}>💬 {item.comments.length}</span>}
          </div>
          {/* Arrow */}
          <div style={{
            position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)",
            width: 10, height: 10, background: "#1a1e28", borderRight: "1px solid #2a2f3d", borderBottom: "1px solid #2a2f3d",
          }} />
        </div>
      )}
    </div>
  );
}

/* ─── SVG Connection Lines (curved) ─── */
function ConnectionLines({ items, bubbleRefs }) {
  const [lines, setLines] = useState([]);
  const calc = useCallback(() => {
    const out = [];
    const container = document.querySelector("[data-board]");
    if (!container) return;
    const bRect = container.getBoundingClientRect();
    items.forEach(item => {
      if (!item.parentId) return;
      const cEl = bubbleRefs.current[item.id];
      const pEl = bubbleRefs.current[item.parentId];
      if (!cEl || !pEl) return;
      const c = cEl.getBoundingClientRect();
      const p = pEl.getBoundingClientRect();
      out.push({
        id: `${item.parentId}-${item.id}`,
        x1: p.left + p.width / 2 - bRect.left, y1: p.top + p.height / 2 - bRect.top,
        x2: c.left + c.width / 2 - bRect.left, y2: c.top + c.height / 2 - bRect.top,
        parentType: items.find(i => i.id === item.parentId)?.type || "epic",
        sameCol: item.column === items.find(i => i.id === item.parentId)?.column,
        childDone: item.column === "done",
      });
    });
    setLines(out);
  }, [items, bubbleRefs]);

  useEffect(() => {
    const t = setTimeout(calc, 80);
    const iv = setInterval(calc, 400);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [calc]);

  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}>
      <defs>
        <filter id="lineGlow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2ECC7166" />
        </marker>
      </defs>
      {lines.map(l => {
        const typ = ITEM_TYPES[l.parentType];
        const mx = (l.x1 + l.x2) / 2;
        const cp1y = l.y1 + (l.y2 - l.y1) * 0.2;
        const cp2y = l.y1 + (l.y2 - l.y1) * 0.8;
        return (
          <path
            key={l.id}
            d={l.sameCol
              ? `M ${l.x1} ${l.y1} Q ${l.x1 + 30} ${(l.y1 + l.y2) / 2} ${l.x2} ${l.y2}`
              : `M ${l.x1} ${l.y1} C ${mx} ${cp1y}, ${mx} ${cp2y}, ${l.x2} ${l.y2}`}
            fill="none"
            stroke={l.childDone ? "#2ECC7144" : `${typ.color}44`}
            strokeWidth={l.sameCol ? 1.8 : 1.2}
            strokeDasharray={l.sameCol ? "none" : "6 4"}
            filter="url(#lineGlow)"
            markerEnd={l.childDone ? "url(#arrowGreen)" : ""}
          />
        );
      })}
    </svg>
  );
}

/* ─── Backlog List View ─── */
function BacklogList({ items, onSelect, selectedId, currentRole, onUpdate }) {
  const sorted = [...items].sort((a, b) => {
    const tO = { epic: 0, story: 1, task: 2 }; const pO = { high: 0, medium: 1, low: 2 };
    return tO[a.type] - tO[b.type] || pO[a.priority] - pO[b.priority];
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 0" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 100px 60px",
        padding: "8px 16px", gap: 8, alignItems: "center",
        borderBottom: "1px solid #1e2230",
      }}>
        {["", "Title", "Type", "Priority", "Status", "Sprint", ""].map((h, i) => (
          <span key={i} style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>{h}</span>
        ))}
      </div>
      {sorted.map(item => {
        const typ = ITEM_TYPES[item.type];
        const pri = PRIORITIES[item.priority];
        const col = COLUMNS.find(c => c.id === item.column);
        const sp = SPRINTS.find(s => s.id === item.sprintId);
        const isSel = selectedId === item.id;
        const parent = item.parentId ? items.find(i => i.id === item.parentId) : null;
        return (
          <div key={item.id} onClick={() => onSelect(item.id)} style={{
            display: "grid", gridTemplateColumns: "32px 1fr 80px 80px 80px 100px 60px",
            padding: "10px 16px", gap: 8, alignItems: "center", cursor: "pointer",
            background: isSel ? "#1a1e2888" : "transparent",
            borderLeft: isSel ? `3px solid ${typ.color}` : "3px solid transparent",
            borderBottom: "1px solid #12141a",
            transition: "all 0.15s",
          }}>
            {/* Bubble mini */}
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: `${typ.color}22`, border: `2px solid ${typ.color}66`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: typ.color,
            }}>{typ.icon}</div>
            {/* Title + parent */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#d1d9e6" }}>{item.title}</div>
              {parent && <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>↳ {parent.title}</div>}
            </div>
            {/* Type badge */}
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${typ.color}18`, color: typ.color, fontWeight: 600, textAlign: "center" }}>{typ.label}</span>
            {/* Priority */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: pri.color }} />
              <span style={{ fontSize: 10, color: pri.color, fontWeight: 600 }}>{pri.label}</span>
            </div>
            {/* Status */}
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${col.color}18`, color: col.color, fontWeight: 600, textAlign: "center" }}>{col.label}</span>
            {/* Sprint */}
            <span style={{ fontSize: 9, color: sp?.active ? "#2ECC71" : "#475569" }}>{sp ? sp.name.split("—")[0].trim() : "—"}</span>
            {/* Comments count */}
            <span style={{ fontSize: 10, color: "#475569" }}>{item.comments.length > 0 ? `💬 ${item.comments.length}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Sprint Sidebar ─── */
function SprintSidebar({ items, sprints, onClose, onAssignSprint, currentRole }) {
  const canManage = ROLES[currentRole].permissions.includes("sprint");
  return (
    <div style={{
      width: 320, height: "100%", background: "linear-gradient(180deg, #10131a 0%, #0b0d12 100%)",
      borderRight: "1px solid #1e2230", padding: "20px 0", overflowY: "auto",
      fontFamily: "'IBM Plex Mono', monospace", display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "0 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e2230" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>Sprint Planning</h3>
          <span style={{ fontSize: 10, color: "#475569" }}>Drag items to assign sprints</span>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>

      {sprints.map(sprint => {
        const sprintItems = items.filter(i => i.sprintId === sprint.id);
        const done = sprintItems.filter(i => i.column === "done").length;
        const progress = sprintItems.length > 0 ? Math.round((done / sprintItems.length) * 100) : 0;
        const totalWeight = sprintItems.reduce((sum, i) => sum + PRIORITIES[i.priority].weight, 0);

        return (
          <div key={sprint.id} style={{
            margin: "12px 16px", padding: 16, borderRadius: 12,
            background: sprint.active ? "#2ECC7108" : "#0d0f14",
            border: `1px solid ${sprint.active ? "#2ECC7133" : "#1e2230"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {sprint.active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ECC71", boxShadow: "0 0 8px #2ECC7166", animation: "pulse 2s infinite" }} />}
                <span style={{ fontSize: 12, fontWeight: 700, color: sprint.active ? "#2ECC71" : "#94a3b8" }}>{sprint.name}</span>
              </div>
              <ProgressRing progress={progress} size={28} stroke={2.5} color={sprint.active ? "#2ECC71" : "#546A7B"} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569", marginBottom: 10 }}>
              <span>{sprint.startDate} — {sprint.endDate}</span>
              <span>{done}/{sprintItems.length} done · {totalWeight} pts</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sprintItems.map(item => {
                const typ = ITEM_TYPES[item.type];
                const col = COLUMNS.find(c => c.id === item.column);
                return (
                  <div key={item.id} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    background: "#0b0d1288", borderRadius: 8, border: `1px solid ${typ.color}15`,
                  }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${typ.color}22`, border: `1.5px solid ${typ.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: typ.color }}>{typ.icon}</div>
                    <span style={{ flex: 1, fontSize: 10, color: "#c8d1dc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: col.color }} />
                  </div>
                );
              })}
              {sprintItems.length === 0 && (
                <div style={{ padding: 12, textAlign: "center", fontSize: 10, color: "#334155", border: "1px dashed #1e2230", borderRadius: 8 }}>No items assigned</div>
              )}
            </div>
          </div>
        );
      })}

      {/* Unassigned items */}
      <div style={{ margin: "12px 16px", padding: 16, borderRadius: 12, background: "#0d0f14", border: "1px solid #1e2230" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 10 }}>Unassigned</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.filter(i => !i.sprintId).map(item => {
            const typ = ITEM_TYPES[item.type];
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                background: "#0b0d1288", borderRadius: 8, border: `1px solid #1a1e28`,
              }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: `${typ.color}22`, border: `1.5px solid ${typ.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: typ.color }}>{typ.icon}</div>
                <span style={{ flex: 1, fontSize: 10, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
                {canManage && (
                  <select
                    onClick={e => e.stopPropagation()}
                    onChange={e => { if (e.target.value) onAssignSprint(item.id, e.target.value); }}
                    value=""
                    style={{ background: "#131620", border: "1px solid #1e2230", borderRadius: 4, color: "#64748b", fontSize: 9, padding: "2px 4px", fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer" }}
                  >
                    <option value="">+Sprint</option>
                    {sprints.map(s => <option key={s.id} value={s.id}>{s.name.split("—")[0].trim()}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Detail Panel ─── */
function DetailPanel({ item, items, onClose, onUpdate, onAddComment, onDelete, currentRole, sprints }) {
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description);
  const typ = ITEM_TYPES[item.type];
  const pri = PRIORITIES[item.priority];
  const parent = item.parentId ? items.find(i => i.id === item.parentId) : null;
  const children = items.filter(i => i.parentId === item.id);
  const perms = ROLES[currentRole].permissions;
  const sprint = SPRINTS.find(s => s.id === item.sprintId);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 420, height: "100vh",
      background: "linear-gradient(180deg, #10131a 0%, #0b0d12 100%)",
      borderLeft: `2px solid ${typ.color}22`, zIndex: 100,
      display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Mono', monospace",
      boxShadow: "-24px 0 80px rgba(0,0,0,0.6)",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${typ.color}15` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: `${typ.color}15`, color: typ.color, fontWeight: 700 }}>{typ.icon} {typ.label}</span>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: `${pri.color}15`, color: pri.color, fontWeight: 700 }}>{pri.label}</span>
            {sprint && <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 10, background: sprint.active ? "#2ECC7115" : "#546A7B15", color: sprint.active ? "#2ECC71" : "#546A7B", fontWeight: 600 }}>{sprint.name.split("—")[0].trim()}</span>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#475569", fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>✕</button>
        </div>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {item.tags.map(tag => (
              <span key={tag} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 6, background: "#E6A81712", color: "#E6A817", fontWeight: 600, border: "1px solid #E6A81722" }}>{tag}</span>
            ))}
          </div>
        )}

        {editing && perms.includes("edit") ? (
          <div>
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{
              width: "100%", background: "#131620", border: `1px solid ${typ.color}33`, borderRadius: 8,
              padding: "10px 14px", color: "#e2e8f0", fontSize: 16, fontWeight: 700,
              fontFamily: "'IBM Plex Mono', monospace", marginBottom: 8, boxSizing: "border-box", outline: "none",
            }} />
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} style={{
              width: "100%", background: "#131620", border: `1px solid ${typ.color}33`, borderRadius: 8,
              padding: "10px 14px", color: "#94a3b8", fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace", resize: "vertical", boxSizing: "border-box", outline: "none",
            }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { onUpdate(item.id, { title: editTitle, description: editDesc }); setEditing(false); }} style={{
                background: `linear-gradient(135deg, ${typ.color}, ${typ.color}cc)`, border: "none", color: "#fff",
                padding: "8px 20px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
              }}>Save</button>
              <button onClick={() => { setEditing(false); setEditTitle(item.title); setEditDesc(item.description); }} style={{
                background: "#131620", border: "1px solid #2a2f3d", color: "#94a3b8",
                padding: "8px 20px", borderRadius: 8, fontSize: 11, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div onDoubleClick={() => { if (perms.includes("edit")) { setEditing(true); setEditTitle(item.title); setEditDesc(item.description); } }}>
            <h2 style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 800, margin: "0 0 8px", lineHeight: 1.3, letterSpacing: "-0.3px" }}>{item.title}</h2>
            <p style={{ color: "#64748b", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{item.description}</p>
            {perms.includes("edit") && <span style={{ color: "#334155", fontSize: 9, marginTop: 6, display: "block" }}>Double-click to edit</span>}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1a1e28", display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#475569" }}>Status</span>
          {perms.includes("move") ? (
            <select value={item.column} onChange={e => onUpdate(item.id, { column: e.target.value })} style={{
              background: "#131620", border: "1px solid #1e2230", borderRadius: 6, padding: "2px 8px",
              color: COLUMNS.find(c => c.id === item.column)?.color, fontSize: 11,
              fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", outline: "none",
            }}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          ) : (
            <span style={{ color: COLUMNS.find(c => c.id === item.column)?.color }}>{COLUMNS.find(c => c.id === item.column)?.label}</span>
          )}
        </div>
        {parent && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#475569" }}>Parent</span>
            <span style={{ color: ITEM_TYPES[parent.type].color, fontSize: 11 }}>{ITEM_TYPES[parent.type].icon} {parent.title}</span>
          </div>
        )}
        {children.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#475569" }}>Children</span>
            <span style={{ color: "#c8d1dc" }}>{children.filter(c => c.column === "done").length}/{children.length} done</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#475569" }}>Created</span>
          <span style={{ color: "#94a3b8" }}>{item.createdAt}</span>
        </div>
        {/* Priority changer */}
        {perms.includes("prioritize") && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#475569" }}>Priority</span>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(PRIORITIES).map(([k, p]) => (
                <button key={k} onClick={() => onUpdate(item.id, { priority: k })} style={{
                  width: 22, height: 22, borderRadius: "50%", cursor: "pointer",
                  background: item.priority === k ? p.color : `${p.color}22`,
                  border: item.priority === k ? "2px solid #fff" : "2px solid transparent",
                  transition: "all 0.2s", boxShadow: item.priority === k ? `0 0 8px ${p.color}55` : "none",
                }} title={p.label} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connected items */}
      {children.length > 0 && (
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #1a1e28" }}>
          <span style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Connected Nodes</span>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {children.map(child => {
              const cTyp = ITEM_TYPES[child.type];
              const cCol = COLUMNS.find(c => c.id === child.column);
              return (
                <div key={child.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  background: "#0d0f1488", borderRadius: 8, border: `1px solid ${cTyp.color}12`,
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${cTyp.color}22`, border: `2px solid ${cTyp.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: cTyp.color }}>{cTyp.icon}</div>
                  <span style={{ flex: 1, fontSize: 11, color: "#c8d1dc" }}>{child.title}</span>
                  <span style={{ fontSize: 9, color: cCol.color, background: `${cCol.color}15`, padding: "2px 6px", borderRadius: 4 }}>{cCol.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div style={{ flex: 1, padding: "14px 24px", overflowY: "auto" }}>
        <span style={{ color: "#475569", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>Discussion ({item.comments.length})</span>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
          {item.comments.map((c, i) => {
            const role = ROLES[c.author];
            return (
              <div key={i} style={{
                background: "#0d0f1488", borderRadius: 10, padding: "12px 14px",
                borderLeft: `3px solid ${role?.color || "#546A7B"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: role?.color || "#546A7B", fontSize: 10, fontWeight: 700 }}>{role?.label || c.author}</span>
                  <span style={{ color: "#334155", fontSize: 9 }}>{c.time}</span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: 11, margin: 0, lineHeight: 1.5 }}>{c.text}</p>
              </div>
            );
          })}
          {item.comments.length === 0 && <p style={{ color: "#334155", fontSize: 11, textAlign: "center", padding: 16 }}>No comments yet</p>}
        </div>
      </div>

      {/* Add comment */}
      {perms.includes("comment") && (
        <div style={{ padding: "14px 24px", borderTop: "1px solid #1a1e28" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Write a comment..." onKeyDown={e => { if (e.key === "Enter" && comment.trim()) { onAddComment(item.id, comment); setComment(""); } }}
              style={{
                flex: 1, background: "#0d0f14", border: "1px solid #1e2230", borderRadius: 10,
                padding: "10px 14px", color: "#e2e8f0", fontSize: 12,
                fontFamily: "'IBM Plex Mono', monospace", outline: "none",
              }}
            />
            <button onClick={() => { if (comment.trim()) { onAddComment(item.id, comment); setComment(""); } }} style={{
              background: `linear-gradient(135deg, ${typ.color}, ${typ.color}bb)`, border: "none", borderRadius: 10,
              padding: "10px 16px", color: "#fff", fontSize: 11, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
            }}>↵</button>
          </div>
        </div>
      )}

      {/* Delete */}
      {perms.includes("delete") && (
        <div style={{ padding: "0 24px 16px" }}>
          <button onClick={() => { onDelete(item.id); onClose(); }} style={{
            width: "100%", background: "#FF5A5F08", border: "1px solid #FF5A5F22", borderRadius: 10,
            padding: "10px", color: "#FF5A5F", fontSize: 11, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, transition: "all 0.2s",
          }}>Delete Item</button>
        </div>
      )}
    </div>
  );
}

/* ─── Create Modal ─── */
function CreateModal({ onClose, onCreate, items }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("story");
  const [priority, setPriority] = useState("medium");
  const [parentId, setParentId] = useState("");
  const [tags, setTags] = useState("");
  const [sprintId, setSprintId] = useState("");

  const possibleParents = items.filter(i => {
    if (type === "story") return i.type === "epic";
    if (type === "task") return i.type === "story";
    return false;
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(180deg, #151821 0%, #0d0f14 100%)", borderRadius: 18, padding: "32px 36px", width: 460,
        border: "1px solid #2a2f3d", fontFamily: "'IBM Plex Mono', monospace", boxShadow: "0 32px 100px rgba(0,0,0,0.7)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #2ECC71, #27AE60)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 20px #2ECC7133" }}>+</div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>New Node</h3>
        </div>

        {/* Type */}
        <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Type</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {Object.entries(ITEM_TYPES).map(([k, t]) => (
            <button key={k} onClick={() => { setType(k); setParentId(""); }} style={{
              flex: 1, padding: "10px", borderRadius: 10, background: type === k ? `${t.color}22` : "#0b0d12",
              border: `2px solid ${type === k ? t.color : "#1e2230"}`, color: type === k ? t.color : "#475569",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>

        {/* Title */}
        <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Carbon calculator module..." style={{
          width: "100%", background: "#0b0d12", border: "1px solid #1e2230", borderRadius: 10,
          padding: "12px 16px", color: "#e2e8f0", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace",
          outline: "none", marginBottom: 18, boxSizing: "border-box",
        }} />

        {/* Description */}
        <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="Describe what this node is about..." style={{
          width: "100%", background: "#0b0d12", border: "1px solid #1e2230", borderRadius: 10,
          padding: "12px 16px", color: "#e2e8f0", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
          outline: "none", resize: "vertical", marginBottom: 18, boxSizing: "border-box",
        }} />

        {/* Priority + Sprint row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Priority</label>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(PRIORITIES).map(([k, p]) => (
                <button key={k} onClick={() => setPriority(k)} style={{
                  flex: 1, padding: "8px", borderRadius: 8, background: priority === k ? `${p.color}22` : "#0b0d12",
                  border: `2px solid ${priority === k ? p.color : "#1e2230"}`, color: priority === k ? p.color : "#475569",
                  fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s",
                }}>{p.label}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Sprint</label>
            <select value={sprintId} onChange={e => setSprintId(e.target.value)} style={{
              width: "100%", background: "#0b0d12", border: "1px solid #1e2230", borderRadius: 8,
              padding: "9px 12px", color: "#94a3b8", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box",
            }}>
              <option value="">Unassigned</option>
              {SPRINTS.map(s => <option key={s.id} value={s.id}>{s.name.split("—")[0].trim()}</option>)}
            </select>
          </div>
        </div>

        {/* Parent + Tags row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {type !== "epic" && possibleParents.length > 0 && (
            <div style={{ flex: 1 }}>
              <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Connect to {type === "story" ? "Epic" : "Story"}</label>
              <select value={parentId} onChange={e => setParentId(e.target.value)} style={{
                width: "100%", background: "#0b0d12", border: "1px solid #1e2230", borderRadius: 8,
                padding: "9px 12px", color: "#94a3b8", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box",
              }}>
                <option value="">None</option>
                {possibleParents.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div style={{ flex: 1 }}>
            <label style={{ color: "#475569", fontSize: 10, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700 }}>Tags (comma separated)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="mvp, frontend..." style={{
              width: "100%", background: "#0b0d12", border: "1px solid #1e2230", borderRadius: 8,
              padding: "9px 12px", color: "#94a3b8", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", outline: "none", boxSizing: "border-box",
            }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", border: "1px solid #2a2f3d", borderRadius: 10,
            padding: "10px 24px", color: "#94a3b8", fontSize: 12, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
          }}>Cancel</button>
          <button onClick={() => { if (title.trim()) { onCreate({ title: title.trim(), description: desc.trim(), type, priority, parentId: parentId || null, column: "backlog", sprintId: sprintId || null, tags: tags.split(",").map(t => t.trim()).filter(Boolean) }); onClose(); } }} style={{
            background: "linear-gradient(135deg, #2ECC71, #27AE60)", border: "none", borderRadius: 10,
            padding: "10px 28px", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", boxShadow: "0 6px 20px rgba(46,204,113,0.3)",
          }}>Create Node</button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN APP ─── */
export default function CarbonFlow() {
  const [items, setItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState(null);
  const [currentRole, setCurrentRole] = useState("owner");
  const [showCreate, setShowCreate] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragItemId, setDragItemId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showConnections, setShowConnections] = useState(true);
  const [viewMode, setViewMode] = useState("board"); // board | list
  const [showSprints, setShowSprints] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const bubbleRefs = useRef({});
  const selectedItem = items.find(i => i.id === selectedId);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterPriority !== "all" && item.priority !== filterPriority) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || item.tags?.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [items, filterType, filterPriority, searchQuery]);

  const handleDragStart = (e, id) => { setDragItemId(id); e.dataTransfer.effectAllowed = "move"; };
  const handleDrop = (e, colId) => { e.preventDefault(); if (dragItemId) setItems(p => p.map(i => i.id === dragItemId ? { ...i, column: colId } : i)); setDragOverCol(null); setDragItemId(null); };
  const handleUpdate = (id, u) => setItems(p => p.map(i => i.id === id ? { ...i, ...u } : i));
  const handleAddComment = (id, text) => setItems(p => p.map(i => i.id === id ? { ...i, comments: [...i.comments, { author: currentRole, text, time: "Just now" }] } : i));
  const handleDelete = (id) => { setItems(p => p.filter(i => i.id !== id && i.parentId !== id)); setSelectedId(null); };
  const handleCreate = (n) => setItems(p => [...p, { ...n, id: `n_${Date.now()}`, assignee: null, comments: [], createdAt: "Today" }]);
  const handleAssignSprint = (id, sprintId) => setItems(p => p.map(i => i.id === id ? { ...i, sprintId } : i));

  const stats = useMemo(() => ({
    total: items.length,
    epics: items.filter(i => i.type === "epic").length,
    done: items.filter(i => i.column === "done").length,
    inProg: items.filter(i => i.column === "inprogress").length,
    highOpen: items.filter(i => i.priority === "high" && i.column !== "done").length,
    progress: items.length > 0 ? Math.round((items.filter(i => i.column === "done").length / items.length) * 100) : 0,
  }), [items]);

  return (
    <div style={{ minHeight: "100vh", background: "#0b0d12", fontFamily: "'IBM Plex Mono', monospace", color: "#e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2230; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #2a2f3d; }
        * { scrollbar-width: thin; scrollbar-color: #1e2230 transparent; }
      `}</style>

      <ParticlesBg />

      {/* ─── Header ─── */}
      <header style={{
        position: "relative", zIndex: 50,
        background: "linear-gradient(180deg, #0b0d12ee 0%, #0b0d12cc 100%)",
        backdropFilter: "blur(16px)", borderBottom: "1px solid #1a1e28",
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #2ECC71, #27AE60)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px rgba(46,204,113,0.3), inset 0 0 8px rgba(255,255,255,0.1)",
              fontSize: 14, color: "#fff", fontWeight: 800,
            }}>◉</div>
            <div>
              <h1 style={{
                margin: 0, fontSize: 15, fontWeight: 800, fontFamily: "'Sora', sans-serif",
                background: "linear-gradient(135deg, #2ECC71, #85EFAC)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}>CARBONFLOW</h1>
              <span style={{ fontSize: 8, color: "#334155", letterSpacing: 2.5, textTransform: "uppercase", fontWeight: 600 }}>Sustainability Backlog System</span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 8, paddingLeft: 20, borderLeft: "1px solid #1a1e28" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ProgressRing progress={stats.progress} size={36} stroke={3} color="#2ECC71" />
              <span style={{ position: "absolute", fontSize: 9, fontWeight: 800, color: "#2ECC71" }}>{stats.progress}%</span>
            </div>
            {[
              { label: "Total", val: stats.total, color: "#546A7B" },
              { label: "In Prog", val: stats.inProg, color: "#E6A817" },
              { label: "Done", val: stats.done, color: "#2ECC71" },
              { label: "Urgent", val: stats.highOpen, color: "#FF5A5F" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", minWidth: 40 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: "'Sora', sans-serif" }}>{s.val}</div>
                <div style={{ fontSize: 7, color: "#334155", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search nodes..."
              style={{
                width: 160, background: "#0d0f14", border: "1px solid #1e2230", borderRadius: 10,
                padding: "7px 12px 7px 30px", color: "#c8d1dc", fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace", outline: "none",
              }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#334155" }}>⌕</span>
          </div>

          {/* Filters */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{
            background: "#0d0f14", border: "1px solid #1e2230", borderRadius: 8, padding: "7px 10px",
            color: "#94a3b8", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", outline: "none",
          }}>
            <option value="all">All Types</option>
            {Object.entries(ITEM_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}s</option>)}
          </select>

          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{
            background: "#0d0f14", border: "1px solid #1e2230", borderRadius: 8, padding: "7px 10px",
            color: "#94a3b8", fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", outline: "none",
          }}>
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITIES).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>

          {/* View toggles */}
          <div style={{ display: "flex", background: "#0d0f14", borderRadius: 8, border: "1px solid #1e2230", overflow: "hidden" }}>
            {[{ id: "board", icon: "⬡" }, { id: "list", icon: "☰" }].map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)} style={{
                padding: "6px 12px", background: viewMode === v.id ? "#2ECC7118" : "transparent",
                border: "none", color: viewMode === v.id ? "#2ECC71" : "#334155",
                fontSize: 13, cursor: "pointer", transition: "all 0.2s",
              }}>{v.icon}</button>
            ))}
          </div>

          {/* Connection toggle */}
          <button onClick={() => setShowConnections(!showConnections)} style={{
            background: showConnections ? "#2ECC7112" : "#0d0f14",
            border: `1px solid ${showConnections ? "#2ECC7144" : "#1e2230"}`, borderRadius: 8,
            padding: "6px 12px", color: showConnections ? "#2ECC71" : "#334155",
            fontSize: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
          }}>{showConnections ? "◉" : "○"} Links</button>

          {/* Sprint toggle */}
          <button onClick={() => setShowSprints(!showSprints)} style={{
            background: showSprints ? "#4A90D912" : "#0d0f14",
            border: `1px solid ${showSprints ? "#4A90D944" : "#1e2230"}`, borderRadius: 8,
            padding: "6px 12px", color: showSprints ? "#4A90D9" : "#334155",
            fontSize: 10, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
          }}>⏱ Sprints</button>

          {/* Role */}
          <div style={{ display: "flex", background: "#0d0f14", borderRadius: 8, border: "1px solid #1e2230", overflow: "hidden" }}>
            {Object.entries(ROLES).map(([k, r]) => (
              <button key={k} onClick={() => setCurrentRole(k)} style={{
                padding: "6px 14px", background: currentRole === k ? `${r.color}15` : "transparent",
                border: "none", color: currentRole === k ? r.color : "#334155",
                fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                borderRight: k === "owner" ? "1px solid #1e2230" : "none",
              }}>{r.short}</button>
            ))}
          </div>

          {/* Create */}
          {ROLES[currentRole].permissions.includes("create") && (
            <button onClick={() => setShowCreate(true)} style={{
              background: "linear-gradient(135deg, #2ECC71, #27AE60)", border: "none", borderRadius: 10,
              padding: "8px 18px", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", boxShadow: "0 4px 16px rgba(46,204,113,0.3)",
              display: "flex", alignItems: "center", gap: 6, letterSpacing: "-0.3px",
            }}><span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Node</button>
          )}
        </div>
      </header>

      {/* ─── Body ─── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Sprint sidebar */}
        {showSprints && (
          <SprintSidebar items={items} sprints={SPRINTS} onClose={() => setShowSprints(false)} onAssignSprint={handleAssignSprint} currentRole={currentRole} />
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
          {viewMode === "board" ? (
            <div data-board style={{
              display: "flex", gap: 0, padding: "16px 12px", minHeight: "calc(100vh - 72px)", position: "relative",
            }}>
              {showConnections && <ConnectionLines items={filtered} bubbleRefs={bubbleRefs} />}

              {COLUMNS.map(col => {
                const colItems = filtered.filter(i => i.column === col.id);
                const isOver = dragOverCol === col.id;
                return (
                  <div key={col.id}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => handleDrop(e, col.id)}
                    style={{
                      flex: 1, minWidth: 140, display: "flex", flexDirection: "column",
                      borderRight: col.id !== "done" ? "1px solid #12141a" : "none",
                      background: isOver ? `${col.color}06` : "transparent",
                      transition: "background 0.3s", position: "relative", zIndex: 1,
                    }}
                  >
                    {/* Column header */}
                    <div style={{ padding: "8px 12px 14px", textAlign: "center", position: "sticky", top: 0, zIndex: 2 }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        background: `${col.color}0c`, padding: "6px 16px", borderRadius: 20,
                        border: `1px solid ${col.color}22`,
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: col.color, boxShadow: `0 0 8px ${col.color}55` }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: col.color, textTransform: "uppercase", letterSpacing: 2 }}>{col.label}</span>
                        <span style={{
                          fontSize: 10, color: "#0b0d12", fontWeight: 800,
                          background: col.color, borderRadius: "50%", width: 18, height: 18,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{colItems.length}</span>
                      </div>
                    </div>

                    {/* Bubbles */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "0 6px", overflowY: "auto" }}>
                      {colItems
                        .sort((a, b) => {
                          const p = { high: 0, medium: 1, low: 2 }; const t = { epic: 0, story: 1, task: 2 };
                          return p[a.priority] - p[b.priority] || t[a.type] - t[b.type];
                        })
                        .map(item => (
                          <div key={item.id} ref={el => { if (el) bubbleRefs.current[item.id] = el; }}>
                            <Bubble item={item} items={items} isSelected={selectedId === item.id}
                              onClick={setSelectedId} onDragStart={handleDragStart} isDragging={dragItemId === item.id} />
                          </div>
                        ))}
                      {colItems.length === 0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, opacity: 0.2 }}>
                          <div style={{ width: 36, height: 36, borderRadius: "50%", border: `2px dashed ${col.color}44` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <BacklogList items={filtered} onSelect={setSelectedId} selectedId={selectedId} currentRole={currentRole} onUpdate={handleUpdate} />
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedItem && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 99 }} onClick={() => setSelectedId(null)} />
          <DetailPanel item={selectedItem} items={items} onClose={() => setSelectedId(null)} onUpdate={handleUpdate}
            onAddComment={handleAddComment} onDelete={handleDelete} currentRole={currentRole} sprints={SPRINTS} />
        </>
      )}

      {/* Create modal */}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} items={items} />}

      {/* Legend */}
      <div style={{
        position: "fixed", bottom: 14, left: showSprints ? 336 : 14,
        display: "flex", gap: 14, background: "#10131aee", backdropFilter: "blur(12px)",
        padding: "10px 18px", borderRadius: 14, border: "1px solid #1a1e28", zIndex: 50,
        transition: "left 0.3s",
      }}>
        {Object.entries(ITEM_TYPES).map(([k, t]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: `${t.ring}px solid ${t.color}88`, background: `${t.color}18` }} />
            <span style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>{t.label}</span>
          </div>
        ))}
        <div style={{ width: 1, background: "#1e2230" }} />
        {Object.entries(PRIORITIES).map(([k, p]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: p.size / 7, height: p.size / 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 4px ${p.color}55` }} />
            <span style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>{p.label}</span>
          </div>
        ))}
        <div style={{ width: 1, background: "#1e2230" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 3, background: "#4A90D9", borderRadius: 2 }} />
          <span style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>Connection</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="16" height="8"><circle cx="8" cy="4" r="3" fill="none" stroke="#2ECC71" strokeWidth="1.5" /></svg>
          <span style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>Progress</span>
        </div>
      </div>
    </div>
  );
}
