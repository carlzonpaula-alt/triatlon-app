import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zwzevqkrxszfbdetxjcw.supabase.co",
  "sb_publishable_OiueoTMEhWaBs0b8tQGgvQ_sJNlUT_K"
);

const ATHLETES = ["Paula", "Kuba"];
const SPORTS = ["Simning", "Cykel", "Löpning", "Brickpass", "Styrka", "Rörlighet"];
const WEEK_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function todayDateString() {
  return dateString(new Date());
}

function monthString(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function toDate(value) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day || 1);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function weekStart(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const mondayBased = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - mondayBased);
  return copy;
}

function daysBetween(targetDate, now = new Date()) {
  if (!targetDate) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = toDate(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function getWeekDays(startDateString) {
  const start = weekStart(toDate(startDateString));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: dateString(date),
      label: WEEK_LABELS[index],
      dayNumber: date.getDate(),
    };
  });
}

function getCalendarDays(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const mondayBasedStart = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let i = 0; i < mondayBasedStart; i += 1) {
    days.push({ date: null, dayNumber: "" });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push({
      date: `${year}-${pad2(month)}-${pad2(day)}`,
      dayNumber: day,
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: null, dayNumber: "" });
  }

  return days;
}

function isDone(workout) {
  return workout.status === "Genomfört";
}

function intensityScore(intensity) {
  if (intensity === "Återhämtning") return 1;
  if (intensity === "Lugn") return 2;
  if (intensity === "Medel") return 3;
  if (intensity === "Hård") return 4;
  if (intensity === "Intervall") return 5;
  return 2;
}

function trainingLoad(workout) {
  if (!isDone(workout)) return 0;
  return intensityScore(workout.intensity) * 10;
}

function sortWorkoutsNewestFirst(workouts) {
  return [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getDistance(workout, sport) {
  if (!isDone(workout)) return 0;
  if (workout.sport === sport) return Number(workout.distance || 0);
  if (workout.sport !== "Brickpass") return 0;
  if (sport === "Simning") return Number(workout.swimDistance || 0);
  if (sport === "Cykel") return Number(workout.bikeDistance || 0);
  if (sport === "Löpning") return Number(workout.runDistance || 0);
  return 0;
}

function totalsByAthlete(workouts, athletes) {
  return athletes.map((athlete) => {
    const own = workouts.filter((workout) => workout.athlete === athlete && isDone(workout));
    return {
      athlete,
      total: own.length,
      swimKm: own.reduce((sum, workout) => sum + getDistance(workout, "Simning"), 0),
      bikeKm: own.reduce((sum, workout) => sum + getDistance(workout, "Cykel"), 0),
      runKm: own.reduce((sum, workout) => sum + getDistance(workout, "Löpning"), 0),
      brickKm: own.filter((workout) => workout.sport === "Brickpass").reduce((sum, workout) => sum + Number(workout.distance || 0), 0),
      load: own.reduce((sum, workout) => sum + trainingLoad(workout), 0),
    };
  });
}

function findLongest(workouts, sport) {
  let best = null;
  for (const workout of workouts.filter(isDone)) {
    const distance = getDistance(workout, sport);
    if (distance > 0 && (!best || distance > best.distance)) {
      best = { ...workout, distance };
    }
  }
  return best;
}

function numberText(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatDistance(workout, value) {
  if (!value) return "Ingen distans";
  const unit = workout.distanceUnit || (workout.sport === "Simning" ? "m" : "km");
  return `${value} ${unit}`;
}

function sportIcon(sport) {
  if (sport === "Simning") return "🏊";
  if (sport === "Cykel") return "🚴";
  if (sport === "Löpning") return "🏃";
  if (sport === "Brickpass") return "🔥";
  if (sport === "Styrka") return "🏋️";
  if (sport === "Rörlighet") return "🧘";
  return "✨";
}

function athleteClass(name) {
  if (name === "Paula") return "bg-violet-100 border-violet-300 text-violet-900";
  if (name === "Kuba") return "bg-emerald-100 border-emerald-300 text-emerald-900";
  return "bg-slate-100 border-slate-300 text-slate-900";
}

function loadMessage(load) {
  if (load >= 220) return { label: "Hög belastning", text: "Planera extra återhämtning.", className: "bg-red-50 border-red-200 text-red-900" };
  if (load >= 130) return { label: "Bra träningsvecka", text: "Lagom mycket volym.", className: "bg-amber-50 border-amber-200 text-amber-900" };
  return { label: "Lugn vecka", text: "Bra för återhämtning eller uppbyggnad.", className: "bg-green-50 border-green-200 text-green-900" };
}

function normalizeWorkoutFromDb(workout) {
  return {
    ...workout,
    distanceUnit: workout.distance_unit || workout.distanceUnit || (workout.sport === "Simning" ? "m" : "km"),
    brickType: workout.brick_type || workout.brickType || "Cykla + springa",
    swimDistance: workout.swim_distance || workout.swimDistance || "",
    bikeDistance: workout.bike_distance || workout.bikeDistance || "",
    runDistance: workout.run_distance || workout.runDistance || "",
  };
}

function workoutToDb(workout) {
  return {
    id: workout.id,
    athlete: workout.athlete || "",
    date: workout.date || "",
    sport: workout.sport || "",
    status: workout.status || "Genomfört",
    distance: workout.distance || "",
    distance_unit: workout.distanceUnit || workout.distance_unit || "km",
    duration: workout.duration || "",
    intensity: workout.intensity || "Lugn",
    feeling: workout.feeling || "",
    notes: workout.notes || "",
    brick_type: workout.brickType || workout.brick_type || "",
    swim_distance: workout.swimDistance || workout.swim_distance || "",
    bike_distance: workout.bikeDistance || workout.bike_distance || "",
    run_distance: workout.runDistance || workout.run_distance || "",
  };
}

function runTests() {
  console.assert(getWeekDays("2026-05-16")[0].date === "2026-05-11", "Veckovy börjar på måndag");
  console.assert(getWeekDays("2026-05-16")[5].date === "2026-05-16", "Veckovy visar rätt lördag");
  console.assert(getCalendarDays("2026-05").some((day) => day.date === "2026-05-16"), "Månadsvy innehåller rätt datum");
  console.assert(daysBetween("2026-01-10", new Date("2026-01-01T12:00:00")) === 9, "Countdown räknar dagar");
}

runTests();

export default function TrainingCountdownApp() {
  const [goalName, setGoalName] = useState("Triatlon tillsammans");
  const [goalDate, setGoalDate] = useState("2026-07-01");
  const [athletes] = useState(ATHLETES);
  const [workouts, setWorkouts] = useState([]);
  const [syncStatus, setSyncStatus] = useState("Laddar synk...");
  const [selectedMonth, setSelectedMonth] = useState(monthString());
  const [selectedWeekStart, setSelectedWeekStart] = useState(dateString(weekStart(new Date())));
  const [viewMode, setViewMode] = useState("Månad");
  const [editingId, setEditingId] = useState(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);
  const [form, setForm] = useState({
    athlete: "Paula",
    date: todayDateString(),
    sport: "Löpning",
    status: "Genomfört",
    brickType: "Cykla + springa",
    swimDistance: "",
    bikeDistance: "",
    runDistance: "",
    distance: "",
    distanceUnit: "km",
    duration: "",
    intensity: "Lugn",
    feeling: "",
    notes: "",
  });

  useEffect(() => {
    loadWorkoutsFromSupabase();

    const channel = supabase
      .channel("workouts-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "workouts" }, () => loadWorkoutsFromSupabase())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadWorkoutsFromSupabase() {
    setSyncStatus("Synkar...");
    const { data, error } = await supabase.from("workouts").select("*").order("date", { ascending: false });
    if (error) {
      console.error(error);
      setSyncStatus("Synkfel");
      return;
    }
    setWorkouts((data || []).map(normalizeWorkoutFromDb));
    setSyncStatus("Synkad");
  }

  async function upsertWorkoutToSupabase(workout) {
    const { error } = await supabase.from("workouts").upsert([workoutToDb(workout)]);
    if (error) {
      console.error(error);
      alert("Kunde inte spara till Supabase. Kontrollera tabellen workouts.");
      setSyncStatus("Synkfel");
      return false;
    }
    await loadWorkoutsFromSupabase();
    return true;
  }

  async function deleteWorkoutFromSupabase(id) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Kunde inte radera från Supabase.");
      setSyncStatus("Synkfel");
      return false;
    }
    await loadWorkoutsFromSupabase();
    return true;
  }

  const daysLeft = daysBetween(goalDate);
  const raceWeeksLeft = daysLeft === null ? null : Math.ceil(daysLeft / 7);

  const stats = useMemo(() => {
    const done = workouts.filter(isDone);
    const planned = workouts.filter((workout) => workout.status === "Planerat");
    const sportTotals = SPORTS.map((sport) => ({
      sport,
      count: done.filter((workout) => workout.sport === sport).length,
      distance: done.reduce((sum, workout) => sum + getDistance(workout, sport), 0),
    }));
    return {
      doneCount: done.length,
      plannedCount: planned.length,
      latest: sortWorkoutsNewestFirst(workouts)[0],
      perAthlete: totalsByAthlete(workouts, athletes),
      sportTotals,
      prs: {
        swim: findLongest(workouts, "Simning"),
        bike: findLongest(workouts, "Cykel"),
        run: findLongest(workouts, "Löpning"),
      },
    };
  }, [workouts, athletes]);

  const calendarDays = useMemo(() => getCalendarDays(selectedMonth), [selectedMonth]);
  const weekDays = useMemo(() => getWeekDays(selectedWeekStart), [selectedWeekStart]);
  const workoutsByDate = useMemo(() => {
    return workouts.reduce((grouped, workout) => {
      grouped[workout.date] = grouped[workout.date] || [];
      grouped[workout.date].push(workout);
      return grouped;
    }, {});
  }, [workouts]);

  const weekStats = useMemo(() => {
    const weekDates = new Set(weekDays.map((day) => day.date));
    const weekWorkouts = workouts.filter((workout) => weekDates.has(workout.date));
    const done = weekWorkouts.filter(isDone);
    const planned = weekWorkouts.filter((workout) => workout.status === "Planerat");
    const load = done.reduce((sum, workout) => sum + trainingLoad(workout), 0);
    return { done, planned, load, message: loadMessage(load) };
  }, [workouts, weekDays]);

  function resetForm(keepAthlete = form.athlete) {
    setEditingId(null);
    setSelectedWorkoutId(null);
    setForm({
      athlete: keepAthlete,
      date: todayDateString(),
      sport: "Löpning",
      status: "Genomfört",
      brickType: "Cykla + springa",
      swimDistance: "",
      bikeDistance: "",
      runDistance: "",
      distance: "",
      distanceUnit: "km",
      duration: "",
      intensity: "Lugn",
      feeling: "",
      notes: "",
    });
  }

  async function saveWorkout(event) {
    event.preventDefault();
    if (!form.date || !form.athlete || !form.sport) return;

    const totalBrickDistance = Number(form.swimDistance || 0) + Number(form.bikeDistance || 0) + Number(form.runDistance || 0);
    const workout = {
      id: editingId || makeId(),
      ...form,
      distance: form.sport === "Brickpass" ? String(totalBrickDistance) : form.distance,
    };

    const ok = await upsertWorkoutToSupabase(workout);
    if (ok) resetForm(form.athlete);
  }

  function scrollToForm() {
    const element = document.getElementById("workout-form");
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editWorkout(workout) {
    setEditingId(workout.id);
    setSelectedWorkoutId(workout.id);
    setForm({
      athlete: workout.athlete || "Paula",
      date: workout.date || todayDateString(),
      sport: workout.sport || "Löpning",
      status: workout.status || "Genomfört",
      brickType: workout.brickType || "Cykla + springa",
      swimDistance: workout.swimDistance || "",
      bikeDistance: workout.bikeDistance || "",
      runDistance: workout.runDistance || "",
      distance: workout.sport === "Brickpass" ? "" : workout.distance || "",
      distanceUnit: workout.distanceUnit || (workout.sport === "Simning" ? "m" : "km"),
      duration: workout.duration || "",
      intensity: workout.intensity || "Lugn",
      feeling: workout.feeling || "",
      notes: workout.notes || "",
    });
    scrollToForm();
  }

  async function toggleStatus(id) {
    const workout = workouts.find((item) => item.id === id);
    if (!workout) return;
    await upsertWorkoutToSupabase({ ...workout, status: workout.status === "Genomfört" ? "Planerat" : "Genomfört" });
  }

  async function duplicateWorkout(workout) {
    const nextWeek = dateString(addDays(toDate(workout.date), 7));
    await upsertWorkoutToSupabase({ ...workout, id: makeId(), date: nextWeek, status: "Planerat" });
  }

  async function removeWorkout(id) {
    await deleteWorkoutFromSupabase(id);
  }

  async function clearAll() {
    if (!confirm("Vill du rensa alla pass från Supabase?")) return;
    const { error } = await supabase.from("workouts").delete().neq("id", "");
    if (error) {
      console.error(error);
      alert("Kunde inte rensa loggen.");
      return;
    }
    await loadWorkoutsFromSupabase();
  }

  function shiftWeek(days) {
    setSelectedWeekStart(dateString(addDays(toDate(selectedWeekStart), days)));
  }

  async function moveWorkoutToDate(workoutId, newDate) {
    const workout = workouts.find((item) => item.id === workoutId);
    if (!workout || !newDate) return;
    await upsertWorkoutToSupabase({ ...workout, date: newDate });
  }

  function handleDrop(event, date) {
    event.preventDefault();
    const workoutId = event.dataTransfer.getData("workoutId");
    if (!workoutId || !date) return;
    moveWorkoutToDate(workoutId, date);
  }

  function allowDrop(event) {
    event.preventDefault();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 pb-24 text-slate-900 md:p-8 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header id="top" className="rounded-3xl bg-white p-4 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">🏊‍♀️🚴‍♀️🏃‍♀️ Triatlonkalender för två</div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">{goalName}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">Planera pass, markera genomfört och följ Paula & Kuba.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-violet-900">Paula</span>
                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-900">Kuba</span>
                <span className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-slate-600">Streckad = planerat</span>
                <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-900">{syncStatus}</span>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-900 p-5 text-center text-white shadow-sm md:p-6">
              <p className="text-sm text-slate-300">Dagar kvar till tävling</p>
              <p className="text-4xl font-black md:text-5xl">{daysLeft ?? "—"}</p>
              <p className="mt-1 text-sm text-slate-300">{raceWeeksLeft !== null ? `${raceWeeksLeft} veckor kvar` : goalDate}</p>
            </div>
          </div>
        </header>

        <section id="overview" className="grid gap-3 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-sm text-slate-500">Tävling/mål</p>
            <input value={goalName} onChange={(event) => setGoalName(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Måldatum</p>
            <input type="date" value={goalDate} onChange={(event) => setGoalDate(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-slate-400" />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Översikt</p>
            <p className="mt-2 text-3xl font-black">{stats.doneCount}</p>
            <p className="text-sm text-slate-600">genomförda pass</p>
            <p className="mt-1 text-sm text-slate-600">{stats.plannedCount} planerade pass</p>
          </div>

          <div className={`rounded-3xl border p-5 shadow-sm ${weekStats.message.className}`}>
            <p className="text-sm opacity-80">Denna valda vecka</p>
            <h2 className="mt-1 text-xl font-black">{weekStats.message.label}</h2>
            <p className="mt-1 text-sm">Belastning {weekStats.load}</p>
            <p className="text-sm">{weekStats.done.length} gjorda · {weekStats.planned.length} planerade</p>
          </div>
        </section>

        <section id="people" className="grid gap-3 md:grid-cols-2">
          {stats.perAthlete.map((person) => (
            <div key={person.athlete} className={`rounded-3xl border p-5 shadow-sm ${athleteClass(person.athlete)}`}>
              <h2 className="text-xl font-bold">{person.athlete}</h2>
              <p className="mt-1 text-sm">{person.total} genomförda pass · belastning {person.load}</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🏊</p><p className="font-bold">{numberText(person.swimKm)} km</p><p className="text-xs">sim</p></div>
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🚴</p><p className="font-bold">{numberText(person.bikeKm)} km</p><p className="text-xs">cykel</p></div>
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🏃</p><p className="font-bold">{numberText(person.runKm)} km</p><p className="text-xs">löp</p></div>
              </div>
            </div>
          ))}
        </section>

        <section id="calendar" className="overflow-x-auto rounded-3xl bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">Kalender</h2>
              <p className="text-sm text-slate-500">Klicka på ett pass för att ändra det. Valt pass blir mörkt.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setViewMode("Månad")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${viewMode === "Månad" ? "bg-slate-900 text-white" : "border border-slate-200"}`} type="button">Månad</button>
              <button onClick={() => setViewMode("Vecka")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${viewMode === "Vecka" ? "bg-slate-900 text-white" : "border border-slate-200"}`} type="button">Vecka</button>
              {viewMode === "Månad" ? (
                <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-2xl border border-slate-200 p-2 font-semibold outline-none focus:border-slate-400" />
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => shiftWeek(-7)} className="rounded-2xl border border-slate-200 px-3 py-2 font-semibold" type="button">←</button>
                  <input type="date" value={selectedWeekStart} onChange={(event) => setSelectedWeekStart(dateString(weekStart(toDate(event.target.value))))} className="rounded-2xl border border-slate-200 p-2 font-semibold outline-none focus:border-slate-400" />
                  <button onClick={() => shiftWeek(7)} className="rounded-2xl border border-slate-200 px-3 py-2 font-semibold" type="button">→</button>
                </div>
              )}
            </div>
          </div>

          {viewMode === "Månad" ? (
            <>
              <div className="grid min-w-[760px] grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">
                {WEEK_LABELS.map((day) => <div key={day}>{day}</div>)}
              </div>
              <div className="mt-2 grid min-w-[760px] grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <CalendarCell key={`${day.date || "empty"}-${index}`} day={day} workouts={workoutsByDate[day.date] || []} selectedWorkoutId={selectedWorkoutId} editWorkout={editWorkout} allowDrop={allowDrop} handleDrop={handleDrop} />
                ))}
              </div>
            </>
          ) : (
            <div className="grid min-w-[760px] grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <CalendarCell key={day.date} day={day} workouts={workoutsByDate[day.date] || []} selectedWorkoutId={selectedWorkoutId} editWorkout={editWorkout} allowDrop={allowDrop} handleDrop={handleDrop} week />
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <div id="workout-form" className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-xl font-bold">{editingId ? "Ändra pass" : "Lägg till pass"}</h2>
            <form onSubmit={saveWorkout} className="space-y-3">
              <label className="block text-sm font-medium">Vem tränade?
                <select value={form.athlete} onChange={(event) => setForm({ ...form, athlete: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                  {athletes.map((athlete) => <option key={athlete} value={athlete}>{athlete}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium">Planerat eller genomfört?
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                  <option>Genomfört</option>
                  <option>Planerat</option>
                </select>
              </label>

              <label className="block text-sm font-medium">Datum
                <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>

              <label className="block text-sm font-medium">Gren
                <select value={form.sport} onChange={(event) => setForm({ ...form, sport: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                  {SPORTS.map((sport) => <option key={sport}>{sport}</option>)}
                </select>
              </label>

              {form.sport !== "Brickpass" ? (
                <label className="block text-sm font-medium">Distans
                  <div className="mt-1 flex gap-2">
                    <input type="number" step="0.1" placeholder="Ex. 1500 eller 40" value={form.distance} onChange={(event) => setForm({ ...form, distance: event.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
                    <select value={form.distanceUnit} onChange={(event) => setForm({ ...form, distanceUnit: event.target.value })} className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                      <option value="km">km</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </label>
              ) : (
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <label className="block text-sm font-medium">Typ av brickpass
                    <select value={form.brickType} onChange={(event) => setForm({ ...form, brickType: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                      <option>Simma + löpa</option>
                      <option>Simma + cykla</option>
                      <option>Cykla + springa</option>
                    </select>
                  </label>
                  {(form.brickType === "Simma + löpa" || form.brickType === "Simma + cykla") && <label className="block text-sm font-medium">Simning (m)<input type="number" step="1" value={form.swimDistance} onChange={(event) => setForm({ ...form, swimDistance: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label>}
                  {(form.brickType === "Simma + cykla" || form.brickType === "Cykla + springa") && <label className="block text-sm font-medium">Cykling (km)<input type="number" step="0.1" value={form.bikeDistance} onChange={(event) => setForm({ ...form, bikeDistance: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label>}
                  {(form.brickType === "Simma + löpa" || form.brickType === "Cykla + springa") && <label className="block text-sm font-medium">Löpning (km)<input type="number" step="0.1" value={form.runDistance} onChange={(event) => setForm({ ...form, runDistance: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label>}
                </div>
              )}

              <label className="block text-sm font-medium">Tid
                <input placeholder="Ex. 45 min, 1 h 20 min" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>

              <label className="block text-sm font-medium">Intensitet
                <select value={form.intensity} onChange={(event) => setForm({ ...form, intensity: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                  <option>Återhämtning</option>
                  <option>Lugn</option>
                  <option>Medel</option>
                  <option>Hård</option>
                  <option>Intervall</option>
                </select>
              </label>

              <label className="block text-sm font-medium">Känsla
                <input placeholder="Ex. pigg, tungt, stark" value={form.feeling} onChange={(event) => setForm({ ...form, feeling: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>

              <label className="block text-sm font-medium">Anteckning
                <textarea placeholder="Ex. teknikfokus, växlingsträning" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>

              <button className="w-full rounded-2xl bg-slate-900 p-4 text-base font-semibold text-white hover:bg-slate-800" type="submit">{editingId ? "Spara ändringar" : "+ Lägg till pass"}</button>
              {editingId && <button onClick={() => resetForm()} className="w-full rounded-2xl border border-slate-200 p-4 text-base font-semibold" type="button">Avbryt ändring</button>}
            </form>
          </div>

          <div id="log" className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">Gemensam träningslogg</h2>
                <span className="text-sm text-slate-500">Senaste: {stats.latest?.date ?? "—"}</span>
              </div>
              <button onClick={clearAll} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" type="button">Rensa logg</button>
            </div>

            <div className="space-y-3">
              {workouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">Inga pass ännu. Lägg till ert första pass.</div>
              ) : (
                sortWorkoutsNewestFirst(workouts).map((workout) => (
                  <div key={workout.id} className={`rounded-2xl border p-4 ${selectedWorkoutId === workout.id ? "border-slate-900 bg-slate-900 text-white shadow-lg" : athleteClass(workout.athlete)} ${workout.status === "Planerat" ? "border-dashed opacity-80" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm opacity-80">{workout.date} · {workout.athlete} · {workout.status || "Genomfört"}</p>
                        <h3 className="text-lg font-bold">{sportIcon(workout.sport)} {workout.sport}</h3>
                        {workout.sport === "Brickpass" && workout.brickType && <p className="text-sm opacity-80">{workout.brickType}</p>}
                        <div className="mt-1">{workout.sport !== "Brickpass" ? <p>{workout.distance ? formatDistance(workout, workout.distance) : "Ingen distans"} · {workout.duration || "Ingen tid"}</p> : <div className="space-y-1 text-sm">{workout.swimDistance && <p>🏊 Simning: {workout.swimDistance} m</p>}{workout.bikeDistance && <p>🚴 Cykling: {workout.bikeDistance} km</p>}{workout.runDistance && <p>🏃 Löpning: {workout.runDistance} km</p>}<p className="font-medium">⏱️ {workout.duration || "Ingen tid"}</p></div>}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => editWorkout(workout)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white" type="button">Ändra</button>
                        <button onClick={() => toggleStatus(workout.id)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white" type="button">{workout.status === "Planerat" ? "Gjord" : "Plan"}</button>
                        <button onClick={() => duplicateWorkout(workout)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-white" type="button">Kopiera</button>
                        <button onClick={() => removeWorkout(workout.id)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-white" type="button">Ta bort</button>
                      </div>
                    </div>
                    {workout.notes && <p className="mt-3 rounded-xl bg-white/40 p-3 text-sm">{workout.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <nav className="fixed inset-x-3 bottom-3 z-50 rounded-3xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur md:hidden">
          <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
            <a href="#overview" className="rounded-2xl bg-slate-100 px-2 py-3">Översikt</a>
            <a href="#calendar" className="rounded-2xl bg-slate-100 px-2 py-3">Kalender</a>
            <a href="#workout-form" className="rounded-2xl bg-slate-900 px-2 py-3 text-white">+ Pass</a>
            <a href="#log" className="rounded-2xl bg-slate-100 px-2 py-3">Logg</a>
          </div>
        </nav>
      </div>
    </div>
  );
}

function CalendarCell({ day, workouts, selectedWorkoutId, editWorkout, allowDrop, handleDrop, week = false }) {
  return (
    <div
      onDragOver={allowDrop}
      onDrop={(event) => handleDrop(event, day.date)}
      className={`${week ? "min-h-40" : "min-h-28"} rounded-2xl border p-2 transition ${day.date === todayDateString() ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
    >
      <div className="mb-2 text-sm font-bold text-slate-700">{week ? `${day.label} ${day.dayNumber}` : day.dayNumber}</div>
      <div className="space-y-1">
        {workouts.map((workout) => (
          <WorkoutPill key={workout.id} workout={workout} selectedWorkoutId={selectedWorkoutId} editWorkout={editWorkout} />
        ))}
      </div>
    </div>
  );
}

function WorkoutPill({ workout, selectedWorkoutId, editWorkout }) {
  const selected = selectedWorkoutId === workout.id;
  return (
    <button
      draggable
      onDragStart={(event) => event.dataTransfer.setData("workoutId", workout.id)}
      onClick={() => editWorkout(workout)}
      className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${selected ? "border-slate-900 bg-slate-900 text-white shadow-lg" : athleteClass(workout.athlete)} ${workout.status === "Planerat" && !selected ? "border-dashed opacity-80" : ""}`}
      type="button"
    >
      <p className="font-bold">{sportIcon(workout.sport)} {workout.athlete}</p>
      <p>{workout.sport} {workout.status === "Planerat" ? "· plan" : ""}</p>
    </button>
  );
}
