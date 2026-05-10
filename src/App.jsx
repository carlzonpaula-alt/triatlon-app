import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "triathlon-couple-countdown-v4";
const ATHLETES = ["Paula", "Kuba"];
const COLORS = {
  Paula: "bg-violet-100 border-violet-300 text-violet-900",
  Kuba: "bg-emerald-100 border-emerald-300 text-emerald-900",
};

function id() {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function toDate(s) {
  return new Date(`${s}T00:00:00`);
}
function dateString(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function weekStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
function daysLeft(target) {
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((toDate(target) - now) / 86400000);
}
function monthString() {
  return today().slice(0, 7);
}
function calendarDays(month) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const blanks = (first.getDay() + 6) % 7;
  const days = Array.from({ length: blanks }, () => ({ date: null, day: "" }));
  for (let d = 1; d <= last.getDate(); d++) {
    days.push({ date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d });
  }
  while (days.length % 7) days.push({ date: null, day: "" });
  return days;
}
function weekDays(start) {
  const s = weekStart(toDate(start));
  return ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].map((label, i) => {
    const d = addDays(s, i);
    return { label, date: dateString(d), day: d.getDate() };
  });
}
function icon(sport) {
  return { Simning: "🏊", Cykel: "🚴", Löpning: "🏃", Brickpass: "🔥", Styrka: "🏋️", Rörlighet: "🧘" }[sport] || "✨";
}
function color(name) {
  return COLORS[name] || "bg-slate-100 border-slate-300 text-slate-900";
}
function loadScore(intensity) {
  return { Återhämtning: 10, Lugn: 20, Medel: 30, Hård: 40, Intervall: 50 }[intensity] || 20;
}
function isDone(w) {
  return w.status === "Genomfört";
}
function distanceText(w) {
  if (w.sport === "Brickpass") return [w.swimDistance && `🏊 ${w.swimDistance} m`, w.bikeDistance && `🚴 ${w.bikeDistance} km`, w.runDistance && `🏃 ${w.runDistance} km`].filter(Boolean).join(" · ") || "Ingen distans";
  if (!w.distance) return "Ingen distans";
  return `${w.distance} ${w.distanceUnit || (w.sport === "Simning" ? "m" : "km")}`;
}
function kmFor(w, sport) {
  if (w.sport === sport) {
    if (sport === "Simning" && w.distanceUnit === "m") return Number(w.distance || 0) / 1000;
    return Number(w.distance || 0);
  }
  if (w.sport !== "Brickpass") return 0;
  if (sport === "Simning") return Number(w.swimDistance || 0) / 1000;
  if (sport === "Cykel") return Number(w.bikeDistance || 0);
  if (sport === "Löpning") return Number(w.runDistance || 0);
  return 0;
}
function fmt(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const emptyForm = {
  athlete: "Paula",
  date: today(),
  sport: "Löpning",
  status: "Genomfört",
  distance: "",
  distanceUnit: "km",
  brickType: "Cykla + springa",
  swimDistance: "",
  bikeDistance: "",
  runDistance: "",
  duration: "",
  intensity: "Lugn",
  feeling: "",
  notes: "",
};

const demo = [
  { ...emptyForm, id: id(), athlete: "Paula", sport: "Löpning", distance: "5", duration: "28 min", feeling: "Bra" },
  { ...emptyForm, id: id(), athlete: "Kuba", sport: "Cykel", status: "Planerat", distance: "25", duration: "1 h", intensity: "Medel" },
];

export default function App() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; } })();
  const [goal, setGoal] = useState(saved?.goal || "Triatlon tillsammans");
  const [goalDate, setGoalDate] = useState(saved?.goalDate || "2026-07-01");
  const [workouts, setWorkouts] = useState(saved?.workouts || demo);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("Månad");
  const [month, setMonth] = useState(monthString());
  const [week, setWeek] = useState(dateString(weekStart(new Date())));

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify({ goal, goalDate, workouts })), [goal, goalDate, workouts]);

  const byDate = useMemo(() => workouts.reduce((acc, w) => ({ ...acc, [w.date]: [...(acc[w.date] || []), w] }), {}), [workouts]);
  const done = workouts.filter(isDone);
  const planned = workouts.filter(w => w.status === "Planerat");
  const dLeft = daysLeft(goalDate);
  const currentWeekDays = weekDays(week);
  const weekSet = new Set(currentWeekDays.map(d => d.date));
  const weekDone = workouts.filter(w => weekSet.has(w.date) && isDone(w));
  const weekPlanned = workouts.filter(w => weekSet.has(w.date) && w.status === "Planerat");
  const weekLoad = weekDone.reduce((sum, w) => sum + loadScore(w.intensity), 0);
  const loadLabel = weekLoad >= 220 ? "Hög belastning" : weekLoad >= 130 ? "Bra träningsvecka" : "Lugn vecka";
  const loadClass = weekLoad >= 220 ? "bg-red-50 border-red-200 text-red-900" : weekLoad >= 130 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-green-50 border-green-200 text-green-900";

  function save(e) {
    e.preventDefault();
    const totalBrick = Number(form.swimDistance || 0) / 1000 + Number(form.bikeDistance || 0) + Number(form.runDistance || 0);
    const item = { ...form, id: editing || id(), distance: form.sport === "Brickpass" ? String(totalBrick) : form.distance };
    setWorkouts(editing ? workouts.map(w => w.id === editing ? item : w) : [item, ...workouts]);
    setEditing(null); setSelected(null); setForm({ ...emptyForm, athlete: form.athlete });
  }
  function edit(w) {
    setEditing(w.id); setSelected(w.id); setForm({ ...emptyForm, ...w, distance: w.sport === "Brickpass" ? "" : w.distance || "" });
    setTimeout(() => document.getElementById("form")?.scrollIntoView({ behavior: "smooth" }), 0);
  }
  function drop(e, date) {
    e.preventDefault();
    const wid = e.dataTransfer.getData("workoutId");
    if (wid && date) setWorkouts(workouts.map(w => w.id === wid ? { ...w, date } : w));
  }
  function exportData() {
    navigator.clipboard?.writeText(JSON.stringify({ goal, goalDate, workouts }, null, 2));
    alert("Data kopierad!");
  }
  function importData() {
    const txt = prompt("Klistra in exporterad data:");
    if (!txt) return;
    try { const p = JSON.parse(txt); setGoal(p.goal || goal); setGoalDate(p.goalDate || goalDate); setWorkouts(p.workouts || workouts); } catch { alert("Kunde inte läsa datan."); }
  }

  const sports = ["Simning", "Cykel", "Löpning", "Brickpass", "Styrka", "Rörlighet"];

  return <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl bg-white p-6 shadow-sm md:p-8 flex flex-col gap-4 md:flex-row md:justify-between">
      <div><div className="text-sm text-slate-500">🏊‍♀️🚴‍♀️🏃‍♀️ Triatlonkalender för två</div><h1 className="text-4xl font-black md:text-6xl">{goal}</h1><p className="mt-3 text-slate-600">Planera pass, markera genomfört och följ Paula & Kuba.</p><div className="mt-4 flex gap-2"><span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-violet-900">Paula</span><span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-900">Kuba</span><span className="rounded-full border border-dashed border-slate-400 px-3 py-1">Streckad = planerat</span></div></div>
      <div className="rounded-3xl bg-slate-900 p-6 text-center text-white"><p>Dagar kvar</p><p className="text-5xl font-black">{dLeft ?? "—"}</p><p>{dLeft !== null ? `${Math.ceil(dLeft / 7)} veckor kvar` : ""}</p></div>
    </header>

    <section className="grid gap-4 md:grid-cols-4">
      <Card title="Tävling/mål" wide><input value={goal} onChange={e=>setGoal(e.target.value)} className="input"/><p className="mt-3 text-sm text-slate-500">Måldatum</p><input type="date" value={goalDate} onChange={e=>setGoalDate(e.target.value)} className="input"/></Card>
      <Card title="Översikt"><p className="text-3xl font-black">{done.length}</p><p>genomförda</p><p>{planned.length} planerade</p><button onClick={exportData} className="btn mt-3">Exportera</button><button onClick={importData} className="btn2 mt-2">Importera</button></Card>
      <Card title="Denna valda vecka"><div className={`rounded-2xl border p-3 ${loadClass}`}><b>{loadLabel}</b><p>Belastning {weekLoad}</p><p>{weekDone.length} gjorda · {weekPlanned.length} planerade</p></div></Card>
    </section>

    <section className="grid gap-4 md:grid-cols-2">{ATHLETES.map(a => <div key={a} className={`rounded-3xl border p-5 ${color(a)}`}><h2 className="text-xl font-bold">{a}</h2><p>{done.filter(w=>w.athlete===a).length} genomförda pass</p><div className="mt-4 grid grid-cols-3 gap-2 text-center"><Stat icon="🏊" label="sim" value={`${fmt(done.filter(w=>w.athlete===a).reduce((s,w)=>s+kmFor(w,"Simning"),0))} km`}/><Stat icon="🚴" label="cykel" value={`${fmt(done.filter(w=>w.athlete===a).reduce((s,w)=>s+kmFor(w,"Cykel"),0))} km`}/><Stat icon="🏃" label="löp" value={`${fmt(done.filter(w=>w.athlete===a).reduce((s,w)=>s+kmFor(w,"Löpning"),0))} km`}/></div></div>)}</section>

    <section className="rounded-3xl bg-white p-5 shadow-sm"><div className="mb-4 flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">Kalender</h2><p className="text-sm text-slate-500">Dra planerade pass mellan dagar. Klicka för att redigera.</p></div><div className="flex gap-2"><button className={view==="Månad"?"btn":"btn2"} onClick={()=>setView("Månad")}>Månad</button><button className={view==="Vecka"?"btn":"btn2"} onClick={()=>setView("Vecka")}>Vecka</button>{view==="Månad"?<input type="month" className="input" value={month} onChange={e=>setMonth(e.target.value)}/>:<><button className="btn2" onClick={()=>setWeek(dateString(addDays(toDate(week),-7)))}>←</button><input type="date" className="input" value={week} onChange={e=>setWeek(dateString(weekStart(toDate(e.target.value))))}/><button className="btn2" onClick={()=>setWeek(dateString(addDays(toDate(week),7)))}>→</button></>}</div></div>
      {view==="Månad" ? <><div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">{["Mån","Tis","Ons","Tor","Fre","Lör","Sön"].map(d=><div key={d}>{d}</div>)}</div><div className="mt-2 grid grid-cols-7 gap-2">{calendarDays(month).map((d,i)=><Day key={i} day={d} items={byDate[d.date]||[]} edit={edit} drop={drop} selected={selected}/>)}</div></> : <div className="grid gap-3 md:grid-cols-7">{currentWeekDays.map(d=><Day key={d.date} day={d} week items={byDate[d.date]||[]} edit={edit} drop={drop} selected={selected}/>)}</div>}
    </section>

    <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]"><div id="form" className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold">{editing?"Ändra pass":"Lägg till pass"}</h2><form onSubmit={save} className="space-y-3">
      <Select label="Paula eller Kuba?" value={form.athlete} onChange={v=>setForm({...form,athlete:v})} options={ATHLETES}/><Select label="Planerat eller genomfört?" value={form.status} onChange={v=>setForm({...form,status:v})} options={["Genomfört","Planerat"]}/><label className="label">Datum<input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><Select label="Gren" value={form.sport} onChange={v=>setForm({...form,sport:v,distanceUnit:v==="Simning"?"m":"km"})} options={sports}/>
      {form.sport!=="Brickpass"?<label className="label">Distans<div className="flex gap-2"><input className="input" type="number" step="0.1" value={form.distance} onChange={e=>setForm({...form,distance:e.target.value})}/><select className="input max-w-24" value={form.distanceUnit} onChange={e=>setForm({...form,distanceUnit:e.target.value})}><option>km</option><option>m</option></select></div></label>:<div className="rounded-2xl bg-slate-50 p-4 space-y-3"><Select label="Typ av brickpass" value={form.brickType} onChange={v=>setForm({...form,brickType:v})} options={["Simma + löpa","Simma + cykla","Cykla + springa"]}/>{form.brickType!=="Cykla + springa"&&<label className="label">Simning (m)<input className="input" type="number" value={form.swimDistance} onChange={e=>setForm({...form,swimDistance:e.target.value})}/></label>}{form.brickType!=="Simma + löpa"&&<label className="label">Cykling (km)<input className="input" type="number" value={form.bikeDistance} onChange={e=>setForm({...form,bikeDistance:e.target.value})}/></label>}{form.brickType!=="Simma + cykla"&&<label className="label">Löpning (km)<input className="input" type="number" value={form.runDistance} onChange={e=>setForm({...form,runDistance:e.target.value})}/></label>}</div>}
      <label className="label">Tid<input className="input" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} placeholder="45 min"/></label><Select label="Intensitet" value={form.intensity} onChange={v=>setForm({...form,intensity:v})} options={["Återhämtning","Lugn","Medel","Hård","Intervall"]}/><label className="label">Känsla<input className="input" value={form.feeling} onChange={e=>setForm({...form,feeling:e.target.value})}/></label><label className="label">Anteckning<textarea className="input min-h-24" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><button className="btn w-full py-4">{editing?"Spara ändringar":"+ Lägg till pass"}</button>{editing&&<button type="button" onClick={()=>{setEditing(null);setSelected(null);setForm(emptyForm)}} className="btn2 w-full py-4">Avbryt</button>}
    </form></div><div className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-bold">Gemensam träningslogg</h2><div className="space-y-3">{workouts.sort((a,b)=>b.date.localeCompare(a.date)).map(w=><div key={w.id} className={`rounded-2xl border p-4 ${color(w.athlete)} ${w.status==="Planerat"?"border-dashed opacity-80":""}`}><p className="text-sm">{w.date} · {w.athlete} · {w.status}</p><h3 className="font-bold">{icon(w.sport)} {w.sport}</h3><p>{distanceText(w)} · {w.duration||"Ingen tid"}</p>{w.notes&&<p className="mt-2 rounded-xl bg-white/70 p-2 text-sm">{w.notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><button className="btn2" onClick={()=>edit(w)}>Ändra</button><button className="btn2" onClick={()=>setWorkouts(workouts.map(x=>x.id===w.id?{...x,status:x.status==="Planerat"?"Genomfört":"Planerat"}:x))}>{w.status==="Planerat"?"Klart":"Plan"}</button><button className="btn2" onClick={()=>setWorkouts([{...w,id:id(),date:dateString(addDays(toDate(w.date),7)),status:"Planerat"},...workouts])}>Kopiera +1v</button><button className="btn2" onClick={()=>setWorkouts(workouts.filter(x=>x.id!==w.id))}>🗑️</button></div></div>)}</div></div></section>
  </div></div>;
}

function Card({ title, children, wide }) { return <div className={`rounded-3xl bg-white p-5 shadow-sm ${wide?"md:col-span-2":""}`}><p className="mb-2 text-sm text-slate-500">{title}</p>{children}</div>; }
function Stat({ icon, label, value }) { return <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">{icon}</p><p className="font-bold">{value}</p><p className="text-xs">{label}</p></div>; }
function Select({ label, value, onChange, options }) { return <label className="label">{label}<select className="input" value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>; }
function Day({ day, items, edit, drop, selected, week }) { return <div onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,day.date)} className={`${week?"min-h-40":"min-h-28"} rounded-2xl border border-slate-200 bg-white p-2 hover:bg-slate-50`}><div className="mb-2 text-sm font-bold">{week ? `${day.label} ${day.day}` : day.day}</div><div className="space-y-1">{items.map(w=><button key={w.id} draggable={w.status==="Planerat"} onDragStart={e=>e.dataTransfer.setData("workoutId",w.id)} onClick={()=>edit(w)} className={`block w-full cursor-grab rounded-xl border px-2 py-1 text-left text-[11px] ${color(w.athlete)} ${w.status==="Planerat"?"border-dashed opacity-70":""} ${selected===w.id?"ring-2 ring-slate-900":""}`}><b>{icon(w.sport)} {w.athlete}</b><br/>{w.sport}{w.status==="Planerat"?" · plan":""}</button>)}</div></div>; }
