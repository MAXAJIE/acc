import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Plus, Pencil, Trash2, Search, X, Eye } from "lucide-react";
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/documents.functions";
import {
  DOC_SCHEMAS,
  DOC_SCHEMA_BY_KEY,
  type DocSchema,
  type FieldDef,
} from "@/lib/document-schemas";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const qc = useQueryClient();
  const fetchDocs = useServerFn(listDocuments);
  const doCreate = useServerFn(createDocument);
  const doUpdate = useServerFn(updateDocument);
  const doDelete = useServerFn(deleteDocument);

  const q = useQuery({ queryKey: ["documents"], queryFn: () => fetchDocs() });
  const docs = (q.data ?? []) as any[];

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; schema: DocSchema; row?: any } | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (filter !== "all" && d.doc_type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (d.title ?? "").toLowerCase().includes(q) ||
          (d.doc_number ?? "").toLowerCase().includes(q) ||
          (d.customer_name ?? "").toLowerCase().includes(q) ||
          (d.vehicle_ref ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [docs, filter, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["documents"] });

  const createM = useMutation({
    mutationFn: doCreate,
    onSuccess: () => {
      toast.success("Document saved");
      invalidate();
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateM = useMutation({
    mutationFn: doUpdate,
    onSuccess: () => {
      toast.success("Updated");
      invalidate();
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Central record of every SPA, invoice, receipt, loan, JPJ transfer, insurance and payment log.
          </p>
        </div>
        <div className="relative">
          <details className="group">
            <summary className="btn-primary inline-flex cursor-pointer items-center gap-1 rounded-md px-3 py-2 text-sm">
              <Plus className="h-4 w-4" /> New document
            </summary>
            <div className="absolute right-0 z-30 mt-2 grid w-[520px] max-w-[92vw] grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card p-2 shadow-xl">
              {DOC_SCHEMAS.map((s) => (
                <button
                  key={s.key}
                  onClick={(e) => {
                    (e.currentTarget.closest("details") as HTMLDetailsElement).open = false;
                    setEditing({ mode: "create", schema: s });
                  }}
                  className="flex items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted"
                >
                  <span
                    className="inline-flex h-8 w-10 items-center justify-center rounded-md text-[10px] font-bold text-white"
                    style={{ background: s.accent }}
                  >
                    {s.short}
                  </span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All (${docs.length})`} />
        {DOC_SCHEMAS.map((s) => {
          const count = docs.filter((d) => d.doc_type === s.key).length;
          return (
            <FilterChip
              key={s.key}
              active={filter === s.key}
              onClick={() => setFilter(s.key)}
              label={`${s.short} · ${count}`}
              color={s.accent}
            />
          );
        })}
        <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-56 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6 opacity-60" />
          No documents in this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Number</th>
                <th className="p-3">Title</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const s = DOC_SCHEMA_BY_KEY[d.doc_type];
                return (
                  <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="p-3">
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: s?.accent ?? "#666" }}
                      >
                        {s?.short ?? d.doc_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">{d.doc_number ?? "—"}</td>
                    <td className="p-3">{d.title}</td>
                    <td className="p-3">{d.customer_name ?? "—"}</td>
                    <td className="p-3">{d.vehicle_ref ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{d.doc_date ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded p-1 hover:bg-muted"
                          onClick={() => setPreview(d)}
                          aria-label="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1 hover:bg-muted"
                          onClick={() =>
                            s && setEditing({ mode: "edit", schema: s, row: d })
                          }
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1 hover:bg-muted"
                          onClick={async () => {
                            if (!confirm("Delete this document?")) return;
                            await doDelete({ data: { id: d.id } });
                            invalidate();
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <DocumentForm
          schema={editing.schema}
          initial={editing.row}
          busy={createM.isPending || updateM.isPending}
          onCancel={() => setEditing(null)}
          onSubmit={(payload) => {
            if (editing.mode === "create") {
              createM.mutate({ data: payload });
            } else {
              updateM.mutate({ data: { id: editing.row.id, patch: payload } });
            }
          }}
        />
      )}

      {preview && <DocumentPreview row={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function FilterChip({
  active, onClick, label, color,
}: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs transition " +
        (active
          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:bg-muted")
      }
      style={active && color ? { background: color } : undefined}
    >
      {label}
    </button>
  );
}

function DocumentForm({
  schema, initial, busy, onCancel, onSubmit,
}: {
  schema: DocSchema;
  initial?: any;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: any) => void;
}) {
  const initialData = (initial?.data as Record<string, any>) ?? {};
  const [values, setValues] = useState<Record<string, any>>(initialData);
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");

  const setV = (k: string, v: any) => setValues((prev) => ({ ...prev, [k]: v }));

  const buildPayload = () => {
    const docNumber = schema.numberField ? values[schema.numberField] ?? null : null;
    const docDate = schema.dateField ? values[schema.dateField] ?? null : null;
    const customer = schema.customerField ? values[schema.customerField] ?? null : null;
    const vehicle = schema.vehicleField ? values[schema.vehicleField] ?? null : null;
    const title =
      docNumber
        ? `${schema.short} · ${docNumber}`
        : customer
          ? `${schema.short} · ${customer}`
          : schema.label;
    return {
      doc_type: schema.key,
      doc_number: docNumber ? String(docNumber) : null,
      doc_date: docDate || null,
      title,
      customer_name: customer ? String(customer) : null,
      vehicle_ref: vehicle ? String(vehicle) : null,
      data: values,
      notes: notes || null,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(buildPayload());
        }}
        className="w-full max-w-3xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-10 w-14 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: schema.accent }}
          >
            {schema.short}
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{schema.label}</h2>
            <p className="text-xs text-muted-foreground">{schema.labelZh}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {schema.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={values[f.key]}
              onChange={(v) => setV(f.key, v)}
            />
          ))}
        </div>

        <label className="block text-xs text-muted-foreground">
          Internal notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-primary rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {initial ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  field, value, onChange,
}: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  const wrap = field.cols === 2 ? "col-span-2" : "";
  const label = (
    <span className="text-xs text-muted-foreground">
      {field.label}
      {field.required && <span className="text-destructive"> *</span>}
    </span>
  );
  const cls =
    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  if (field.type === "textarea") {
    return (
      <label className={`block ${wrap}`}>
        {label}
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cls}
        />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label className={`block ${wrap}`}>
        {label}
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  }
  if (field.type === "boolean") {
    return (
      <label className={`flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ${wrap}`}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }
  return (
    <label className={`block ${wrap}`}>
      {label}
      <input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value ?? ""}
        onChange={(e) =>
          onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
        }
        placeholder={field.placeholder}
        required={field.required}
        className={cls}
      />
    </label>
  );
}

function DocumentPreview({ row, onClose }: { row: any; onClose: () => void }) {
  const s = DOC_SCHEMA_BY_KEY[row.doc_type];
  const data = (row.data ?? {}) as Record<string, any>;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-10 w-14 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: s?.accent ?? "#666" }}
          >
            {s?.short ?? row.doc_type}
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{s?.label ?? row.doc_type}</h2>
            <p className="text-xs text-muted-foreground">
              {row.doc_number ?? "—"} · {row.doc_date ?? "—"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {s?.fields.map((f) => (
            <div key={f.key} className={f.cols === 2 ? "col-span-2" : ""}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {f.label}
              </div>
              <div className="whitespace-pre-wrap break-words">
                {data[f.key] === undefined || data[f.key] === "" || data[f.key] === null
                  ? "—"
                  : String(data[f.key])}
              </div>
            </div>
          ))}
        </div>
        {row.notes && (
          <div className="rounded-lg bg-muted p-3 text-xs">
            <div className="mb-1 font-semibold">Notes</div>
            <div className="whitespace-pre-wrap">{row.notes}</div>
          </div>
        )}
      </div>
    </div>
  );
}
