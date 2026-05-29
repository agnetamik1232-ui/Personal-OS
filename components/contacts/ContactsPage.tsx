"use client";

import { useState, useEffect, useCallback } from "react";
import type { Contact }                      from "@/app/api/contacts/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(dateKey: string | null): number | null {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  const then = Date.UTC(y, m - 1, d);
  return Math.floor((Date.now() - then) / 86_400_000);
}

function staleness(contact: Contact): "fresh" | "warm" | "cold" | "none" {
  const n = daysSince(contact.last_contact);
  if (n === null) return "none";
  if (n <= 14)   return "fresh";
  if (n <= 45)   return "warm";
  return "cold";
}

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY: Partial<Contact> = {
  name: "", company: "", email: "", phone: "", role: "", notes: "",
  last_contact: "", tags: [],
};

// ── Contact form modal ────────────────────────────────────────────────────────

function ContactForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Contact;
  onSave: (c: Contact) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Contact>>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(key: keyof Contact, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name?.trim()) { setErr("Name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const url    = initial ? `/api/contacts?id=${initial.id}` : "/api/contacts";
      const method = initial ? "PATCH" : "POST";
      const r      = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json() as { contact?: Contact; error?: string };
      if (j.error) { setErr(j.error); return; }
      if (j.contact) onSave(j.contact);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title">{initial ? "Edit contact" : "New contact"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="contact-form">
          {[
            { label: "Name *",    key: "name",    type: "text" },
            { label: "Company",   key: "company", type: "text" },
            { label: "Role",      key: "role",    type: "text" },
            { label: "Email",     key: "email",   type: "email" },
            { label: "Phone",     key: "phone",   type: "tel" },
            { label: "Last contact", key: "last_contact", type: "date" },
          ].map(({ label, key, type }) => (
            <label key={key} className="contact-field">
              <span className="contact-field-label">{label}</span>
              <input
                type={type}
                className="contact-input"
                value={(form[key as keyof Contact] as string) ?? ""}
                onChange={(e) => set(key as keyof Contact, e.target.value)}
              />
            </label>
          ))}
          <label className="contact-field">
            <span className="contact-field-label">Notes</span>
            <textarea
              className="contact-input contact-textarea"
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </label>
          {err && <p className="contact-err">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [editing, setEditing]   = useState<Contact | null | "new">(null);
  const [selected, setSelected] = useState<Contact | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/contacts");
      const j = await r.json() as { contacts: Contact[] };
      setContacts(j.contacts ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleSave(c: Contact) {
    setContacts((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [...prev, c].sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditing(null);
    setSelected(c);
  }

  const filtered = contacts.filter((c) =>
    !search.trim() || [c.name, c.company, c.email, c.role].some(
      (f) => f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="contacts-layout">
      {/* ── List panel ── */}
      <div className="contacts-list-panel">
        <div className="contacts-list-head">
          <input
            className="contacts-search"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-primary contacts-add-btn" onClick={() => setEditing("new")}>+ Add</button>
        </div>

        {loading ? (
          <p className="contacts-loading">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="contacts-empty">{search ? "No matches." : "No contacts yet. Add your first one!"}</p>
        ) : (
          <ul className="contacts-list">
            {filtered.map((c) => {
              const stale = staleness(c);
              return (
                <li
                  key={c.id}
                  className={`contact-item${selected?.id === c.id ? " contact-item-active" : ""}`}
                  onClick={() => setSelected(c)}
                >
                  <div className="contact-avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="contact-item-info">
                    <div className="contact-item-name">{c.name}</div>
                    <div className="contact-item-sub">
                      {[c.role, c.company].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className={`contact-stale contact-stale-${stale}`} title={
                    stale === "none" ? "Never contacted" :
                    stale === "fresh" ? "Contacted recently" :
                    stale === "warm" ? "Contacted within 6 weeks" :
                    "Needs follow-up"
                  } />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Detail panel ── */}
      <div className="contacts-detail-panel">
        {!selected ? (
          <div className="contacts-detail-empty">
            <p>Select a contact to view details</p>
          </div>
        ) : (
          <div className="contacts-detail">
            <div className="contacts-detail-head">
              <div className="contact-detail-avatar">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="contact-detail-name">{selected.name}</h2>
                {selected.role && <p className="contact-detail-role">{selected.role}</p>}
                {selected.company && <p className="contact-detail-company">{selected.company}</p>}
              </div>
              <button className="btn-ghost contact-edit-btn" onClick={() => setEditing(selected)}>Edit</button>
            </div>

            <div className="contact-detail-fields">
              {selected.email && (
                <div className="contact-detail-field">
                  <span className="contact-detail-label">Email</span>
                  <a href={`mailto:${selected.email}`} className="contact-detail-val contact-link">{selected.email}</a>
                </div>
              )}
              {selected.phone && (
                <div className="contact-detail-field">
                  <span className="contact-detail-label">Phone</span>
                  <a href={`tel:${selected.phone}`} className="contact-detail-val contact-link">{selected.phone}</a>
                </div>
              )}
              {selected.last_contact && (
                <div className="contact-detail-field">
                  <span className="contact-detail-label">Last contact</span>
                  <span className="contact-detail-val">
                    {selected.last_contact}
                    {daysSince(selected.last_contact) !== null && (
                      <span className="contact-days-ago"> ({daysSince(selected.last_contact)}d ago)</span>
                    )}
                  </span>
                </div>
              )}
              {selected.tags?.length > 0 && (
                <div className="contact-detail-field">
                  <span className="contact-detail-label">Tags</span>
                  <span className="contact-detail-val">{selected.tags.join(", ")}</span>
                </div>
              )}
            </div>

            {selected.notes && (
              <div className="contact-notes">
                <span className="contact-detail-label">Notes</span>
                <p className="contact-notes-text">{selected.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {editing && editing !== "new" && (
        <ContactForm
          initial={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {editing === "new" && (
        <ContactForm
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
