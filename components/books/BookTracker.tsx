"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Book } from "@/app/api/books/route";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  want: "Want to Read", reading: "Reading", finished: "Finished", dnf: "Did Not Finish",
};
const STATUS_ICONS: Record<string, string> = {
  want: "📚", reading: "📖", finished: "✅", dnf: "🚫",
};
const COVER_COLORS = [
  "#3D52D5","#7C3AED","#DB2777","#DC2626","#EA580C",
  "#CA8A04","#16A34A","#0891B2","#1D4ED8","#4B5563",
];
const GENRES = ["Fiction","Non-Fiction","Fantasy","Sci-Fi","Mystery","Romance","Biography","Self-Help","History","Psychology","Business","Health","Other"];

function initials(title: string) {
  return title.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function pct(current: number, total: number | null) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

// ── Main Component ────────────────────────────────────────────────────────────

export function BookTracker() {
  const [books, setBooks]       = useState<Book[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Book | null>(null);
  const [selected, setSelected] = useState<Book | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/books");
    const j = await r.json() as { books?: Book[] };
    setBooks(j.books ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = filter === "all" ? books : books.filter(b => b.status === filter);

  // Stats
  const finished    = books.filter(b => b.status === "finished").length;
  const reading     = books.filter(b => b.status === "reading").length;
  const wantToRead  = books.filter(b => b.status === "want").length;
  const totalPages  = books.filter(b => b.status === "finished").reduce((s, b) => s + (b.total_pages ?? 0), 0);
  const avgRating   = (() => {
    const rated = books.filter(b => b.rating !== null);
    return rated.length > 0 ? (rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length).toFixed(1) : null;
  })();

  async function deleteBook(id: string) {
    await fetch(`/api/books?id=${id}`, { method: "DELETE" });
    setBooks(prev => prev.filter(b => b.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function updateStatus(book: Book, status: Book["status"]) {
    const patch: Partial<Book> = { status };
    if (status === "reading" && !book.started_at) patch.started_at = new Date().toISOString().split("T")[0]!;
    if (status === "finished") { patch.finished_at = new Date().toISOString().split("T")[0]!; if (book.total_pages) patch.current_page = book.total_pages; }
    const r = await fetch(`/api/books?id=${book.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const j = await r.json() as { book?: Book };
    if (j.book) { setBooks(prev => prev.map(b => b.id === book.id ? j.book! : b)); setSelected(j.book); }
  }

  async function updatePage(book: Book, page: number) {
    const r = await fetch(`/api/books?id=${book.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_page: page }) });
    const j = await r.json() as { book?: Book };
    if (j.book) { setBooks(prev => prev.map(b => b.id === book.id ? j.book! : b)); setSelected(j.book); }
  }

  async function updateRating(book: Book, rating: number) {
    const r = await fetch(`/api/books?id=${book.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating }) });
    const j = await r.json() as { book?: Book };
    if (j.book) { setBooks(prev => prev.map(b => b.id === book.id ? j.book! : b)); setSelected(j.book); }
  }

  return (
    <div className="bk-shell">
      <PageHeader title="Books" subtitle="Your reading tracker"
        action={<button className="bk-btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Book</button>} />

      {/* Stats row */}
      <div className="bk-stats-row">
        <div className="bk-stat"><span className="bk-stat-val">{finished}</span><span className="bk-stat-label">Books read</span></div>
        <div className="bk-stat"><span className="bk-stat-val">{reading}</span><span className="bk-stat-label">Reading now</span></div>
        <div className="bk-stat"><span className="bk-stat-val">{wantToRead}</span><span className="bk-stat-label">Want to read</span></div>
        <div className="bk-stat"><span className="bk-stat-val">{totalPages > 0 ? totalPages.toLocaleString() : "—"}</span><span className="bk-stat-label">Pages read</span></div>
        <div className="bk-stat"><span className="bk-stat-val">{avgRating ? `${avgRating}★` : "—"}</span><span className="bk-stat-label">Avg rating</span></div>
      </div>

      {/* Filter tabs */}
      <div className="bk-filters">
        {["all","reading","want","finished","dnf"].map(f => (
          <button key={f} className={`bk-filter${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STATUS_ICONS[f] + " " + STATUS_LABELS[f]}
            <span className="bk-filter-count">{f === "all" ? books.length : books.filter(b => b.status === f).length}</span>
          </button>
        ))}
      </div>

      <div className="bk-layout">
        {/* Book grid */}
        <div className="bk-grid-wrap">
          {loading ? (
            <div className="bk-loading">Loading your library…</div>
          ) : filtered.length === 0 ? (
            <div className="bk-empty">
              <div className="bk-empty-icon">📚</div>
              <p>{filter === "all" ? "No books yet. Add your first one!" : `No books with status "${STATUS_LABELS[filter]}".`}</p>
            </div>
          ) : (
            <div className="bk-grid">
              {filtered.map(book => (
                <button key={book.id} className={`bk-book-card${selected?.id === book.id ? " active" : ""}`}
                  onClick={() => setSelected(selected?.id === book.id ? null : book)}>
                  {/* Cover */}
                  <div className="bk-cover" style={{ background: book.cover_color }}>
                    <span className="bk-cover-initials">{initials(book.title)}</span>
                    {book.status === "reading" && book.total_pages && (
                      <div className="bk-cover-progress">
                        <div className="bk-cover-progress-fill" style={{ width: `${pct(book.current_page, book.total_pages)}%` }} />
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="bk-book-info">
                    <div className="bk-book-title">{book.title}</div>
                    {book.author && <div className="bk-book-author">{book.author}</div>}
                    <div className="bk-book-meta">
                      {STATUS_ICONS[book.status]}
                      {book.status === "reading" && book.total_pages && (
                        <span className="bk-book-pct">{pct(book.current_page, book.total_pages)}%</span>
                      )}
                      {book.rating && <span className="bk-book-rating">{"★".repeat(book.rating)}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <BookDetail
            book={selected}
            onClose={() => setSelected(null)}
            onEdit={() => { setEditing(selected); setShowForm(true); }}
            onDelete={() => void deleteBook(selected.id)}
            onStatusChange={(s) => void updateStatus(selected, s)}
            onPageUpdate={(p) => void updatePage(selected, p)}
            onRating={(r) => void updateRating(selected, r)}
          />
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <BookForm
          book={editing}
          onSave={() => { setShowForm(false); setEditing(null); void load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

// ── Book Detail Panel ─────────────────────────────────────────────────────────

function BookDetail({ book, onClose, onEdit, onDelete, onStatusChange, onPageUpdate, onRating }: {
  book: Book;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
  onStatusChange: (s: Book["status"]) => void;
  onPageUpdate: (p: number) => void;
  onRating: (r: number) => void;
}) {
  const [pageInput, setPageInput] = useState(String(book.current_page));
  const progress = pct(book.current_page, book.total_pages);

  return (
    <div className="bk-detail">
      <div className="bk-detail-header">
        <div className="bk-detail-cover" style={{ background: book.cover_color }}>
          <span className="bk-detail-initials">{initials(book.title)}</span>
        </div>
        <div className="bk-detail-meta">
          <h2 className="bk-detail-title">{book.title}</h2>
          {book.author && <p className="bk-detail-author">by {book.author}</p>}
          {book.genre  && <span className="bk-genre-tag">{book.genre}</span>}
        </div>
        <div className="bk-detail-actions">
          <button className="bk-icon-btn" onClick={onEdit} title="Edit">✏️</button>
          <button className="bk-icon-btn" onClick={onDelete} title="Delete">🗑️</button>
          <button className="bk-icon-btn" onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      {/* Status buttons */}
      <div className="bk-status-row">
        {(["want","reading","finished","dnf"] as Book["status"][]).map(s => (
          <button key={s} className={`bk-status-btn${book.status === s ? " active" : ""}`}
            onClick={() => onStatusChange(s)}>
            {STATUS_ICONS[s]} {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Progress (only when reading) */}
      {book.status === "reading" && book.total_pages && (
        <div className="bk-progress-section">
          <div className="bk-progress-header">
            <span>Progress</span>
            <span className="bk-progress-pct">{progress}%</span>
          </div>
          <div className="bk-progress-bar"><div className="bk-progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="bk-page-input-row">
            <input className="bk-page-input" type="number" min={0} max={book.total_pages}
              value={pageInput} onChange={e => setPageInput(e.target.value)}
              onBlur={() => { const p = parseInt(pageInput) || 0; if (p !== book.current_page) onPageUpdate(p); }} />
            <span className="bk-page-total">/ {book.total_pages} pages</span>
          </div>
        </div>
      )}

      {/* Rating */}
      {(book.status === "finished" || book.status === "reading") && (
        <div className="bk-rating-section">
          <span className="bk-rating-label">Rating</span>
          <div className="bk-stars">
            {[1,2,3,4,5].map(n => (
              <button key={n} className={`bk-star${(book.rating ?? 0) >= n ? " filled" : ""}`}
                onClick={() => onRating(n)}>★</button>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="bk-dates">
        {book.started_at  && <span>📅 Started {new Date(book.started_at  + "T12:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</span>}
        {book.finished_at && <span>🏁 Finished {new Date(book.finished_at + "T12:00:00").toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</span>}
      </div>

      {/* Notes */}
      {book.notes && (
        <div className="bk-notes">
          <div className="bk-notes-label">Notes</div>
          <p className="bk-notes-text">{book.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Add/Edit Form ─────────────────────────────────────────────────────────────

function BookForm({ book, onSave, onCancel }: { book: Book | null; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle]         = useState(book?.title ?? "");
  const [author, setAuthor]       = useState(book?.author ?? "");
  const [genre, setGenre]         = useState(book?.genre ?? "");
  const [pages, setPages]         = useState(book?.total_pages ? String(book.total_pages) : "");
  const [status, setStatus]       = useState<Book["status"]>(book?.status ?? "want");
  const [color, setColor]         = useState(book?.cover_color ?? COVER_COLORS[0]!);
  const [notes, setNotes]         = useState(book?.notes ?? "");
  const [saving, setSaving]       = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const body: Partial<Book> = { title: title.trim(), author: author || null, genre: genre || null,
      total_pages: pages ? parseInt(pages) : null, status, cover_color: color, notes: notes || null };
    if (book) {
      await fetch(`/api/books?id=${book.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      if (status === "reading") body.started_at = new Date().toISOString().split("T")[0]!;
      if (status === "finished") { body.started_at = new Date().toISOString().split("T")[0]!; body.finished_at = new Date().toISOString().split("T")[0]!; }
      await fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="bk-modal-overlay" onClick={onCancel}>
      <div className="bk-modal" onClick={e => e.stopPropagation()}>
        <div className="bk-modal-header">
          <h2 className="bk-modal-title">{book ? "Edit Book" : "Add Book"}</h2>
          <button className="bk-icon-btn" onClick={onCancel}>✕</button>
        </div>

        {/* Cover color picker */}
        <div className="bk-color-preview" style={{ background: color }}>
          <span className="bk-color-initials">{title ? initials(title) : "📖"}</span>
        </div>
        <div className="bk-color-row">
          {COVER_COLORS.map(c => (
            <button key={c} className={`bk-color-dot${color === c ? " active" : ""}`}
              style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>

        <div className="bk-form-grid">
          <div className="bk-form-field bk-form-full">
            <label className="bk-form-label">Title *</label>
            <input className="bk-input" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title" />
          </div>
          <div className="bk-form-field">
            <label className="bk-form-label">Author</label>
            <input className="bk-input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author name" />
          </div>
          <div className="bk-form-field">
            <label className="bk-form-label">Genre</label>
            <select className="bk-select" value={genre} onChange={e => setGenre(e.target.value)}>
              <option value="">— Select genre —</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="bk-form-field">
            <label className="bk-form-label">Total pages</label>
            <input className="bk-input" type="number" min={1} value={pages} onChange={e => setPages(e.target.value)} placeholder="e.g. 320" />
          </div>
          <div className="bk-form-field">
            <label className="bk-form-label">Status</label>
            <select className="bk-select" value={status} onChange={e => setStatus(e.target.value as Book["status"])}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{STATUS_ICONS[k]} {v}</option>)}
            </select>
          </div>
          <div className="bk-form-field bk-form-full">
            <label className="bk-form-label">Notes / Review</label>
            <textarea className="bk-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Your thoughts, quotes, review…" />
          </div>
        </div>

        <div className="bk-modal-footer">
          <button className="bk-btn" onClick={onCancel}>Cancel</button>
          <button className="bk-btn-primary" onClick={() => void save()} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : book ? "Save Changes" : "Add Book"}
          </button>
        </div>
      </div>
    </div>
  );
}
