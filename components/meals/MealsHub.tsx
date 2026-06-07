"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Recipe, Ingredient } from "@/app/api/recipes/route";
import type { MealPlanEntry } from "@/app/api/meal-plan/route";
import type { Meal } from "@/components/dashboard/NutritionCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_TYPES  = ["breakfast","lunch","dinner","snack"] as const;
const MEAL_ICONS: Record<string, string> = { breakfast:"🌅", lunch:"☀️", dinner:"🌙", snack:"🍎" };
const MEAL_LABELS: Record<string, string> = { breakfast:"Breakfast", lunch:"Lunch", dinner:"Dinner", snack:"Snack" };
const KCAL_GOAL = 1675; const P_GOAL = 163; const C_GOAL = 150; const F_GOAL = 60;

const RECIPE_EMOJIS = ["🍽️","🥗","🍳","🥙","🍲","🥘","🍜","🥚","🍗","🥩","🐟","🥑","🧆","🫕","🥣","🍱"];
const RECIPE_COLORS = ["#3D52D5","#7C3AED","#DB2777","#16A34A","#EA580C","#0891B2","#CA8A04","#DC2626"];
const TAGS = ["high-protein","pcos-friendly","quick","low-carb","batch-cook","dairy-free","gluten-free","post-workout"];

type Tab = "planner" | "recipes";

function getWeekDates(offset = 0): string[] {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return d.toISOString().split("T")[0]!;
  });
}

function macroBar(val: number, goal: number, color: string) {
  const pct = Math.min(100, goal > 0 ? (val / goal) * 100 : 0);
  const over = val > goal;
  return <div className="ml-bar-wrap"><div className="ml-bar-fill" style={{ width: `${pct}%`, background: over ? "#ef4444" : color }} /></div>;
}

// ── Log meal to nutrition tracker ─────────────────────────────────────────────

async function logMealToNutrition(entry: MealPlanEntry, date: string) {
  // 1. Fetch existing meals for this date
  const existingRes = await fetch(`/api/nutrition?days=1`);
  const existingJ   = await existingRes.json() as { logs?: Record<string, { meals: Meal[] }> };
  const existing    = existingJ.logs?.[date]?.meals ?? [];

  // 2. Create new meal entry
  const now = new Date();
  const newMeal: Meal = {
    id:        Date.now().toString(),
    t:         `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`,
    n:         entry.recipe_name ?? entry.custom_name ?? "Meal",
    kcal:      Math.round(entry.kcal),
    p:         Math.round(entry.protein * 10) / 10,
    c:         Math.round(entry.carbs   * 10) / 10,
    f:         Math.round(entry.fat     * 10) / 10,
    estimated: false,
  };

  // 3. Save merged meals
  await fetch(`/api/nutrition/${date}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meals: [...existing, newMeal] }),
  });

  // 4. Mark plan entry as logged
  await fetch(`/api/meal-plan?id=${entry.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logged: true }),
  });
}

// ── Main Hub ──────────────────────────────────────────────────────────────────

export function MealsHub() {
  const [tab, setTab] = useState<Tab>("planner");

  return (
    <div className="ml-shell">
      <PageHeader title="Meals & Recipes" subtitle="Plan your week · Track your macros · Hit your goals" />

      <div className="ml-tabs">
        <button className={`ml-tab${tab === "planner" ? " active" : ""}`} onClick={() => setTab("planner")}>📅 Weekly Planner</button>
        <button className={`ml-tab${tab === "recipes" ? " active" : ""}`} onClick={() => setTab("recipes")}>📖 Recipe Book</button>
      </div>

      {tab === "planner" && <WeeklyPlanner />}
      {tab === "recipes" && <RecipeBook />}
    </div>
  );
}

// ── Weekly Planner ────────────────────────────────────────────────────────────

function WeeklyPlanner() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries]       = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes]       = useState<Recipe[]>([]);
  const [loading, setLoading]       = useState(true);
  const [addSlot, setAddSlot]       = useState<{ date: string; type: string } | null>(null);

  const week = getWeekDates(weekOffset);
  const today = new Date().toISOString().split("T")[0]!;

  const load = useCallback(async () => {
    setLoading(true);
    const [planRes, recRes] = await Promise.all([
      fetch(`/api/meal-plan?from=${week[0]}&to=${week[6]}`).then(r => r.json()) as Promise<{ entries?: MealPlanEntry[] }>,
      fetch("/api/recipes").then(r => r.json()) as Promise<{ recipes?: Recipe[] }>,
    ]);
    setEntries(planRes.entries ?? []);
    setRecipes(recRes.recipes ?? []);
    setLoading(false);
  }, [weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);

  async function removeMeal(id: string) {
    await fetch(`/api/meal-plan?id=${id}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  async function logMeal(entry: MealPlanEntry) {
    await logMealToNutrition(entry, entry.plan_date);
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, logged: true } : e));
  }

  // Daily totals
  function dayTotals(date: string) {
    const dayEntries = entries.filter(e => e.plan_date === date);
    return dayEntries.reduce((acc, e) => ({
      kcal: acc.kcal + e.kcal, p: acc.p + e.protein, c: acc.c + e.carbs, f: acc.f + e.fat
    }), { kcal: 0, p: 0, c: 0, f: 0 });
  }

  const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  return (
    <div>
      {/* Week nav */}
      <div className="ml-week-nav">
        <button className="ml-week-btn" onClick={() => setWeekOffset(o => o - 1)}>← Prev</button>
        <span className="ml-week-label">
          {new Date(week[0]! + "T12:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short" })}
          {" – "}
          {new Date(week[6]! + "T12:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}
        </span>
        <button className="ml-week-btn" onClick={() => setWeekOffset(o => o + 1)}>Next →</button>
        {weekOffset !== 0 && <button className="ml-week-btn ml-week-today" onClick={() => setWeekOffset(0)}>Today</button>}
      </div>

      {/* Weekly summary bar */}
      <div className="ml-week-summary">
        {week.map((date, i) => {
          const t = dayTotals(date);
          const isToday = date === today;
          const pct = Math.min(100, (t.kcal / KCAL_GOAL) * 100);
          return (
            <div key={date} className={`ml-day-summary${isToday ? " today" : ""}`}>
              <span className="ml-day-name">{dayNames[i]}</span>
              <div className="ml-day-kcal-bar"><div className="ml-day-kcal-fill" style={{ width: `${pct}%`, background: pct > 105 ? "#ef4444" : pct > 80 ? "#3D52D5" : "#C7D2FE" }} /></div>
              <span className="ml-day-kcal-val">{t.kcal > 0 ? Math.round(t.kcal) : "—"}</span>
            </div>
          );
        })}
      </div>

      {/* Day columns */}
      {loading ? <p className="ml-empty">Loading…</p> : (
        <div className="ml-planner-grid">
          {week.map((date, di) => {
            const t = dayTotals(date);
            const isToday = date === today;
            return (
              <div key={date} className={`ml-day-col${isToday ? " today" : ""}`}>
                <div className="ml-day-header">
                  <span className="ml-day-label">{dayNames[di]}</span>
                  <span className="ml-day-date">{new Date(date + "T12:00:00").getDate()}</span>
                </div>

                {/* Macro strip */}
                {t.kcal > 0 && (
                  <div className="ml-day-macros">
                    <span className="ml-macro-val">{Math.round(t.kcal)} kcal</span>
                    <span className="ml-macro-p">{Math.round(t.p)}g P</span>
                  </div>
                )}

                {/* Meal slots */}
                {MEAL_TYPES.map(type => {
                  const slotEntries = entries.filter(e => e.plan_date === date && e.meal_type === type);
                  return (
                    <div key={type} className="ml-slot">
                      <div className="ml-slot-header">
                        <span className="ml-slot-icon">{MEAL_ICONS[type]}</span>
                        <span className="ml-slot-label">{MEAL_LABELS[type]}</span>
                        <button className="ml-slot-add" onClick={() => setAddSlot({ date, type })} title="Add meal">+</button>
                      </div>
                      {slotEntries.map(entry => (
                        <div key={entry.id} className={`ml-entry${entry.logged ? " logged" : ""}`}>
                          <div className="ml-entry-name">{entry.recipe_name ?? entry.custom_name ?? "Meal"}</div>
                          <div className="ml-entry-macros">
                            <span>{Math.round(entry.kcal)} kcal</span>
                            <span>{Math.round(entry.protein)}g P</span>
                          </div>
                          <div className="ml-entry-actions">
                            {!entry.logged && entry.plan_date === today && (
                              <button className="ml-log-btn" onClick={() => void logMeal(entry)} title="Log to nutrition tracker">✓ Log</button>
                            )}
                            {entry.logged && <span className="ml-logged-badge">✓ Logged</span>}
                            <button className="ml-del-btn" onClick={() => void removeMeal(entry.id)}>×</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Day total */}
                {t.kcal > 0 && (
                  <div className="ml-day-total">
                    <div className="ml-day-total-row">
                      <span>Total</span>
                      <span className={t.kcal > KCAL_GOAL * 1.1 ? "ml-over" : ""}>{Math.round(t.kcal)} / {KCAL_GOAL} kcal</span>
                    </div>
                    {macroBar(t.kcal, KCAL_GOAL, "#3D52D5")}
                    <div className="ml-day-total-macros">
                      <span>P: {Math.round(t.p)}g</span>
                      <span>C: {Math.round(t.c)}g</span>
                      <span>F: {Math.round(t.f)}g</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add meal modal */}
      {addSlot && (
        <AddMealModal
          date={addSlot.date}
          type={addSlot.type}
          recipes={recipes}
          onAdd={(entry) => { setEntries(prev => [...prev, entry]); setAddSlot(null); }}
          onClose={() => setAddSlot(null)}
        />
      )}
    </div>
  );
}

// ── Add Meal Modal ────────────────────────────────────────────────────────────

function AddMealModal({ date, type, recipes, onAdd, onClose }: {
  date: string; type: string; recipes: Recipe[];
  onAdd: (e: MealPlanEntry) => void; onClose: () => void;
}) {
  const [mode, setMode]         = useState<"recipe" | "custom">(recipes.length > 0 ? "recipe" : "custom");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(1);
  const [customName, setCustomName] = useState("");
  const [customKcal, setCustomKcal] = useState("");
  const [customP, setCustomP]   = useState("");
  const [customC, setCustomC]   = useState("");
  const [customF, setCustomF]   = useState("");
  const [saving, setSaving]     = useState(false);

  const filtered = recipes.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  async function save() {
    setSaving(true);
    let body: Record<string, unknown>;
    if (mode === "recipe" && selected) {
      body = {
        plan_date:   date,
        meal_type:   type,
        recipe_id:   selected.id,
        servings,
        kcal:        selected.kcal_per_serving    * servings,
        protein:     selected.protein_per_serving * servings,
        carbs:       selected.carbs_per_serving   * servings,
        fat:         selected.fat_per_serving     * servings,
      };
    } else {
      body = {
        plan_date:   date,
        meal_type:   type,
        custom_name: customName,
        kcal:        parseFloat(customKcal) || 0,
        protein:     parseFloat(customP)    || 0,
        carbs:       parseFloat(customC)    || 0,
        fat:         parseFloat(customF)    || 0,
      };
    }
    const r = await fetch("/api/meal-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json() as { entry?: MealPlanEntry };
    if (j.entry) onAdd({ ...j.entry, recipe_name: selected?.name ?? null });
    setSaving(false);
  }

  return (
    <div className="ml-modal-overlay" onClick={onClose}>
      <div className="ml-modal" onClick={e => e.stopPropagation()}>
        <div className="ml-modal-header">
          <h2 className="ml-modal-title">{MEAL_ICONS[type]} Add to {MEAL_LABELS[type]}</h2>
          <button className="bk-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="ml-mode-tabs">
          <button className={`ml-mode-tab${mode === "recipe" ? " active" : ""}`} onClick={() => setMode("recipe")}>From Recipe</button>
          <button className={`ml-mode-tab${mode === "custom" ? " active" : ""}`} onClick={() => setMode("custom")}>Custom</button>
        </div>

        {mode === "recipe" ? (
          <div className="ml-recipe-picker">
            <input className="ml-search" placeholder="Search recipes…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            <div className="ml-recipe-list">
              {filtered.length === 0 && <p className="ml-empty">No recipes yet. Add some in the Recipe Book tab.</p>}
              {filtered.map(r => (
                <button key={r.id} className={`ml-recipe-pick${selected?.id === r.id ? " active" : ""}`} onClick={() => setSelected(r)}>
                  <span className="ml-recipe-pick-emoji">{r.emoji}</span>
                  <div className="ml-recipe-pick-info">
                    <span className="ml-recipe-pick-name">{r.name}</span>
                    <span className="ml-recipe-pick-macros">{r.kcal_per_serving} kcal · {r.protein_per_serving}g P · {r.carbs_per_serving}g C · {r.fat_per_serving}g F</span>
                  </div>
                  {selected?.id === r.id && <span className="ml-recipe-pick-check">✓</span>}
                </button>
              ))}
            </div>
            {selected && (
              <div className="ml-servings-row">
                <label className="ml-label">Servings</label>
                <input className="ml-input-sm" type="number" min={0.5} max={10} step={0.5} value={servings} onChange={e => setServings(parseFloat(e.target.value) || 1)} />
                <span className="ml-servings-preview">= {Math.round(selected.kcal_per_serving * servings)} kcal · {Math.round(selected.protein_per_serving * servings)}g protein</span>
              </div>
            )}
          </div>
        ) : (
          <div className="ml-custom-form">
            <input className="ml-input" placeholder="Meal name *" value={customName} onChange={e => setCustomName(e.target.value)} autoFocus />
            <div className="ml-macro-inputs">
              <div className="ml-macro-field"><label className="ml-label">Calories</label><input className="ml-input-sm" type="number" placeholder="kcal" value={customKcal} onChange={e => setCustomKcal(e.target.value)} /></div>
              <div className="ml-macro-field"><label className="ml-label">Protein (g)</label><input className="ml-input-sm" type="number" placeholder="g" value={customP} onChange={e => setCustomP(e.target.value)} /></div>
              <div className="ml-macro-field"><label className="ml-label">Carbs (g)</label><input className="ml-input-sm" type="number" placeholder="g" value={customC} onChange={e => setCustomC(e.target.value)} /></div>
              <div className="ml-macro-field"><label className="ml-label">Fat (g)</label><input className="ml-input-sm" type="number" placeholder="g" value={customF} onChange={e => setCustomF(e.target.value)} /></div>
            </div>
          </div>
        )}

        <div className="ml-modal-footer">
          <button className="bk-btn" onClick={onClose}>Cancel</button>
          <button className="bk-btn-primary" onClick={() => void save()} disabled={saving || (mode === "recipe" ? !selected : !customName.trim())}>
            {saving ? "Adding…" : "Add to Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recipe Book ───────────────────────────────────────────────────────────────

function RecipeBook() {
  const [recipes, setRecipes]   = useState<Recipe[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Recipe | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    const r = await fetch(`/api/recipes${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const j = await r.json() as { recipes?: Recipe[] };
    setRecipes(j.recipes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleSearch(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void load(v), 280);
  }

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes?id=${id}`, { method: "DELETE" });
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  return (
    <div className="ml-recipe-layout">
      {/* Left list */}
      <div className="ml-recipe-sidebar">
        <div className="ml-recipe-sidebar-header">
          <input className="ml-search" placeholder="Search recipes…" value={search} onChange={e => handleSearch(e.target.value)} />
          <button className="bk-btn-primary" style={{ whiteSpace: "nowrap" }} onClick={() => { setEditing(null); setShowForm(true); }}>+ Recipe</button>
        </div>
        {loading ? <p className="ml-empty">Loading…</p> : recipes.length === 0 ? (
          <div className="ml-empty-recipes">
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>🍳</div>
            <p>No recipes yet. Add your first one!</p>
          </div>
        ) : (
          <div className="ml-recipe-cards">
            {recipes.map(r => (
              <button key={r.id} className={`ml-recipe-card${selected?.id === r.id ? " active" : ""}`} onClick={() => setSelected(r)}>
                <div className="ml-recipe-emoji-bg" style={{ background: r.color }}>{r.emoji}</div>
                <div className="ml-recipe-card-info">
                  <div className="ml-recipe-card-name">{r.name}</div>
                  <div className="ml-recipe-card-kcal">{r.kcal_per_serving} kcal / serving</div>
                  <div className="ml-recipe-card-macros">P {r.protein_per_serving}g · C {r.carbs_per_serving}g · F {r.fat_per_serving}g</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right detail */}
      {selected ? (
        <RecipeDetail
          recipe={selected}
          onEdit={() => { setEditing(selected); setShowForm(true); }}
          onDelete={() => void deleteRecipe(selected.id)}
        />
      ) : (
        <div className="ml-recipe-detail-empty">
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📖</div>
          <p>Select a recipe to view details</p>
        </div>
      )}

      {showForm && (
        <RecipeForm
          recipe={editing}
          onSave={() => { setShowForm(false); setEditing(null); void load(search); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ── Recipe Detail ─────────────────────────────────────────────────────────────

function RecipeDetail({ recipe, onEdit, onDelete }: { recipe: Recipe; onEdit: () => void; onDelete: () => void }) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  return (
    <div className="ml-recipe-detail">
      <div className="ml-recipe-detail-header">
        <div className="ml-recipe-hero" style={{ background: recipe.color }}>
          <span className="ml-recipe-hero-emoji">{recipe.emoji}</span>
        </div>
        <div className="ml-recipe-detail-meta">
          <h2 className="ml-recipe-detail-name">{recipe.name}</h2>
          {recipe.description && <p className="ml-recipe-detail-desc">{recipe.description}</p>}
          <div className="ml-recipe-detail-chips">
            {recipe.servings && <span className="ml-chip">🍽️ {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}</span>}
            {totalTime > 0 && <span className="ml-chip">⏱️ {totalTime} min</span>}
            {recipe.tags.map(t => <span key={t} className="ml-chip ml-chip-blue">{t}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="bk-icon-btn" onClick={onEdit}>✏️</button>
          <button className="bk-icon-btn" onClick={onDelete}>🗑️</button>
        </div>
      </div>

      {/* Macro cards */}
      <div className="ml-macro-cards">
        <div className="ml-macro-card ml-macro-kcal">
          <span className="ml-macro-card-val">{recipe.kcal_per_serving}</span>
          <span className="ml-macro-card-label">Calories</span>
          {macroBar(recipe.kcal_per_serving, KCAL_GOAL / 3, "#3D52D5")}
        </div>
        <div className="ml-macro-card ml-macro-protein">
          <span className="ml-macro-card-val">{recipe.protein_per_serving}g</span>
          <span className="ml-macro-card-label">Protein</span>
          {macroBar(recipe.protein_per_serving, P_GOAL / 3, "#3D52D5")}
        </div>
        <div className="ml-macro-card ml-macro-carbs">
          <span className="ml-macro-card-val">{recipe.carbs_per_serving}g</span>
          <span className="ml-macro-card-label">Carbs</span>
          {macroBar(recipe.carbs_per_serving, C_GOAL / 3, "#CA8A04")}
        </div>
        <div className="ml-macro-card ml-macro-fat">
          <span className="ml-macro-card-val">{recipe.fat_per_serving}g</span>
          <span className="ml-macro-card-label">Fat</span>
          {macroBar(recipe.fat_per_serving, F_GOAL / 3, "#16A34A")}
        </div>
      </div>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="ml-recipe-section">
          <div className="ml-recipe-section-title">Ingredients ({recipe.servings} serving{recipe.servings !== 1 ? "s" : ""})</div>
          <ul className="ml-ingredients">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="ml-ingredient-row">
                <span className="ml-ingredient-amount">{ing.amount} {ing.unit}</span>
                <span className="ml-ingredient-name">{ing.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      {recipe.instructions && (
        <div className="ml-recipe-section">
          <div className="ml-recipe-section-title">Instructions</div>
          <div className="ml-instructions">{recipe.instructions}</div>
        </div>
      )}
    </div>
  );
}

// ── Recipe Form ───────────────────────────────────────────────────────────────

function RecipeForm({ recipe, onSave, onCancel }: { recipe: Recipe | null; onSave: () => void; onCancel: () => void }) {
  const [name, setName]           = useState(recipe?.name ?? "");
  const [desc, setDesc]           = useState(recipe?.description ?? "");
  const [emoji, setEmoji]         = useState(recipe?.emoji ?? "🍽️");
  const [color, setColor]         = useState(recipe?.color ?? RECIPE_COLORS[0]!);
  const [servings, setServings]   = useState(String(recipe?.servings ?? 1));
  const [prepTime, setPrepTime]   = useState(String(recipe?.prep_time ?? ""));
  const [cookTime, setCookTime]   = useState(String(recipe?.cook_time ?? ""));
  const [kcal, setKcal]           = useState(String(recipe?.kcal_per_serving ?? ""));
  const [protein, setProtein]     = useState(String(recipe?.protein_per_serving ?? ""));
  const [carbs, setCarbs]         = useState(String(recipe?.carbs_per_serving ?? ""));
  const [fat, setFat]             = useState(String(recipe?.fat_per_serving ?? ""));
  const [ingredients, setIngredients] = useState<Ingredient[]>(recipe?.ingredients ?? [{ name: "", amount: "", unit: "" }]);
  const [instructions, setInstructions] = useState(recipe?.instructions ?? "");
  const [tags, setTags]           = useState<string[]>(recipe?.tags ?? []);
  const [saving, setSaving]       = useState(false);

  function addIngredient() { setIngredients(prev => [...prev, { name: "", amount: "", unit: "" }]); }
  function updateIng(i: number, field: keyof Ingredient, val: string) {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing));
  }
  function removeIng(i: number) { setIngredients(prev => prev.filter((_, idx) => idx !== i)); }
  function toggleTag(t: string) { setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]); }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const body = {
      name: name.trim(), description: desc || null, emoji, color,
      servings: parseInt(servings) || 1,
      prep_time: prepTime ? parseInt(prepTime) : null,
      cook_time: cookTime ? parseInt(cookTime) : null,
      kcal_per_serving:    parseFloat(kcal)    || 0,
      protein_per_serving: parseFloat(protein) || 0,
      carbs_per_serving:   parseFloat(carbs)   || 0,
      fat_per_serving:     parseFloat(fat)     || 0,
      ingredients: ingredients.filter(i => i.name.trim()),
      instructions: instructions || null,
      tags,
    };
    if (recipe) {
      await fetch(`/api/recipes?id=${recipe.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/recipes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="ml-modal-overlay" onClick={onCancel}>
      <div className="ml-modal ml-modal-large" onClick={e => e.stopPropagation()}>
        <div className="ml-modal-header">
          <h2 className="ml-modal-title">{recipe ? "Edit Recipe" : "New Recipe"}</h2>
          <button className="bk-icon-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="ml-form-body">
          {/* Emoji + color */}
          <div className="ml-form-row">
            <div>
              <label className="ml-label">Icon</label>
              <div className="ml-emoji-grid">
                {RECIPE_EMOJIS.map(e => <button key={e} className={`ml-emoji-btn${emoji === e ? " active" : ""}`} onClick={() => setEmoji(e)}>{e}</button>)}
              </div>
            </div>
            <div>
              <label className="ml-label">Colour</label>
              <div className="ml-color-row">
                {RECIPE_COLORS.map(c => <button key={c} className={`bk-color-dot${color === c ? " active" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />)}
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="ml-form-grid">
            <div className="ml-form-field ml-form-full"><label className="ml-label">Recipe Name *</label><input className="ml-input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken Rice Bowl" /></div>
            <div className="ml-form-field ml-form-full"><label className="ml-label">Description</label><input className="ml-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description…" /></div>
            <div className="ml-form-field"><label className="ml-label">Servings</label><input className="ml-input" type="number" min={1} value={servings} onChange={e => setServings(e.target.value)} /></div>
            <div className="ml-form-field"><label className="ml-label">Prep time (min)</label><input className="ml-input" type="number" min={0} value={prepTime} onChange={e => setPrepTime(e.target.value)} /></div>
            <div className="ml-form-field"><label className="ml-label">Cook time (min)</label><input className="ml-input" type="number" min={0} value={cookTime} onChange={e => setCookTime(e.target.value)} /></div>
          </div>

          {/* Macros */}
          <div className="ml-section-title">Nutrition (per serving)</div>
          <div className="ml-form-grid">
            <div className="ml-form-field"><label className="ml-label">Calories (kcal)</label><input className="ml-input" type="number" min={0} value={kcal} onChange={e => setKcal(e.target.value)} placeholder="0" /></div>
            <div className="ml-form-field"><label className="ml-label">Protein (g)</label><input className="ml-input" type="number" min={0} step={0.1} value={protein} onChange={e => setProtein(e.target.value)} placeholder="0" /></div>
            <div className="ml-form-field"><label className="ml-label">Carbs (g)</label><input className="ml-input" type="number" min={0} step={0.1} value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0" /></div>
            <div className="ml-form-field"><label className="ml-label">Fat (g)</label><input className="ml-input" type="number" min={0} step={0.1} value={fat} onChange={e => setFat(e.target.value)} placeholder="0" /></div>
          </div>

          {/* Tags */}
          <div className="ml-section-title">Tags</div>
          <div className="ml-tags-grid">
            {TAGS.map(t => <button key={t} className={`ml-tag-btn${tags.includes(t) ? " active" : ""}`} onClick={() => toggleTag(t)}>{t}</button>)}
          </div>

          {/* Ingredients */}
          <div className="ml-section-title">Ingredients</div>
          {ingredients.map((ing, i) => (
            <div key={i} className="ml-ing-row">
              <input className="ml-input ml-ing-amount" placeholder="Amount" value={ing.amount} onChange={e => updateIng(i, "amount", e.target.value)} />
              <input className="ml-input ml-ing-unit" placeholder="Unit" value={ing.unit} onChange={e => updateIng(i, "unit", e.target.value)} />
              <input className="ml-input" placeholder="Ingredient name" value={ing.name} onChange={e => updateIng(i, "name", e.target.value)} style={{ flex: 1 }} />
              <button className="bk-icon-btn" onClick={() => removeIng(i)}>×</button>
            </div>
          ))}
          <button className="ml-add-ing-btn" onClick={addIngredient}>+ Add ingredient</button>

          {/* Instructions */}
          <div className="ml-section-title">Instructions</div>
          <textarea className="ml-textarea" rows={4} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Step by step instructions…" />
        </div>

        <div className="ml-modal-footer">
          <button className="bk-btn" onClick={onCancel}>Cancel</button>
          <button className="bk-btn-primary" onClick={() => void save()} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : recipe ? "Save Changes" : "Create Recipe"}
          </button>
        </div>
      </div>
    </div>
  );
}
