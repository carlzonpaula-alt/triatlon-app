import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zwzevqkrxszfbdetxjcw.supabase.co",
  "sb_publishable_OiueoTMEhWaBs0b8tQGgvQ_sJNlUT_K"
);
function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function monthString(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function toDate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

export function daysBetween(targetDate, now = new Date()) {
  if (!targetDate) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = toDate(targetDate);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function sortWorkoutsNewestFirst(workouts) {
  return [...workouts].sort((a, b) => b.date.localeCompare(a.date));
}

function isDone(workout) {
  return workout.status === "Genomfört";
}

function weekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const mondayBasedDay = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayBasedDay);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekDays(startDateString) {
  const start = weekStart(toDate(startDateString));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: dateString(date),
      label: ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"][index],
      dayNumber: date.getDate(),
    };
  });
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

export function totalsByAthlete(workouts, athletes) {
  return athletes.map((athlete) => {
    const own = workouts.filter((w) => w.athlete === athlete && isDone(w));
    return {
      athlete,
      total: own.length,
      swimKm: own.filter((w) => w.sport === "Simning").reduce((sum, w) => sum + Number(w.distance || 0), 0),
      bikeKm: own.filter((w) => w.sport === "Cykel").reduce((sum, w) => sum + Number(w.distance || 0), 0),
      runKm: own.filter((w) => w.sport === "Löpning").reduce((sum, w) => sum + Number(w.distance || 0), 0),
      brickKm: own.filter((w) => w.sport === "Brickpass").reduce((sum, w) => sum + Number(w.distance || 0), 0),
      load: own.reduce((sum, w) => sum + trainingLoad(w), 0),
    };
  });
}

export function getCalendarDays(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const mondayBasedStart = (firstDay.getDay() + 6) % 7;
  const days = [];

  for (let i = 0; i < mondayBasedStart; i++) days.push({ date: null, dayNumber: "" });
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({ date, dayNumber: day });
  }
  while (days.length % 7 !== 0) days.push({ date: null, dayNumber: "" });
  return days;
}

function getDistance(workout, sport) {
  if (workout.sport === sport) return Number(workout.distance || 0);
  if (workout.sport !== "Brickpass") return 0;
  if (sport === "Simning") return Number(workout.swimDistance || 0);
  if (sport === "Cykel") return Number(workout.bikeDistance || 0);
  if (sport === "Löpning") return Number(workout.runDistance || 0);
  return 0;
}

function findLongest(workouts, sport) {
  const done = workouts.filter(isDone);
  let best = null;
  for (const workout of done) {
    const distance = getDistance(workout, sport);
    if (distance > 0 && (!best || distance > best.distance)) {
      best = { ...workout, distance };
    }
  }
  return best;
}

function runTests() {
  console.assert(daysBetween("2026-01-10", new Date("2026-01-01T12:00:00")) === 9, "daysBetween räknar dagar framåt");
  console.assert(daysBetween("2026-01-01", new Date("2026-01-01T12:00:00")) === 0, "daysBetween visar 0 på måldagen");
  console.assert(daysBetween("2025-12-31", new Date("2026-01-01T12:00:00")) === -1, "daysBetween visar minus efter måldatum");
  console.assert(daysBetween("") === null, "daysBetween hanterar tomt datum");
  const sorted = sortWorkoutsNewestFirst([{ date: "2026-01-01" }, { date: "2026-01-03" }, { date: "2026-01-02" }]);
  console.assert(sorted[0].date === "2026-01-03", "sortWorkoutsNewestFirst sorterar nyast först");
  const days = getCalendarDays("2026-05");
  console.assert(days.some((d) => d.date === "2026-05-01"), "kalendern innehåller månadens dagar");
  const week = getWeekDays("2026-05-07");
  console.assert(week.length === 7 && week[0].label === "Mån", "veckovy skapar 7 dagar från måndag");
  const totals = totalsByAthlete([
    { athlete: "A", sport: "Simning", distance: "1.5", status: "Genomfört", intensity: "Lugn" },
    { athlete: "A", sport: "Cykel", distance: "20", status: "Planerat", intensity: "Hård" },
    { athlete: "B", sport: "Brickpass", distance: "30", status: "Genomfört", intensity: "Intervall" },
  ], ["A", "B"]);
  console.assert(totals[0].swimKm === 1.5 && totals[0].bikeKm === 0, "totals räknar bara genomförda pass");
  console.assert(totals[1].brickKm === 30, "totals räknar brickpass per person");
}

runTests();

const STORAGE_KEY = "triathlon-couple-countdown-v3";
async function loadWorkoutsFromSupabase() {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

async function saveWorkoutToSupabase(workout) {
  const { error } = await supabase
    .from("workouts")
    .insert([workout]);

  if (error) {
    console.error(error);
  }
}
const oldStorageKeys = ["triathlon-couple-countdown-v2", "triathlon-couple-countdown-v1", "training-countdown-app-v1"];
const defaultAthletes = ["Paula", "Kuba"];
const athleteStyles = {
  Paula: "bg-violet-100 border-violet-300 text-violet-900",
  Kuba: "bg-emerald-100 border-emerald-300 text-emerald-900",
};

const defaultWorkouts = [
  {
    id: makeId(), athlete: "Paula", date: todayDateString(), sport: "Löpning", status: "Genomfört", distance: "5", duration: "28 min", intensity: "Lugn", feeling: "Bra", notes: "Första passet i appen",
  },
  {
    id: makeId(), athlete: "Kuba", date: todayDateString(), sport: "Cykel", status: "Planerat", distance: "25", duration: "1 h", intensity: "Medel", feeling: "", notes: "Planerat distanspass",
  },
];

function loadSavedState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return JSON.parse(current);
    for (const key of oldStorageKeys) {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    }
    return null;
  } catch {
    return null;
  }
}

function numberText(value) {
  const n = Number(value || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatDistance(workout, value) {
  if (!value) return "Ingen distans";
  const unit = workout.distanceUnit || (workout.sport === "Simning" ? "m" : "km");
  return `${value} ${unit}`;
}

function athleteClass(name) {
  return athleteStyles[name] || "bg-slate-100 border-slate-300 text-slate-900";
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

function loadMessage(load) {
  if (load >= 220) return { label: "Hög belastning", text: "Planera extra återhämtning.", className: "bg-red-50 border-red-200 text-red-900" };
  if (load >= 130) return { label: "Bra träningsvecka", text: "Lagom mycket volym.", className: "bg-amber-50 border-amber-200 text-amber-900" };
  return { label: "Lugn vecka", text: "Bra för återhämtning eller uppbyggnad.", className: "bg-green-50 border-green-200 text-green-900" };
}

export default function TrainingCountdownApp() {
  const savedState = typeof localStorage !== "undefined" ? loadSavedState() : null;

  const [goalName, setGoalName] = useState(savedState?.goalName || "Triatlon tillsammans");
  const [goalDate, setGoalDate] = useState(savedState?.goalDate || "2026-07-01");
  const [athletes, setAthletes] = useState(savedState?.athletes || defaultAthletes);
  const [workouts, setWorkouts] = useState(savedState?.workouts || defaultWorkouts);
  const [selectedMonth, setSelectedMonth] = useState(monthString());
  const [selectedWeekStart, setSelectedWeekStart] = useState(dateString(weekStart(new Date())));
  const [viewMode, setViewMode] = useState("Månad");
  const [editingId, setEditingId] = useState(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null);
  const [form, setForm] = useState({
    athlete: "Paula", date: todayDateString(), sport: "Löpning", status: "Genomfört", brickType: "Cykla + springa", swimDistance: "", bikeDistance: "", runDistance: "", distance: "", distanceUnit: "km", duration: "", intensity: "Lugn", feeling: "", notes: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ goalName, goalDate, athletes, workouts }));
    } catch {
      // Appen fungerar ändå, men sparning kan vara avstängd i vissa miljöer.
    }
  }, [goalName, goalDate, athletes, workouts]);

  const daysLeft = daysBetween(goalDate);
  const raceWeeksLeft = daysLeft === null ? null : Math.ceil(daysLeft / 7);

  const stats = useMemo(() => {
    const done = workouts.filter(isDone);
    const planned = workouts.filter((w) => w.status === "Planerat");
    const perAthlete = totalsByAthlete(workouts, athletes);
    const sportTotals = ["Simning", "Cykel", "Löpning", "Brickpass", "Styrka", "Rörlighet"].map((sport) => ({
      sport,
      count: done.filter((w) => w.sport === sport).length,
      distance: done.reduce((sum, w) => sum + getDistance(w, sport), 0),
    }));
    const prs = {
      swim: findLongest(done, "Simning"),
      bike: findLongest(done, "Cykel"),
      run: findLongest(done, "Löpning"),
    };
    return { doneCount: done.length, plannedCount: planned.length, latest: sortWorkoutsNewestFirst(workouts)[0], perAthlete, sportTotals, prs };
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
    const weekDates = new Set(weekDays.map((d) => d.date));
    const weekWorkouts = workouts.filter((w) => weekDates.has(w.date));
    const done = weekWorkouts.filter(isDone);
    const planned = weekWorkouts.filter((w) => w.status === "Planerat");
    const load = done.reduce((sum, w) => sum + trainingLoad(w), 0);
    const totals = ["Simning", "Cykel", "Löpning", "Brickpass"].map((sport) => ({
      sport,
      distance: done.reduce((sum, w) => sum + getDistance(w, sport), 0),
      count: done.filter((w) => w.sport === sport).length,
    }));
    return { weekWorkouts, done, planned, load, totals, message: loadMessage(load) };
  }, [workouts, weekDays]);

  function updateAthleteName(index, value) {
    const oldName = athletes[index];
    const newAthletes = athletes.map((name, i) => (i === index ? value : name));
    setAthletes(newAthletes);
    setWorkouts(workouts.map((w) => (w.athlete === oldName ? { ...w, athlete: value } : w)));
    if (form.athlete === oldName) setForm({ ...form, athlete: value });
  }

  function resetForm(keepAthlete = form.athlete) {
    setEditingId(null);
    setSelectedWorkoutId(null);
    setForm({ athlete: keepAthlete, date: todayDateString(), sport: "Löpning", status: "Genomfört", brickType: "Cykla + springa", swimDistance: "", bikeDistance: "", runDistance: "", distance: "", distanceUnit: "km", duration: "", intensity: "Lugn", feeling: "", notes: "" });
  }

  function saveWorkout(e) {
    e.preventDefault();
    if (!form.date || !form.athlete || !form.sport) return;
    const totalBrickDistance = Number(form.swimDistance || 0) + Number(form.bikeDistance || 0) + Number(form.runDistance || 0);
    const workout = { id: editingId || makeId(), ...form, distance: form.sport === "Brickpass" ? String(totalBrickDistance) : form.distance };
    if (editingId) setWorkouts(workouts.map((w) => (w.id === editingId ? workout : w)));
    else setWorkouts([workout, ...workouts]);
    resetForm(form.athlete);
  }

  function scrollToForm() {
    const element = document.getElementById("workout-form");
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editWorkout(workout) {
    setEditingId(workout.id);
    setSelectedWorkoutId(workout.id);
    scrollToForm();
    setForm({
      athlete: workout.athlete || "Paula", date: workout.date || todayDateString(), sport: workout.sport || "Löpning", status: workout.status || "Genomfört", brickType: workout.brickType || "Cykla + springa", swimDistance: workout.swimDistance || "", bikeDistance: workout.bikeDistance || "", runDistance: workout.runDistance || "", distance: workout.sport === "Brickpass" ? "" : workout.distance || "", distanceUnit: workout.distanceUnit || (workout.sport === "Simning" ? "m" : "km"), duration: workout.duration || "", intensity: workout.intensity || "Lugn", feeling: workout.feeling || "", notes: workout.notes || "",
    });
  }

  function toggleStatus(id) {
    setWorkouts(workouts.map((w) => (w.id === id ? { ...w, status: w.status === "Genomfört" ? "Planerat" : "Genomfört" } : w)));
  }

  function duplicateWorkout(workout) {
    const nextWeek = dateString(addDays(toDate(workout.date), 7));
    setWorkouts([{ ...workout, id: makeId(), date: nextWeek, status: "Planerat" }, ...workouts]);
  }

  function removeWorkout(id) {
    setWorkouts(workouts.filter((w) => w.id !== id));
  }

  function clearAll() {
    setWorkouts([]);
  }

  function exportData() {
    const data = JSON.stringify({ goalName, goalDate, athletes, workouts }, null, 2);
    navigator.clipboard?.writeText(data);
    alert("Er träningsdata har kopierats. Spara den i en anteckning om ni vill dela eller säkerhetskopiera.");
  }

  function importData() {
    const data = prompt("Klistra in exporterad träningsdata här:");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.goalName) setGoalName(parsed.goalName);
      if (parsed.goalDate) setGoalDate(parsed.goalDate);
      if (Array.isArray(parsed.athletes)) setAthletes(parsed.athletes);
      if (Array.isArray(parsed.workouts)) setWorkouts(parsed.workouts);
    } catch {
      alert("Det gick inte att läsa datan. Kontrollera att du klistrade in allt.");
    }
  }

  function shiftWeek(days) {
    setSelectedWeekStart(dateString(addDays(toDate(selectedWeekStart), days)));
  }

  function moveWorkoutToDate(workoutId, newDate) {
    setWorkouts((current) =>
      current.map((workout) =>
        workout.id === workoutId
          ? { ...workout, date: newDate }
          : workout
      )
    );
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
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500"><span aria-hidden="true">🏊‍♀️🚴‍♀️🏃‍♀️</span> Triatlonkalender för två</div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">{goalName}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base">Planera pass, markera genomfört och följ Paula & Kuba.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full border border-violet-300 bg-violet-100 px-3 py-1 text-violet-900">Paula</span>
                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-emerald-900">Kuba</span>
                <span className="rounded-full border border-dashed border-slate-400 px-3 py-1 text-slate-600">Streckad = planerat</span>
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
            <input value={goalName} onChange={(e) => setGoalName(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Måldatum</p>
            <input type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-slate-400" />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Paula</p>
            <input value={athletes[0] || ""} onChange={(e) => updateAthleteName(0, e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-slate-400" />
            <p className="mt-4 text-sm text-slate-500">Kuba</p>
            <input value={athletes[1] || ""} onChange={(e) => updateAthleteName(1, e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 p-3 font-semibold outline-none focus:border-slate-400" />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Översikt</p>
            <p className="mt-2 text-3xl font-black">{stats.doneCount}</p>
            <p className="text-sm text-slate-600">genomförda pass</p>
            <p className="mt-1 text-sm text-slate-600">{stats.plannedCount} planerade pass</p>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={exportData} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="button">Exportera</button>
              <button onClick={importData} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold" type="button">Importera</button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <div className={`rounded-3xl border p-5 shadow-sm md:col-span-2 ${weekStats.message.className}`}>
            <p className="text-sm opacity-80">Denna valda vecka</p>
            <h2 className="mt-1 text-2xl font-black">{weekStats.message.label}</h2>
            <p className="mt-1 text-sm">{weekStats.message.text}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-white/70 p-3"><p className="font-black">{weekStats.done.length}</p><p>gjorda</p></div>
              <div className="rounded-2xl bg-white/70 p-3"><p className="font-black">{weekStats.planned.length}</p><p>planerade</p></div>
              <div className="rounded-2xl bg-white/70 p-3"><p className="font-black">{weekStats.load}</p><p>belastning</p></div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-sm text-slate-500">Personliga rekord / längsta pass</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl">🏊</p><p className="font-bold">{stats.prs.swim ? `${numberText(stats.prs.swim.distance)} km` : "—"}</p><p className="text-xs text-slate-500">simning</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl">🚴</p><p className="font-bold">{stats.prs.bike ? `${numberText(stats.prs.bike.distance)} km` : "—"}</p><p className="text-xs text-slate-500">cykel</p></div>
              <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xl">🏃</p><p className="font-bold">{stats.prs.run ? `${numberText(stats.prs.run.distance)} km` : "—"}</p><p className="text-xs text-slate-500">löpning</p></div>
            </div>
          </div>
        </section>

        <section id="calendar" className="overflow-x-auto rounded-3xl bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold md:text-2xl">Kalender</h2>
              <p className="text-sm text-slate-500">Klicka på ett pass för att ändra det. Välj månad eller vecka.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setViewMode("Månad")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${viewMode === "Månad" ? "bg-slate-900 text-white" : "border border-slate-200"}`} type="button">Månad</button>
              <button onClick={() => setViewMode("Vecka")} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${viewMode === "Vecka" ? "bg-slate-900 text-white" : "border border-slate-200"}`} type="button">Vecka</button>
              {viewMode === "Månad" ? (
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-2xl border border-slate-200 p-2 font-semibold outline-none focus:border-slate-400" />
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => shiftWeek(-7)} className="rounded-2xl border border-slate-200 px-3 py-2 font-semibold" type="button">←</button>
                  <input type="date" value={selectedWeekStart} onChange={(e) => setSelectedWeekStart(dateString(weekStart(toDate(e.target.value))))} className="rounded-2xl border border-slate-200 p-2 font-semibold outline-none focus:border-slate-400" />
                  <button onClick={() => shiftWeek(7)} className="rounded-2xl border border-slate-200 px-3 py-2 font-semibold" type="button">→</button>
                </div>
              )}
            </div>
          </div>

          {viewMode === "Månad" ? (
            <>
              <div className="grid min-w-[760px] grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500">{['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((day) => <div key={day}>{day}</div>)}</div>
              <div className="mt-2 grid min-w-[760px] grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <div
                    key={`${day.date || 'empty'}-${index}`}
                    onDragOver={allowDrop}
                    onDrop={(event) => handleDrop(event, day.date)}
                    className={`min-h-28 rounded-2xl border p-2 transition ${day.date === todayDateString() ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <div className="mb-2 text-sm font-bold text-slate-700">{day.dayNumber}</div>
                    <div className="space-y-1">{(workoutsByDate[day.date] || []).map((workout) => <WorkoutPill key={workout.id} workout={workout} selectedWorkoutId={selectedWorkoutId} editWorkout={editWorkout} />)}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid min-w-[760px] grid-cols-7 gap-3">
              {weekDays.map((day) => (
                <div
                  key={day.date}
                  onDragOver={allowDrop}
                  onDrop={(event) => handleDrop(event, day.date)}
                  className={`min-h-40 rounded-2xl border p-3 transition ${day.date === todayDateString() ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="mb-3"><p className="font-black">{day.label}</p><p className="text-sm text-slate-500">{day.dayNumber}</p></div>
                  <div className="space-y-2">{(workoutsByDate[day.date] || []).map((workout) => <WorkoutPill key={workout.id} workout={workout} selectedWorkoutId={selectedWorkoutId} editWorkout={editWorkout} />)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="people" className="grid gap-3 md:grid-cols-2">
          {stats.perAthlete.map((person) => (
            <div key={person.athlete} className={`rounded-3xl border p-5 shadow-sm ${athleteClass(person.athlete)}`}>
              <h2 className="text-xl font-bold">{person.athlete}</h2>
              <p className="mt-1 text-sm">{person.total} genomförda pass · belastning {person.load}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center md:grid-cols-4">
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🏊</p><p className="font-bold">{numberText(person.swimKm)} km</p><p className="text-xs">simning</p></div>
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🚴</p><p className="font-bold">{numberText(person.bikeKm)} km</p><p className="text-xs">cykel</p></div>
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🏃</p><p className="font-bold">{numberText(person.runKm)} km</p><p className="text-xs">löpning</p></div>
                <div className="rounded-2xl bg-white/70 p-3"><p className="text-2xl">🔥</p><p className="font-bold">{numberText(person.brickKm)} km</p><p className="text-xs">brickpass</p></div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {stats.sportTotals.map((item) => (
            <div key={item.sport} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.sport}</p>
              <p className="mt-2 text-2xl font-black">{item.count} pass</p>
              <p className="text-sm text-slate-600">{item.sport === "Styrka" || item.sport === "Rörlighet" ? "kompletterande" : `${numberText(item.distance)} km`}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
          <div id="workout-form" className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-xl font-bold">{editingId ? "Ändra pass" : "Lägg till pass"}</h2>
            <form onSubmit={saveWorkout} className="space-y-3">
              <label className="block text-sm font-medium">Paula eller Kuba?
                <select value={form.athlete} onChange={(e) => setForm({ ...form, athlete: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">{athletes.map((athlete) => <option key={athlete} value={athlete}>{athlete}</option>)}</select>
              </label>
              <label className="block text-sm font-medium">Planerat eller genomfört?
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400"><option>Genomfört</option><option>Planerat</option></select>
              </label>
              <label className="block text-sm font-medium">Datum
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>
              <label className="block text-sm font-medium">Gren
                <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400"><option>Simning</option><option>Cykel</option><option>Löpning</option><option>Brickpass</option><option>Styrka</option><option>Rörlighet</option></select>
              </label>

              {form.sport !== "Brickpass" ? (
                <label className="block text-sm font-medium">Distans
                  <div className="mt-1 flex gap-2">
                    <input type="number" step="0.1" placeholder="Ex. 1500 eller 40" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} className="w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
                    <select value={form.distanceUnit} onChange={(e) => setForm({ ...form, distanceUnit: e.target.value })} className="rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400">
                      <option value="km">km</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </label>
              ) : (
                <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  <label className="block text-sm font-medium">Typ av brickpass
                    <select value={form.brickType} onChange={(e) => setForm({ ...form, brickType: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400"><option>Simma + löpa</option><option>Simma + cykla</option><option>Cykla + springa</option></select>
                  </label>
                  {(form.brickType === "Simma + löpa" || form.brickType === "Simma + cykla") && <label className="block text-sm font-medium">Simning (km)<input type="number" step="0.1" placeholder="Ex. 1.5" value={form.swimDistance} onChange={(e) => setForm({ ...form, swimDistance: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label>}
                  {(form.brickType === "Simma + cykla" || form.brickType === "Cykla + springa") && <label className="block text-sm font-medium">Cykling (km)<input type="number" step="0.1" placeholder="Ex. 40" value={form.bikeDistance} onChange={(e) => setForm({ ...form, bikeDistance: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label>}
                  {(form.brickType === "Simma + löpa" || form.brickType === "Cykla + springa") && <label className="block text-sm font-medium">Löpning (km)<input type="number" step="0.1" placeholder="Ex. 5" value={form.runDistance} onChange={(e) => setForm({ ...form, runDistance: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" /></label>}
                </div>
              )}

              <label className="block text-sm font-medium">Tid
                <input placeholder="Ex. 45 min, 1 h 20 min" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>
              <label className="block text-sm font-medium">Intensitet
                <select value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400"><option>Återhämtning</option><option>Lugn</option><option>Medel</option><option>Hård</option><option>Intervall</option></select>
              </label>
              <label className="block text-sm font-medium">Känsla
                <input placeholder="Ex. pigg, tungt, stark, sliten" value={form.feeling} onChange={(e) => setForm({ ...form, feeling: e.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>
              <label className="block text-sm font-medium">Anteckning
                <textarea placeholder="Ex. teknikfokus, växlingsträning, öppet vatten, brickpass" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-400" />
              </label>
              <button className="w-full rounded-2xl bg-slate-900 p-4 text-base font-semibold text-white hover:bg-slate-800" type="submit">{editingId ? "Spara ändringar" : "+ Lägg till pass"}</button>
              {editingId && <button onClick={() => resetForm()} className="w-full rounded-2xl border border-slate-200 p-4 text-base font-semibold" type="button">Avbryt ändring</button>}
            </form>
          </div>

          <div id="log" className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div><h2 className="text-xl font-bold">Gemensam träningslogg</h2><span className="text-sm text-slate-500">Senaste: {stats.latest?.date ?? "—"}</span></div>
              <button onClick={clearAll} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" type="button">Rensa logg</button>
            </div>
            <div className="space-y-3">
              {workouts.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">Inga pass ännu. Lägg till ert första pass.</div> : sortWorkoutsNewestFirst(workouts).map((workout) => (
                <div key={workout.id} className={`rounded-2xl border p-4 ${athleteClass(workout.athlete)} ${workout.status === 'Planerat' ? 'border-dashed opacity-80' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm opacity-80">{workout.date} · {workout.athlete} · {workout.status || "Genomfört"}</p>
                      <h3 className="text-lg font-bold">{sportIcon(workout.sport)} {workout.sport}</h3>
                      {workout.sport === "Brickpass" && workout.brickType && <p className="text-sm opacity-80">{workout.brickType}</p>}
                      <div className="mt-1">{workout.sport !== "Brickpass" ? <p>{workout.distance ? formatDistance(workout, workout.distance) : "Ingen distans"} · {workout.duration || "Ingen tid"}</p> : <div className="space-y-1 text-sm">{workout.swimDistance && <p>🏊 Simning: {workout.swimDistance} m</p>}{workout.bikeDistance && <p>🚴 Cykling: {workout.bikeDistance} km</p>}{workout.runDistance && <p>🏃 Löpning: {workout.runDistance} km</p>}<p className="font-medium">⏱️ {workout.duration || "Ingen tid"}</p></div>}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => editWorkout(workout)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white" type="button">Ändra</button>
                      <button onClick={() => toggleStatus(workout.id)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white" type="button">{workout.status === "Planerat" ? "Klart" : "Plan"}</button>
                      <button onClick={() => duplicateWorkout(workout)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white" type="button">Kopiera +1v</button>
                      <button onClick={() => removeWorkout(workout.id)} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold hover:bg-white" aria-label="Ta bort pass" type="button">🗑️</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2"><div className="rounded-xl bg-white/70 p-3"><span>Intensitet: </span><span className="font-medium">{workout.intensity || "—"}</span></div><div className="rounded-xl bg-white/70 p-3"><span>Känsla: </span><span className="font-medium">{workout.feeling || "—"}</span></div></div>
                  {workout.notes && <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm">{workout.notes}</p>}
                </div>
              ))}
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

function WorkoutPill({ workout, selectedWorkoutId, editWorkout }) {
  return (
    <button
      draggable={workout.status === 'Planerat'}
      onDragStart={(event) => {
        event.dataTransfer.setData('workoutId', workout.id);
      }}
      onClick={() => editWorkout(workout)}
      className={`block w-full cursor-grab rounded-xl border px-2 py-1 text-left text-[11px] leading-tight transition hover:scale-[1.02] hover:shadow-sm active:cursor-grabbing ${athleteClass(workout.athlete)} ${workout.status === 'Planerat' ? 'border-dashed opacity-70' : ''} ${selectedWorkoutId === workout.id ? 'ring-2 ring-slate-900' : ''}`}
      type="button"
    >
      <span className="font-bold">{sportIcon(workout.sport)} {workout.athlete}</span><br />
      <span>{workout.sport}{workout.status === 'Planerat' ? ' · plan' : ''}</span>
    </button>
  );
}
