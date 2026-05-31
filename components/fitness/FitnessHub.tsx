"use client";

import { useState } from "react";

type Tab = "plan3" | "plan4" | "cardio" | "nutrition" | "schedule" | "warmup" | "progress";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Exercise {
  name:       string;
  sets:       string;
  reps:       string;
  rest:       string;
  technique:  string;
  mistakes:   string;
  why:        string;
  priority:   1 | 2 | 3;
  kneeAlt?:   string;
}

interface WorkoutDay {
  day:       string;
  focus:     string;
  duration:  string;
  exercises: Exercise[];
}

// ── Workout Data ──────────────────────────────────────────────────────────────

const WARMUP: string[] = [
  "5 min light walk or stationary bike (low resistance)",
  "Hip circles — 10 each direction, standing, hands on hips",
  "Glute bridges — 15 reps, slow and controlled",
  "Clamshells with band (light) — 15 each side",
  "Shoulder rolls forward & back — 10 each",
  "Cat-cow stretch — 10 reps on all fours",
  "Leg swings forward/back — 10 each leg (hold wall for balance)",
  "World's greatest stretch — 5 each side (slow, no knee strain)",
];

const COOLDOWN: string[] = [
  "Standing quad stretch — hold 30s each side (light pressure only, no deep bend)",
  "Lying hamstring stretch — band or towel, 30s each",
  "Pigeon pose (modified, hip on floor) — 45s each side",
  "Hip flexor stretch — kneeling lunge position, 30s each",
  "Seated butterfly stretch — 45s",
  "Child's pose — 60s",
  "Upper trap stretch — head tilt, 20s each side",
  "Chest doorway stretch — 30s",
  "Deep diaphragmatic breathing — 10 slow breaths to close",
];

const PLAN_3: WorkoutDay[] = [
  {
    day: "Day A — Lower Body Focus",
    focus: "Glutes, Hamstrings, Hip Hinge",
    duration: "50–60 min",
    exercises: [
      {
        name: "Barbell or Smith Machine Hip Thrust",
        sets: "4", reps: "10–12", rest: "90s",
        priority: 1,
        technique: "Shoulders on bench edge, feet flat, drive hips explosively up, squeeze glutes at top for 1 second. Chin tucked, ribs down.",
        mistakes: "Hyperextending lower back at top, feet too close or far, not squeezing at the peak.",
        why: "Queen of glute exercises. Zero knee stress. Essential for PCOS — activates the largest muscles, maximises insulin sensitivity and fat burning.",
        kneeAlt: "Glute bridge on floor, bodyweight or plate on hips",
      },
      {
        name: "Romanian Deadlift (RDL)",
        sets: "3", reps: "10–12", rest: "90s",
        priority: 1,
        technique: "Soft bend in knees, push hips back (not down), bar stays close to legs. Feel hamstring stretch at bottom. Drive hips forward to stand.",
        mistakes: "Rounding the back, squatting down instead of hinging, letting bar drift away from body.",
        why: "Hip hinge pattern — works hamstrings and glutes with no knee compression. Builds the posterior chain critical for fat loss and posture.",
        kneeAlt: "Cable pull-through or single-leg deadlift with lighter weight",
      },
      {
        name: "Leg Press (High Feet Placement)",
        sets: "3", reps: "12–15", rest: "90s",
        priority: 2,
        technique: "Feet high and wide on platform. Only go down 60–70° — stop before knees travel past toes. Push through heels.",
        mistakes: "Feet too low (increases knee stress), going too deep, locking knees out at top.",
        why: "Allows quad and glute loading with controlled knee angle. High foot placement dramatically reduces patellar pressure.",
        kneeAlt: "Seated leg press with minimal range, or wall sit hold 20–30s",
      },
      {
        name: "Lying Leg Curl",
        sets: "3", reps: "12–15", rest: "60s",
        priority: 2,
        technique: "Lie face-down, curl heels toward glutes slowly (2 sec up, 3 sec down). Keep hips pressed into pad.",
        mistakes: "Using momentum, lifting hips off pad, not controlling the negative.",
        why: "Isolated hamstring work. Knee-friendly — no load through the joint. Balances quad-dominant tendencies that worsen knee pain.",
        kneeAlt: "Same exercise with lighter weight",
      },
      {
        name: "Cable Kickback (Glute Focus)",
        sets: "3", reps: "15 each side", rest: "60s",
        priority: 3,
        technique: "Attach ankle cuff, slight forward lean, kick leg back and up squeezing glute. Avoid rotating hips.",
        mistakes: "Kicking sideways, using lower back, not isolating the glute.",
        why: "Finisher for glute detail without any knee involvement.",
        kneeAlt: "Donkey kicks on all fours — same movement pattern",
      },
      {
        name: "Plank Hold",
        sets: "3", reps: "30–45s", rest: "45s",
        priority: 3,
        technique: "Forearms down, body in straight line, squeeze abs and glutes. Don't let hips sag or pike.",
        mistakes: "Holding breath, hips too high or low, elbows too far forward.",
        why: "Core stability protects the spine during all other lifts. Essential for manufacturing workers with postural fatigue.",
        kneeAlt: "Same — no knee involvement",
      },
    ],
  },
  {
    day: "Day B — Upper Body",
    focus: "Back, Chest, Shoulders, Arms",
    duration: "45–55 min",
    exercises: [
      {
        name: "Seated Cable Row (Wide or Narrow Grip)",
        sets: "4", reps: "10–12", rest: "90s",
        priority: 1,
        technique: "Sit tall, pull elbows back squeezing shoulder blades together. Pause 1 sec at end, slow return.",
        mistakes: "Rounding forward at stretch, using momentum, shrugging shoulders.",
        why: "#1 upper priority. Counteracts hours of forward-leaning posture in manufacturing. Builds the back which is the largest upper-body muscle group for fat burning.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Lat Pulldown (Neutral or Wide Grip)",
        sets: "3", reps: "10–12", rest: "90s",
        priority: 1,
        technique: "Lean back slightly, pull bar to upper chest, elbows drive down and back. Control the ascent.",
        mistakes: "Pulling behind neck, using body weight to swing, elbows flaring forward.",
        why: "Builds back width, improves posture, high muscle activation for calorie burn.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Incline Dumbbell Press",
        sets: "3", reps: "10–12", rest: "90s",
        priority: 2,
        technique: "Bench at 30–45°, dumbbells at chest level, press up and slightly in. Lower slowly over 3 seconds.",
        mistakes: "Flaring elbows out 90°, bouncing off chest, arching excessively.",
        why: "Chest and shoulder development. Sitting vs. standing removes lower body load, great for tired legs.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Dumbbell Lateral Raise",
        sets: "3", reps: "12–15", rest: "60s",
        priority: 2,
        technique: "Slight bend in elbows, raise to shoulder height with thumbs slightly down. Control descent.",
        mistakes: "Swinging, going above shoulder height, shrugging.",
        why: "Shoulder width creates an hourglass visual effect as you lose fat. Compensates for rounded shoulders from standing work.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Tricep Pushdown (Cable, Rope)",
        sets: "3", reps: "12–15", rest: "60s",
        priority: 3,
        technique: "Elbows pinned to sides, push rope down and slightly out, full extension. Squeeze at bottom.",
        mistakes: "Letting elbows flare, leaning forward to help.",
        why: "Arms respond well to direct work. Triceps are 2/3 of arm size — important for overall tone.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Dumbbell Bicep Curl",
        sets: "3", reps: "12–15", rest: "60s",
        priority: 3,
        technique: "Curl to shoulder, supinate wrist slightly (palm up at top). Lower over 3 seconds.",
        mistakes: "Swinging body, not controlling the negative, elbows drifting forward.",
        why: "Bicep development. Short sessions = high adherence for tired workers.",
        kneeAlt: "No knee involvement",
      },
    ],
  },
  {
    day: "Day C — Full Body Metabolic",
    focus: "Total body, heart rate elevation, fat burning",
    duration: "45–55 min",
    exercises: [
      {
        name: "Goblet Squat (to Box / Chair)",
        sets: "3", reps: "12–15", rest: "90s",
        priority: 1,
        technique: "Hold dumbbell at chest, squat to a box (just below parallel). Push knees out, weight in heels. Stand tall.",
        mistakes: "Knees caving in, going too deep, heels lifting off floor.",
        why: "Squatting to a target limits depth and controls knee angle. Goblet position keeps torso upright, reducing spinal and knee load.",
        kneeAlt: "Wall sit hold 20s, or leg press only",
      },
      {
        name: "Single-Arm Dumbbell Row",
        sets: "3", reps: "12 each side", rest: "60s",
        priority: 1,
        technique: "Knee on bench, pull dumbbell to hip. Elbow drives back, shoulder blade retracts.",
        mistakes: "Rotating the torso too much, pulling to armpit instead of hip.",
        why: "Unilateral training exposes imbalances. High calorie burn due to stabilising work.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Dumbbell Romanian Deadlift",
        sets: "3", reps: "12–15", rest: "90s",
        priority: 2,
        technique: "Same as barbell RDL but with dumbbells. Easier to control for beginners.",
        mistakes: "Letting dumbbells drift forward, rounding back.",
        why: "Reinforces the hip hinge. Posterior chain activation raises metabolism for hours after training.",
        kneeAlt: "Same exercise with lighter weight",
      },
      {
        name: "Seated Shoulder Press (Dumbbells)",
        sets: "3", reps: "10–12", rest: "60s",
        priority: 2,
        technique: "Sit on bench with back support, press from shoulder height to full extension overhead.",
        mistakes: "Arching lower back, pressing forward instead of up, not reaching full extension.",
        why: "Compound upper movement hits shoulders and triceps simultaneously. Efficient for full-body days.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Dead Bug",
        sets: "3", reps: "8 each side", rest: "45s",
        priority: 2,
        technique: "Lying on back, arms up, knees at 90°. Extend opposite arm + leg while keeping lower back pressed to floor.",
        mistakes: "Lower back arching off floor, moving too fast, holding breath.",
        why: "Anti-extension core work. Trains deep stabilisers that protect the lumbar spine — critical for manufacturing workers.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Battle Ropes or Step-Ups (Low Step)",
        sets: "3", reps: "20s on, 20s rest", rest: "60s",
        priority: 3,
        technique: "Step-ups: use a low step (15–20cm). Lead with full foot, push through heel, step down controlled.",
        mistakes: "Step-ups: knee driving inward, going too fast, using momentum.",
        why: "Elevates heart rate for fat burning without impact. Low-step step-ups are knee-friendly when controlled.",
        kneeAlt: "Seated arm bikes, marching in place, or battle ropes only",
      },
    ],
  },
];

const PLAN_4: WorkoutDay[] = [
  {
    day: "Day 1 — Lower Body (Posterior Chain)",
    focus: "Glutes & Hamstrings",
    duration: "55–65 min",
    exercises: [
      {
        name: "Hip Thrust (Barbell)",
        sets: "4", reps: "8–10", rest: "2 min",
        priority: 1,
        technique: "Heavy load. Drive through full hip extension, 2 sec pause at top, slow 3 sec descent.",
        mistakes: "Not using full ROM, not pausing at top.",
        why: "Heavy progressive overload on glutes without knee stress. Maximum hormonal response for fat loss.",
        kneeAlt: "Glute bridge with band above knees",
      },
      {
        name: "Romanian Deadlift (Barbell)",
        sets: "4", reps: "8–10", rest: "2 min",
        priority: 1,
        technique: "Heavy. Controlled descent, feel full hamstring stretch.",
        mistakes: "Rounding back under load.",
        why: "Primary hamstring strengthener. Heavy compound lifts are the best fat-loss tool long-term.",
        kneeAlt: "Dumbbell RDL, lighter",
      },
      {
        name: "Lying Leg Curl",
        sets: "3", reps: "10–12", rest: "90s",
        priority: 2,
        technique: "Slow tempo: 2 up, 3 down. Feet flexed.",
        mistakes: "Using momentum on the positive phase.",
        why: "Isolated hamstring work to balance quad strength and protect knees.",
        kneeAlt: "Seated leg curl if lying uncomfortable",
      },
      {
        name: "Cable Pull-Through",
        sets: "3", reps: "15", rest: "60s",
        priority: 2,
        technique: "Face away from cable, rope between legs, hinge at hips, drive hips forward to stand.",
        mistakes: "Squatting instead of hinging, letting cable pull you too far.",
        why: "Hip hinge reinforcement with light load. Good for learning RDL pattern safely.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Side-Lying Clamshell (Resistance Band)",
        sets: "3", reps: "20 each side", rest: "45s",
        priority: 3,
        technique: "Band above knees, keep feet together, rotate top knee up. Slow and controlled.",
        mistakes: "Rolling hips back, going too fast.",
        why: "Hip abductor strength protects knees from caving in during all other exercises.",
        kneeAlt: "Same — no knee stress",
      },
    ],
  },
  {
    day: "Day 2 — Upper Body (Push)",
    focus: "Chest, Shoulders, Triceps",
    duration: "45–55 min",
    exercises: [
      {
        name: "Incline Dumbbell Press",
        sets: "4", reps: "8–10", rest: "90s",
        priority: 1,
        technique: "30–45° bench, elbows at 45° from body, slow 3-sec descent.",
        mistakes: "Elbows too wide, bar path inconsistent.",
        why: "Upper chest development. Looks great as body fat reduces. Sitting = no knee load.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Seated Shoulder Press (Dumbbells)",
        sets: "3", reps: "10–12", rest: "90s",
        priority: 1,
        technique: "Full overhead extension, neutral spine throughout.",
        mistakes: "Arching lower back to complete reps.",
        why: "Shoulders are visible as fat reduces. Overhead pressing builds them efficiently.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Cable Lateral Raise",
        sets: "3", reps: "15 each side", rest: "60s",
        priority: 2,
        technique: "Single arm, cable low, constant tension through full range.",
        mistakes: "Going above shoulder height, using too much weight.",
        why: "Constant cable tension is superior to dumbbells for lateral delts.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Tricep Overhead Extension (Cable or Dumbbell)",
        sets: "3", reps: "12–15", rest: "60s",
        priority: 2,
        technique: "Arms overhead, hinge at elbows only. Full stretch at bottom.",
        mistakes: "Elbows flaring out, using torso.",
        why: "Long head of tricep trained in stretch — highest muscle activation.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Face Pull (Cable, Rope)",
        sets: "3", reps: "15–20", rest: "45s",
        priority: 3,
        technique: "Cable at eye height, pull rope to face, elbows flare high and wide, external rotate at end.",
        mistakes: "Pulling below eye height, not externally rotating.",
        why: "Rear delt and rotator cuff health. Counteracts the forward shoulder posture from your job.",
        kneeAlt: "No knee involvement",
      },
    ],
  },
  {
    day: "Day 3 — Lower Body (Quad & Glute Balance)",
    focus: "Quads, Glutes, Core",
    duration: "55–65 min",
    exercises: [
      {
        name: "Leg Press (High & Wide Feet)",
        sets: "4", reps: "10–12", rest: "2 min",
        priority: 1,
        technique: "Controlled depth — stop at 70°. Feet high and wide to shift load to glutes. Drive through heels.",
        mistakes: "Bringing knees to chest, feet too narrow.",
        why: "Heavy quad and glute work without axial spine load. Knee-safe when feet are correctly positioned.",
        kneeAlt: "Leg press with reduced range, or seated leg extension (light weight only)",
      },
      {
        name: "Goblet Squat to Box",
        sets: "3", reps: "12", rest: "90s",
        priority: 2,
        technique: "Low box, tap lightly and stand. Push knees out, keep chest up.",
        mistakes: "Collapsing onto box, knees caving.",
        why: "Box removes the fear of going too deep. Builds squat confidence safely.",
        kneeAlt: "Seated leg press only",
      },
      {
        name: "Hip Thrust (Single Leg, Bodyweight or Light)",
        sets: "3", reps: "12 each side", rest: "90s",
        priority: 2,
        technique: "One foot on floor, other leg extended. Drive single hip up, squeeze glute at top.",
        mistakes: "Compensating with lower back, rushing reps.",
        why: "Identifies and corrects glute imbalances. Important for knee health — weak glutes = knee instability.",
        kneeAlt: "Bilateral hip thrust on floor",
      },
      {
        name: "Seated Leg Extension (Light, Partial ROM)",
        sets: "3", reps: "15", rest: "60s",
        priority: 3,
        technique: "Only go from 90° to about 30° of flexion (don't reach full extension under load). Light weight, slow.",
        mistakes: "Heavy weight, full ROM — puts excessive stress on kneecap.",
        why: "Teardrop quad development without the strain of squatting. Light and controlled is key.",
        kneeAlt: "Skip if any knee discomfort — replace with standing glute kickback",
      },
      {
        name: "Ab Wheel Rollout (Kneeling)",
        sets: "3", reps: "8–10", rest: "60s",
        priority: 3,
        technique: "From knees, roll out until body is nearly horizontal, use abs to pull back. Don't collapse.",
        mistakes: "Letting hips drop, going too far out.",
        why: "Superior anti-extension core exercise. Functional strength that protects the spine.",
        kneeAlt: "Plank or dead bug if knee discomfort from kneeling",
      },
    ],
  },
  {
    day: "Day 4 — Upper Body (Pull & Full Body Finisher)",
    focus: "Back, Biceps, Full Body",
    duration: "50–60 min",
    exercises: [
      {
        name: "Barbell or Cable Row",
        sets: "4", reps: "8–10", rest: "90s",
        priority: 1,
        technique: "Lean forward slightly, row to lower chest/navel. Elbows stay close to body.",
        mistakes: "Swinging torso, jerking the weight.",
        why: "Heaviest back movement. More weight = more muscle = more fat burned at rest.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Lat Pulldown (Neutral Grip)",
        sets: "3", reps: "10–12", rest: "90s",
        priority: 1,
        technique: "Neutral (parallel) grip hits lats and biceps simultaneously.",
        mistakes: "Letting shoulders rise, leaning too far back.",
        why: "Back width development. V-taper creates visual waist illusion as you lose fat.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Chest-Supported Dumbbell Row",
        sets: "3", reps: "12", rest: "60s",
        priority: 2,
        technique: "Lie chest-down on incline bench, row dumbbells to hips. No spinal involvement.",
        mistakes: "Pulling to shoulder instead of hip.",
        why: "Eliminates lower back fatigue — ideal for manufacturing workers with spinal fatigue.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Hammer Curl",
        sets: "3", reps: "12–15", rest: "60s",
        priority: 2,
        technique: "Neutral grip (thumbs up), controlled full ROM. Alternate arms.",
        mistakes: "Swinging, partial reps.",
        why: "Hits brachialis and brachioradialis — gives arms a fuller look from the side.",
        kneeAlt: "No knee involvement",
      },
      {
        name: "Kettlebell Swing (Hip Hinge Power)",
        sets: "3", reps: "15", rest: "90s",
        priority: 3,
        technique: "Drive with hips — not arms. Hike bell between legs, explode hips forward. Arms guide the bell, legs and hips generate the power.",
        mistakes: "Squatting down, pulling with arms, letting bell go too high.",
        why: "Best finisher for fat burning — ballistic hip hinge burns massive calories and trains the posterior chain.",
        kneeAlt: "Cable pull-through, same pattern",
      },
    ],
  },
];

const PROGRESSION: { week: string; focus: string; notes: string }[] = [
  { week: "Weeks 1–2", focus: "Learn the movements", notes: "Light weights (50–60% effort). Focus entirely on form. Log every session. Do not increase weight yet." },
  { week: "Weeks 3–4", focus: "Build consistency", notes: "Add 1–2 reps to each exercise if form is clean. Increase weight on hip thrusts and rows by 2.5kg." },
  { week: "Weeks 5–6", focus: "First real overload", notes: "Add 2.5–5kg to main compound lifts (hip thrust, RDL, row). Maintain reps. Introduce full tempo (2 up, 3 down)." },
  { week: "Weeks 7–8", focus: "Intensity increase", notes: "Reduce rest time by 15 seconds on accessory exercises. Add an extra set to your #1 priority exercise each day." },
  { week: "Weeks 9–10", focus: "Deload week + reset", notes: "Week 9: deload — reduce weight 30%, same volume. Week 10: return to full weight, you'll feel stronger." },
  { week: "Weeks 11–12", focus: "Max effort phase", notes: "Push compound lifts to near failure (1–2 reps in reserve). Track PBs. Reassess physique and adjust plan for next block." },
];

const SCHEDULE_3: { day: string; activity: string; note: string }[] = [
  { day: "Monday",    activity: "Day A — Lower Body",   note: "Best after rest day. High energy." },
  { day: "Tuesday",   activity: "Rest or light walk",    note: "10,000 steps. Gentle recovery." },
  { day: "Wednesday", activity: "Day B — Upper Body",    note: "Midweek — sustainable energy." },
  { day: "Thursday",  activity: "Rest or 20 min walk",   note: "Active recovery. Light stretching." },
  { day: "Friday",    activity: "Day C — Full Body",     note: "End the training week strong." },
  { day: "Saturday",  activity: "Cardio (optional)",     note: "Walk, swim, or bike. Keep it enjoyable." },
  { day: "Sunday",    activity: "Full rest",             note: "Recovery is when you actually change." },
];

const SCHEDULE_4: { day: string; activity: string; note: string }[] = [
  { day: "Monday",    activity: "Day 1 — Lower (Posterior)", note: "Fresh legs after weekend." },
  { day: "Tuesday",   activity: "Day 2 — Upper (Push)",      note: "Legs still recovering." },
  { day: "Wednesday", activity: "Rest or 20 min walk",       note: "Non-negotiable midweek recovery." },
  { day: "Thursday",  activity: "Day 3 — Lower (Quad/Glute)", note: "Full leg recovery after Wed." },
  { day: "Friday",    activity: "Day 4 — Upper (Pull)",       note: "Push/pull balance." },
  { day: "Saturday",  activity: "Cardio (30–40 min)",        note: "Low intensity. Enjoy it." },
  { day: "Sunday",    activity: "Full rest",                  note: "Sleep. Recover. Eat enough protein." },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function FitnessHub() {
  const [tab, setTab] = useState<Tab>("plan3");

  const tabs: { id: Tab; label: string }[] = [
    { id: "plan3",     label: "3-Day Plan" },
    { id: "plan4",     label: "4-Day Plan" },
    { id: "cardio",    label: "Cardio" },
    { id: "nutrition", label: "Nutrition" },
    { id: "warmup",    label: "Warm-up & Cool-down" },
    { id: "schedule",  label: "Weekly Schedule" },
    { id: "progress",  label: "Progression" },
  ];

  return (
    <div className="fit-shell">
      {/* Header */}
      <div className="fit-header">
        <div>
          <h1 className="fit-title">Your Fitness Plan</h1>
          <p className="fit-subtitle">Built for fat loss · PCOS-aware · Knee-friendly · Made for long shift workers</p>
        </div>
        <div className="fit-goal-chip">🎯 Goal: 85 kg → 60 kg</div>
      </div>

      {/* Quick Stats */}
      <div className="fit-stats-row">
        <div className="fit-stat"><span className="fit-stat-value">1,600–1,750</span><span className="fit-stat-label">kcal/day target</span></div>
        <div className="fit-stat"><span className="fit-stat-value">155–170g</span><span className="fit-stat-label">protein/day</span></div>
        <div className="fit-stat"><span className="fit-stat-value">10,000</span><span className="fit-stat-label">steps/day</span></div>
        <div className="fit-stat"><span className="fit-stat-value">~25 kg</span><span className="fit-stat-label">to target weight</span></div>
      </div>

      {/* Tabs */}
      <div className="fit-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`fit-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="fit-body">
        {tab === "plan3"     && <WorkoutPlan days={PLAN_3} intro="3 days per week — ideal when shift work leaves limited energy. Full recovery between sessions. Each week you train, you build the habit." />}
        {tab === "plan4"     && <WorkoutPlan days={PLAN_4} intro="4 days per week — for when you have consistent energy. Upper/lower split allows more volume per muscle group for faster results." />}
        {tab === "cardio"    && <CardioPanel />}
        {tab === "nutrition" && <NutritionPanel />}
        {tab === "warmup"    && <WarmupPanel />}
        {tab === "schedule"  && <SchedulePanel />}
        {tab === "progress"  && <ProgressionPanel />}
      </div>
    </div>
  );
}

// ── Workout Plan ──────────────────────────────────────────────────────────────

function WorkoutPlan({ days, intro }: { days: WorkoutDay[]; intro: string }) {
  const [openDay, setOpenDay] = useState<number>(0);
  const [showAlt, setShowAlt] = useState(false);

  return (
    <div>
      <p className="fit-intro">{intro}</p>
      <label className="fit-toggle-label">
        <input type="checkbox" checked={showAlt} onChange={e => setShowAlt(e.target.checked)} />
        <span>Show knee-pain alternatives</span>
      </label>

      {days.map((day, i) => (
        <div key={i} className="fit-day-card">
          <button className="fit-day-header" onClick={() => setOpenDay(openDay === i ? -1 : i)}>
            <div className="fit-day-info">
              <span className="fit-day-name">{day.day}</span>
              <span className="fit-day-meta">{day.focus} · {day.duration}</span>
            </div>
            <span className="fit-day-chevron">{openDay === i ? "▲" : "▼"}</span>
          </button>

          {openDay === i && (
            <div className="fit-day-body">
              {day.exercises.map((ex, j) => (
                <ExerciseCard key={j} ex={ex} showAlt={showAlt} rank={j + 1} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ExerciseCard({ ex, showAlt, rank }: { ex: Exercise; showAlt: boolean; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const priorityLabel = ex.priority === 1 ? "Core" : ex.priority === 2 ? "Key" : "Support";
  const priorityClass = ex.priority === 1 ? "fit-p1" : ex.priority === 2 ? "fit-p2" : "fit-p3";

  return (
    <div className={`fit-exercise${expanded ? " open" : ""}`}>
      <button className="fit-exercise-header" onClick={() => setExpanded(!expanded)}>
        <span className="fit-exercise-rank">#{rank}</span>
        <div className="fit-exercise-info">
          <span className="fit-exercise-name">{ex.name}</span>
          <span className="fit-exercise-meta">{ex.sets} sets · {ex.reps} reps · {ex.rest} rest</span>
        </div>
        <span className={`fit-priority-badge ${priorityClass}`}>{priorityLabel}</span>
        <span className="fit-exercise-chevron">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="fit-exercise-body">
          <div className="fit-exercise-section">
            <span className="fit-section-label">Why this exercise</span>
            <p className="fit-section-text">{ex.why}</p>
          </div>
          <div className="fit-exercise-section">
            <span className="fit-section-label">Technique</span>
            <p className="fit-section-text">{ex.technique}</p>
          </div>
          <div className="fit-exercise-section fit-mistake">
            <span className="fit-section-label">⚠️ Common mistakes</span>
            <p className="fit-section-text">{ex.mistakes}</p>
          </div>
          {showAlt && ex.kneeAlt && (
            <div className="fit-exercise-section fit-alt">
              <span className="fit-section-label">🦵 Knee-pain alternative</span>
              <p className="fit-section-text">{ex.kneeAlt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cardio Panel ──────────────────────────────────────────────────────────────

function CardioPanel() {
  const cardio = [
    {
      phase: "Weeks 1–4 (Foundation)",
      sessions: "2× per week, 20–30 min",
      type: "Low Intensity Steady State (LISS)",
      options: ["Incline treadmill walk (incline 5–8°, speed 4–5 km/h)", "Stationary bike (moderate resistance, comfortable pace)", "Swimming or aqua walk (joint-friendly, highly recommended with PCOS)", "Elliptical (no impact — excellent for knees)"],
      note: "LISS is superior for PCOS. It lowers cortisol, doesn't spike stress hormones, and burns fat in the aerobic zone. Do NOT run.",
    },
    {
      phase: "Weeks 5–8 (Build)",
      sessions: "2–3× per week, 30–40 min",
      type: "LISS + 1× Moderate Intensity",
      options: ["2× 35 min incline walk or bike", "1× 25 min where every 5 min you increase pace/incline for 60 seconds, then recover", "Pool sessions remain ideal"],
      note: "Adding one slightly harder session boosts cardiovascular fitness without over-stressing the adrenal system — important with PCOS.",
    },
    {
      phase: "Weeks 9–12 (Progress)",
      sessions: "3× per week, 30–45 min",
      type: "LISS + optional light HIIT (modified)",
      options: ["3× 40 min incline walk, bike, or elliptical", "Optional: 20 min bike — 30s moderate / 90s easy × 8 rounds (not high intensity sprints)", "Swimming 40 min"],
      note: "Traditional HIIT (box jumps, burpees) is NOT recommended with knee problems. Bike-based intervals are the safe alternative.",
    },
  ];

  return (
    <div>
      <div className="fit-callout">
        <strong>Why LISS, not HIIT?</strong> With PCOS, high cortisol from intense exercise can worsen insulin resistance and stall fat loss. LISS keeps cortisol low, directly targets fat stores, and doesn't destroy your knees or your recovery. Walking burns more fat per minute than you think — especially on an incline.
      </div>
      <div className="fit-callout fit-callout-green">
        <strong>Daily Step Target: 10,000 steps</strong> — You likely get 6,000–8,000 at work. The extra 2,000–4,000 outside work (a 20–30 min walk) is enough to make a significant difference. Steps are your most powerful daily fat-burning tool.
      </div>
      {cardio.map((c, i) => (
        <div key={i} className="fit-cardio-card">
          <div className="fit-cardio-phase">{c.phase}</div>
          <div className="fit-cardio-sub">{c.sessions} · {c.type}</div>
          <ul className="fit-cardio-list">
            {c.options.map((o, j) => <li key={j}>{o}</li>)}
          </ul>
          <p className="fit-cardio-note">{c.note}</p>
        </div>
      ))}
    </div>
  );
}

// ── Nutrition Panel ───────────────────────────────────────────────────────────

function NutritionPanel() {
  return (
    <div>
      <div className="fit-callout">
        <strong>PCOS Nutrition Principle:</strong> Insulin resistance is at the root of PCOS weight gain. The goal is to keep blood sugar stable — not too low (crashes → cravings → overeating), not spiking (fat storage). This means eating protein and fat with every meal, never carbs alone, and timing carbs around workouts.
      </div>

      <div className="fit-nut-grid">
        <div className="fit-nut-card">
          <div className="fit-nut-label">Daily Calories</div>
          <div className="fit-nut-value">1,600–1,750 kcal</div>
          <div className="fit-nut-detail">
            Your estimated TDEE is ~2,100–2,300 kcal (active job + workouts). A 300–500 kcal deficit creates 0.3–0.5kg fat loss per week — sustainable and hormone-friendly. Do NOT go below 1,500 kcal — this tanks metabolism and worsens PCOS.
          </div>
        </div>
        <div className="fit-nut-card">
          <div className="fit-nut-label">Protein</div>
          <div className="fit-nut-value">155–170g / day</div>
          <div className="fit-nut-detail">
            ~1.8–2g per kg body weight. Protein preserves muscle while you lose fat, keeps you full, requires energy to digest (thermic effect), and is critical for muscle repair after shifts. Spread across 4+ meals/snacks.
          </div>
        </div>
        <div className="fit-nut-card">
          <div className="fit-nut-label">Carbohydrates</div>
          <div className="fit-nut-value">130–170g / day</div>
          <div className="fit-nut-detail">
            Focus on slow-releasing carbs: oats, sweet potato, brown rice, lentils, fruit. Time the largest carb portion around your workout. Avoid refined carbs and sugar on non-training days especially.
          </div>
        </div>
        <div className="fit-nut-card">
          <div className="fit-nut-label">Fats</div>
          <div className="fit-nut-value">55–65g / day</div>
          <div className="fit-nut-detail">
            Dietary fat is essential for hormone production — especially for PCOS. Sources: avocado, olive oil, nuts, eggs, oily fish. Do not go low-fat. It disrupts oestrogen and progesterone balance.
          </div>
        </div>
      </div>

      <h3 className="fit-section-heading">Meal Timing for Shift Workers</h3>
      <div className="fit-meal-list">
        {[
          { time: "Before shift / Morning", meal: "High-protein breakfast. Eggs + oats or Greek yoghurt + berries. This stabilises blood sugar for the whole shift.", emoji: "🌅" },
          { time: "Mid-shift (if possible)", meal: "Protein + slow carb snack. Chicken + rice or tuna + wholegrain wrap. Avoid vending machines.", emoji: "⏰" },
          { time: "Post-shift / Pre-workout", meal: "Light protein + small carb. Banana + protein shake or cottage cheese + fruit.", emoji: "💪" },
          { time: "Post-workout", meal: "Most important meal. Chicken/turkey/fish + rice or potato + vegetables. This is when your muscles rebuild.", emoji: "🍽️" },
          { time: "Before bed", meal: "Casein protein or cottage cheese + handful of nuts. Slow-release protein feeds muscles overnight.", emoji: "🌙" },
        ].map((m, i) => (
          <div key={i} className="fit-meal-item">
            <span className="fit-meal-emoji">{m.emoji}</span>
            <div>
              <div className="fit-meal-time">{m.time}</div>
              <div className="fit-meal-desc">{m.meal}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="fit-section-heading">PCOS-Specific Supplements (consult your doctor)</h3>
      <div className="fit-supp-list">
        {[
          { name: "Inositol (Myo + D-Chiro blend)", why: "Improves insulin sensitivity. One of the most studied PCOS supplements." },
          { name: "Vitamin D3 + K2", why: "Deficiency is extremely common in PCOS and directly worsens insulin resistance." },
          { name: "Magnesium glycinate", why: "Improves sleep quality, reduces cortisol, helps muscle recovery." },
          { name: "Omega-3 (fish oil)", why: "Reduces inflammation. PCOS is an inflammatory condition." },
          { name: "Creatine monohydrate (3–5g/day)", why: "Safe for women, improves strength gains, protects muscle during fat loss." },
        ].map((s, i) => (
          <div key={i} className="fit-supp-item">
            <span className="fit-supp-name">{s.name}</span>
            <span className="fit-supp-why">{s.why}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Warmup & Cooldown Panel ───────────────────────────────────────────────────

function WarmupPanel() {
  return (
    <div>
      <div className="fit-callout">
        Never skip the warm-up. After a long shift, your muscles are fatigued and your joints are stiff — not warm. Cold, stiff joints under load is how knee injuries happen. The warm-up below takes 8–10 minutes and dramatically reduces injury risk.
      </div>

      <h3 className="fit-section-heading">Warm-up (Before Every Session)</h3>
      <ol className="fit-routine-list">
        {WARMUP.map((item, i) => (
          <li key={i} className="fit-routine-item">
            <span className="fit-routine-num">{i + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>

      <h3 className="fit-section-heading">Cool-down & Stretch (After Every Session)</h3>
      <div className="fit-callout fit-callout-green">
        Cool-down is not optional for you. After standing for a long shift plus lifting, your fascia (connective tissue) needs to release. Skipping this leads to chronic tightness, poor posture, and slower recovery. 8–10 minutes.
      </div>
      <ol className="fit-routine-list">
        {COOLDOWN.map((item, i) => (
          <li key={i} className="fit-routine-item">
            <span className="fit-routine-num">{i + 1}</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>

      <h3 className="fit-section-heading">When Knee Pain Flares — Immediate Alternatives</h3>
      <div className="fit-alt-grid">
        {[
          { instead: "Goblet Squat / Leg Press", use: "Hip Thrust + Leg Curl only. Remove all knee flexion exercises." },
          { instead: "Step-Ups", use: "Seated arm bike or seated upper body circuit." },
          { instead: "Any lower body standing", use: "All upper body session + core only. Rest the knees completely." },
          { instead: "Running / treadmill walk", use: "Seated bike (recumbent) or swimming — zero impact." },
        ].map((a, i) => (
          <div key={i} className="fit-alt-card">
            <div className="fit-alt-instead">Instead of: <strong>{a.instead}</strong></div>
            <div className="fit-alt-use">✅ Use: {a.use}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Schedule Panel ────────────────────────────────────────────────────────────

function SchedulePanel() {
  const [showFour, setShowFour] = useState(false);
  const schedule = showFour ? SCHEDULE_4 : SCHEDULE_3;

  return (
    <div>
      <div className="fit-toggle-row">
        <button className={`fit-filter-btn${!showFour ? " active" : ""}`} onClick={() => setShowFour(false)}>3-Day Schedule</button>
        <button className={`fit-filter-btn${showFour ? " active" : ""}`} onClick={() => setShowFour(true)}>4-Day Schedule</button>
      </div>
      <div className="fit-callout">
        These schedules are designed around your long shifts. On rest days, gentle walking is encouraged — it aids recovery, keeps insulin sensitivity high, and maintains the 10,000 step target without stress.
      </div>
      <div className="fit-schedule-list">
        {schedule.map((s, i) => (
          <div key={i} className={`fit-schedule-row${s.activity.includes("Rest") || s.activity.includes("walk") || s.activity.includes("Cardio") ? " rest" : " train"}`}>
            <span className="fit-sched-day">{s.day}</span>
            <span className="fit-sched-activity">{s.activity}</span>
            <span className="fit-sched-note">{s.note}</span>
          </div>
        ))}
      </div>
      <div className="fit-callout" style={{ marginTop: 20 }}>
        <strong>Shift work tip:</strong> If you have a particularly brutal shift, swap a training day for a rest day without guilt. Consistency over months matters more than perfection each week. Missing one session is never the problem — missing many in a row is.
      </div>
    </div>
  );
}

// ── Progression Panel ─────────────────────────────────────────────────────────

function ProgressionPanel() {
  return (
    <div>
      <div className="fit-callout">
        Progressive overload is the single most important principle for fat loss and muscle growth. It means doing slightly more than last time — more weight, more reps, or less rest. Without it, the body adapts and results stop.
      </div>
      <div className="fit-prog-list">
        {PROGRESSION.map((p, i) => (
          <div key={i} className="fit-prog-card">
            <div className="fit-prog-week">{p.week}</div>
            <div className="fit-prog-focus">{p.focus}</div>
            <div className="fit-prog-notes">{p.notes}</div>
          </div>
        ))}
      </div>
      <h3 className="fit-section-heading">What to Track Each Session</h3>
      <div className="fit-callout fit-callout-green">
        You don't need an app — a notes page or your phone is fine. Log: exercise name, weight used, reps completed. When you can do 2+ reps more than the target for 2 sessions in a row, increase weight by the smallest available increment.
      </div>
      <div className="fit-track-grid">
        {[
          { label: "Weight on bar/dumbbell", icon: "🏋️" },
          { label: "Reps completed", icon: "🔢" },
          { label: "How it felt (easy/hard/max)", icon: "💬" },
          { label: "Body measurements monthly", icon: "📏" },
          { label: "Progress photos every 4 weeks", icon: "📸" },
          { label: "Energy levels & sleep", icon: "😴" },
        ].map((t, i) => (
          <div key={i} className="fit-track-item">
            <span className="fit-track-icon">{t.icon}</span>
            <span>{t.label}</span>
          </div>
        ))}
      </div>
      <div className="fit-callout" style={{ marginTop: 20 }}>
        <strong>Realistic timeline:</strong> With consistency, expect visible changes by week 6, significant changes by week 12. The scale may move slowly at first — that's normal, especially with PCOS. Trust body measurements and how your clothes fit more than the number on the scale. Hormonal water retention with PCOS can mask fat loss for weeks.
      </div>
    </div>
  );
}
