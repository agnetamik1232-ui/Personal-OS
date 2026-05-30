/**
 * POST /api/work/shift-report/generate
 * Collects today's work hub data and generates a Lithuanian end-of-shift report.
 */
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

function uid() {
  const v = process.env["OWNER_USER_ID"];
  if (!v) throw new Error("OWNER_USER_ID not set");
  return v;
}

function todayKey() {
  return new Date().toISOString().split("T")[0]!;
}

interface SnapshotData {
  shift_date:  string;
  notes:       { content: string; category: string }[];
  issues:      { title: string; priority: string; status: string; description?: string | null }[];
  ideas:       { title: string; impact: string; category: string; description?: string | null }[];
  defects:     { defect_type: string; quantity: number; workstation?: string | null; root_cause?: string | null; corrective_action?: string | null }[];
  checklist:   { title: string; done: boolean }[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json() as { snapshot?: SnapshotData };
    const sb   = await createAdminClient();
    const today = todayKey();

    // If snapshot not passed in, collect it now
    let snap: SnapshotData;
    if (body.snapshot) {
      snap = body.snapshot;
    } else {
      const [notesRes, issuesRes, ideasRes, defectsRes, checkRes, checkDoneRes] = await Promise.all([
        sb.from("work_notes").select("content,category").eq("user_id", uid()).eq("shift_date", today),
        sb.from("work_issues").select("title,priority,status,description").eq("user_id", uid()).neq("status", "closed"),
        sb.from("work_ideas").select("title,impact,category,description").eq("user_id", uid()).in("status", ["pending","approved","in_progress"]),
        sb.from("work_defects").select("defect_type,quantity,workstation,root_cause,corrective_action").eq("user_id", uid()).eq("shift_date", today),
        sb.from("work_checklist").select("id,title").eq("user_id", uid()).eq("active", true),
        sb.from("work_checklist_done").select("item_id").eq("user_id", uid()).eq("done_date", today),
      ]);
      const doneIds = new Set((checkDoneRes.data ?? []).map((r: { item_id: string }) => r.item_id));
      snap = {
        shift_date: today,
        notes:    (notesRes.data   ?? []) as SnapshotData["notes"],
        issues:   (issuesRes.data  ?? []) as SnapshotData["issues"],
        ideas:    (ideasRes.data   ?? []) as SnapshotData["ideas"],
        defects:  (defectsRes.data ?? []) as SnapshotData["defects"],
        checklist: (checkRes.data  ?? []).map((r: { id: string; title: string }) => ({ title: r.title, done: doneIds.has(r.id) })),
      };
    }

    // Build prompt
    const prompt = buildPrompt(snap);

    // Generate with Claude
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    let summaryLt: string;

    if (apiKey) {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model:      "claude-opus-4-5",
        max_tokens: 1024,
        messages:   [{ role: "user", content: prompt }],
      });
      const block = msg.content[0];
      summaryLt = block && block.type === "text" ? block.text : generateFallback(snap);
    } else {
      summaryLt = generateFallback(snap);
    }

    // Save snapshot + summary to shift report
    await sb.from("work_shift_reports").upsert({
      user_id:      uid(),
      shift_date:   today,
      summary_lt:   summaryLt,
      summary_data: snap as unknown as Record<string, unknown>,
    } as never, { onConflict: "user_id,shift_date" });

    return NextResponse.json({ summary: summaryLt, snapshot: snap });
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }); }
}

function buildPrompt(snap: SnapshotData): string {
  const lines: string[] = [];

  lines.push(`Data rinkimo data: ${snap.shift_date}`);
  lines.push("");

  if (snap.checklist.length > 0) {
    lines.push("KONTROLINIS SĄRAŠAS:");
    snap.checklist.forEach(c => lines.push(`  [${c.done ? "x" : " "}] ${c.title}`));
    lines.push("");
  }

  if (snap.notes.length > 0) {
    lines.push("PASTABOS / GAMYBOS ŽURNALAS:");
    snap.notes.forEach(n => lines.push(`  [${n.category}] ${n.content}`));
    lines.push("");
  }

  if (snap.issues.length > 0) {
    lines.push("PROBLEMOS:");
    snap.issues.forEach(i => lines.push(`  [${i.priority}/${i.status}] ${i.title}${i.description ? ": " + i.description : ""}`));
    lines.push("");
  }

  if (snap.defects.length > 0) {
    lines.push("DEFEKTAI:");
    snap.defects.forEach(d => {
      let line = `  ${d.defect_type} (kiekis: ${d.quantity})`;
      if (d.workstation) line += `, stotelė: ${d.workstation}`;
      if (d.root_cause)  line += `, priežastis: ${d.root_cause}`;
      if (d.corrective_action) line += `, veiksmai: ${d.corrective_action}`;
      lines.push(line);
    });
    lines.push("");
  }

  if (snap.ideas.length > 0) {
    lines.push("PASIŪLYMAI / IDĖJOS:");
    snap.ideas.forEach(i => lines.push(`  [${i.impact} poveikis, ${i.category}] ${i.title}${i.description ? ": " + i.description : ""}`));
    lines.push("");
  }

  return `Tu esi gamybos komandos vadovo ataskaitos generatorius. Sugeneruok profesionalią pamainos pabaigos ataskaitą LIETUVIŲ KALBA, remdamasis šiais duomenimis:

${lines.join("\n")}

Reikalavimai:
- Rašyk aiškiai ir profesionaliai lietuvių kalba
- Struktūra: trumpas apibendrinimas → kontrolinio sąrašo būsena → pastabos → problemos → defektai → idėjos
- Naudok gamybinę terminiją
- Paminėk svarbiausius dalykus, kuriems reikia dėmesio kitą pamainą
- Ataskaita turėtų būti 150–300 žodžių
- NERAŠYK antraščių ar pažymų — tik glotnų profesionalų tekstą`;
}

function generateFallback(snap: SnapshotData): string {
  const doneCount  = snap.checklist.filter(c => c.done).length;
  const totalCount = snap.checklist.length;
  const openIssues = snap.issues.filter(i => i.status === "open" || i.status === "in_progress").length;
  const defectQty  = snap.defects.reduce((s, d) => s + d.quantity, 0);

  const parts: string[] = [];
  parts.push(`Pamainos ataskaita, ${snap.shift_date}.`);
  if (totalCount > 0) parts.push(`Kontrolinis sąrašas: ${doneCount}/${totalCount} užduočių atlikta.`);
  if (snap.notes.length > 0) parts.push(`Užfiksuota ${snap.notes.length} gamybos pastaba(-ų).`);
  if (openIssues > 0) parts.push(`Aktyvių problemų: ${openIssues}. Reikalingas dėmesys.`);
  if (defectQty > 0) parts.push(`Šios pamainos defektai: ${defectQty} vnt. (${snap.defects.map(d => d.defect_type).join(", ")}).`);
  if (snap.ideas.length > 0) parts.push(`Pateikta ${snap.ideas.length} pasiūlymas(-ų) gerinimui.`);
  parts.push("Pamainos pabaiga.");

  return parts.join(" ");
}
