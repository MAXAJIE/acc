import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
} from "@/lib/agents.functions";
import { grantAgentRole } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchList = useServerFn(listAgents);
  const doCreate = useServerFn(createAgent);
  const doUpdate = useServerFn(updateAgent);
  const doDelete = useServerFn(deleteAgent);
  const doGrant = useServerFn(grantAgentRole);

  const { data, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetchList(),
  });
  const [editing, setEditing] = useState<any | null>(null);
  const [granting, setGranting] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["agents"] });

  const save = useMutation({
    mutationFn: async (form: any) => {
      if (form.id) return doUpdate({ data: { id: form.id, patch: form } });
      return doCreate({ data: form });
    },
    onSuccess: () => {
      toast.success(t("saved"));
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("agents")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "agent" : "agents"}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setGranting(true)} className="btn-ghost">
            <UserPlus className="h-4 w-4" /> Grant agent role
          </button>
          <button
            onClick={() =>
              setEditing({
                name: "",
                phone: "",
                employment_type: "independent",
                commission_percent: null,
                user_id: null,
              })
            }
            className="btn-primary"
          >
            <Plus className="h-4 w-4" /> {t("add_agent")}
          </button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <div className="panel p-12 text-center text-sm text-muted-foreground">
          {t("no_agents")}
        </div>
      ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("phone")}</th>
                <th>{t("employment_type")}</th>
                <th className="!text-right">{t("commission_percent")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a: any) => {
                const initials = (a.name ?? "?")
                  .split(/\s+/)
                  .map((s: string) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar">{initials}</span>
                        <div className="font-medium">{a.name}</div>
                      </div>
                    </td>
                    <td className="text-muted-foreground">{a.phone ?? "—"}</td>
                    <td>
                      <span
                        className={
                          a.employment_type === "employee"
                            ? "badge badge-primary"
                            : "badge badge-success"
                        }
                      >
                        {a.employment_type === "employee" ? t("employee") : t("independent")}
                      </span>
                    </td>
                    <td className="mono !text-right">
                      {a.commission_percent == null
                        ? t("global_default")
                        : `${a.commission_percent}%`}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded p-1.5 hover:bg-muted"
                          onClick={() => setEditing(a)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1.5 hover:bg-muted text-destructive/70 hover:text-destructive"
                          onClick={async () => {
                            if (!confirm("Delete?")) return;
                            await doDelete({ data: { id: a.id } });
                            invalidate();
                          }}
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({
                ...editing,
                commission_percent:
                  editing.commission_percent === "" || editing.commission_percent == null
                    ? null
                    : Number(editing.commission_percent),
                user_id: editing.user_id || null,
              });
            }}
            className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg"
          >
            <h2 className="text-lg font-semibold">
              {editing.id ? t("edit") : t("add_agent")}
            </h2>
            <Field label={t("name")} v={editing.name} on={(v) => setEditing({ ...editing, name: v })} required />
            <Field label={t("phone")} v={editing.phone} on={(v) => setEditing({ ...editing, phone: v })} />
            <label className="block text-xs text-muted-foreground">
              {t("employment_type")}
              <select
                value={editing.employment_type}
                onChange={(e) => setEditing({ ...editing, employment_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="independent">{t("independent")}</option>
                <option value="employee">{t("employee")}</option>
              </select>
            </label>
            <Field
              label={t("commission_percent") + " — leave blank for " + t("global_default")}
              type="number"
              step="0.01"
              v={editing.commission_percent ?? ""}
              on={(v) => setEditing({ ...editing, commission_percent: v })}
            />
            <Field
              label="Linked auth user id (UUID) — optional"
              v={editing.user_id ?? ""}
              on={(v) => setEditing({ ...editing, user_id: v })}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-border px-4 py-2 text-sm">
                {t("cancel")}
              </button>
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                {t("save")}
              </button>
            </div>
          </form>
        </div>
      )}

      {granting && (
        <GrantRoleModal
          onCancel={() => setGranting(false)}
          onGrant={async (uid) => {
            try {
              await doGrant({ data: { user_id: uid } });
              toast.success(t("saved"));
              setGranting(false);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      )}
    </div>
  );
}

function GrantRoleModal({
  onCancel,
  onGrant,
}: {
  onCancel: () => void;
  onGrant: (uid: string) => void;
}) {
  const [uid, setUid] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">Grant agent role</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask the agent to sign up, then paste their user id (auth.users.id) here.
        </p>
        <input
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="uuid"
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={() => onGrant(uid)}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Grant
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, v, on, type = "text", step, required,
}: {
  label: string; v: any; on: (v: any) => void;
  type?: string; step?: string; required?: boolean;
}) {
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <input
        type={type}
        step={step}
        required={required}
        value={v ?? ""}
        onChange={(e) => on(e.target.value)}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}
