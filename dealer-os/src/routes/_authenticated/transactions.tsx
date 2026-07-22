import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listTransactions,
  createTransaction,
  confirmTransaction,
  deleteTransaction,
} from "@/lib/transactions.functions";
import {
  listDocuments,
  listTransactionDocuments,
  linkDocument,
  unlinkDocument,
} from "@/lib/documents.functions";
import { DOC_SCHEMA_BY_KEY, DOC_ROLE_OPTIONS } from "@/lib/document-schemas";
import { listVehicles } from "@/lib/vehicles.functions";
import { listAgents } from "@/lib/agents.functions";
import { getSettings } from "@/lib/admin.functions";
import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { suggestedCommission } from "@/lib/formulas";
import { Check, Plus, Trash2, Paperclip, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/transactions")({
  component: TxPage,
});

function TxPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const fetchTx = useServerFn(listTransactions);
  const fetchV = useServerFn(listVehicles);
  const fetchA = useServerFn(listAgents);
  const fetchS = useServerFn(getSettings);
  const doCreate = useServerFn(createTransaction);
  const doConfirm = useServerFn(confirmTransaction);
  const doDelete = useServerFn(deleteTransaction);

  const txsQ = useQuery({ queryKey: ["transactions"], queryFn: () => fetchTx() });
  const vQ = useQuery({ queryKey: ["vehicles"], queryFn: () => fetchV() });
  const aQ = useQuery({ queryKey: ["agents"], queryFn: () => fetchA() });
  const sQ = useQuery({ queryKey: ["settings"], queryFn: () => fetchS() });
  const fetchAllDocs = useServerFn(listDocuments);
  const fetchTxDocs = useServerFn(listTransactionDocuments);
  const docsQ = useQuery({ queryKey: ["documents"], queryFn: () => fetchAllDocs() });
  const txDocsQ = useQuery({ queryKey: ["transaction_documents"], queryFn: () => fetchTxDocs() });

  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<any | null>(null);
  const dealer = vQ.data?.dealer ?? false;
  const vehicles = (vQ.data?.vehicles ?? []) as any[];
  const agents = (aQ.data ?? []) as any[];
  const settings = sQ.data as any;
  const txs = (txsQ.data ?? []) as any[];
  const allDocs = (docsQ.data ?? []) as any[];
  const txDocs = (txDocsQ.data ?? []) as any[];
  const docsByTx = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const l of txDocs) {
      (m[l.transaction_id] ??= []).push(l);
    }
    return m;
  }, [txDocs]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["ledger"] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
    qc.invalidateQueries({ queryKey: ["transaction_documents"] });
  };

  const createMutation = useMutation({
    mutationFn: doCreate,
    onSuccess: () => {
      toast.success(t("saved"));
      setCreating(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {t("new_transaction")}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{t("unconfirmed_hidden")}</p>

      {txsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : txs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("no_transactions")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">{t("sale_date")}</th>
                <th className="p-3">{t("vehicle")}</th>
                <th className="p-3">{t("agent")}</th>
                <th className="p-3">{t("sale_price")}</th>
                <th className="p-3">{t("commission")}</th>
                <th className="p-3">{t("linked_documents")}</th>
                <th className="p-3">{t("status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {txs.map((tx: any) => (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  linked={docsByTx[tx.id] ?? []}
                  dealer={dealer}
                  onConfirm={async () => {
                    try {
                      await doConfirm({ data: { id: tx.id } });
                      invalidate();
                      toast.success(t("dealer_confirmed"));
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                  onDelete={async () => {
                    if (!confirm("Delete?")) return;
                    await doDelete({ data: { id: tx.id } });
                    invalidate();
                  }}
                  onManage={() => setManaging(tx)}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {managing && (
        <TxDocsManager
          tx={managing}
          allDocs={allDocs}
          linked={docsByTx[managing.id] ?? []}
          onClose={() => setManaging(null)}
          onChanged={invalidate}
        />
      )}


      {creating && (
        <NewTxForm
          vehicles={vehicles}
          agents={agents}
          defaultPercent={settings?.default_commission_percent ?? 20}
          onCancel={() => setCreating(false)}
          onSubmit={(payload) => createMutation.mutate({ data: payload })}
          busy={createMutation.isPending}
        />
      )}
    </div>
  );
}

function NewTxForm({
  vehicles, agents, defaultPercent, onCancel, onSubmit, busy,
}: {
  vehicles: any[]; agents: any[]; defaultPercent: number;
  onCancel: () => void; onSubmit: (p: any) => void; busy: boolean;
}) {
  const { t } = useI18n();
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [salePrice, setSalePrice] = useState(vehicles[0]?.asking_price ?? 0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const agent = agents.find((a) => a.id === agentId);
  const pct = agent?.commission_percent ?? defaultPercent;
  const suggested = vehicle
    ? suggestedCommission(
        {
          ...(vehicle as any),
          sale_price: Number(salePrice),
          sale_date: saleDate,
        },
        pct,
      )
    : 0;
  const [commission, setCommission] = useState(suggested);
  const [override, setOverride] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({
            vehicle_id: vehicleId,
            agent_id: agentId,
            sale_price: Number(salePrice),
            sale_date: saleDate,
            commission_amount: Number(override ? commission : suggested),
          });
        }}
        className="w-full max-w-lg space-y-3 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-lg"
      >
        <h2 className="text-lg font-semibold">{t("new_transaction")}</h2>
        <label className="block text-xs text-muted-foreground">
          {t("vehicle")}
          <select
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
              const v = vehicles.find((x) => x.id === e.target.value);
              if (v?.asking_price) setSalePrice(v.asking_price);
            }}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {vehicles.filter((v) => v.status !== "sold").map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-muted-foreground">
          {t("agent")}
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-muted-foreground">
            {t("sale_price")}
            <input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            {t("sale_date")}
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="rounded-lg bg-muted p-3 text-xs">
          {t("suggested")}: <strong>RM {suggested.toLocaleString()}</strong> ({pct}%)
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
            <span>{t("override")}</span>
          </label>
          {override && (
            <input
              type="number"
              value={commission}
              onChange={(e) => setCommission(Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {t("save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function TxRow({
  tx, linked, dealer, onConfirm, onDelete, onManage, t,
}: {
  tx: any; linked: any[]; dealer: boolean;
  onConfirm: () => void; onDelete: () => void; onManage: () => void;
  t: (k: any) => string;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-3">{tx.sale_date}</td>
      <td className="p-3">
        {tx.vehicles?.year} {tx.vehicles?.make} {tx.vehicles?.model}
      </td>
      <td className="p-3">{tx.agents?.name}</td>
      <td className="p-3">RM {Number(tx.sale_price).toLocaleString()}</td>
      <td className="p-3">RM {Number(tx.commission_amount).toLocaleString()}</td>
      <td className="p-3">
        <button
          onClick={onManage}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          <Paperclip className="h-3 w-3" />
          {linked.length > 0 ? `${linked.length} · manage` : t("link_document")}
        </button>
        {linked.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {linked.slice(0, 4).map((l) => {
              const s = DOC_SCHEMA_BY_KEY[l.documents?.doc_type];
              return (
                <span
                  key={l.id}
                  title={`${l.documents?.title} (${l.role})`}
                  className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: s?.accent ?? "#666" }}
                >
                  {s?.short ?? "DOC"}
                </span>
              );
            })}
          </div>
        )}
      </td>
      <td className="p-3">
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs " +
            (tx.dealer_confirmed
              ? "bg-[color:var(--color-chart-5)]/20 text-foreground"
              : "bg-muted text-muted-foreground")
          }
        >
          {tx.dealer_confirmed ? t("dealer_confirmed") : t("unconfirmed")}
        </span>
      </td>
      <td className="p-3">
        {dealer && !tx.dealer_confirmed && (
          <button
            onClick={onConfirm}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
          >
            <Check className="h-3 w-3" /> {t("confirm_sale")}
          </button>
        )}
        {dealer && (
          <button onClick={onDelete} className="ml-2 rounded p-1 hover:bg-muted">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

function TxDocsManager({
  tx, allDocs, linked, onClose, onChanged,
}: {
  tx: any; allDocs: any[]; linked: any[];
  onClose: () => void; onChanged: () => void;
}) {
  const doLink = useServerFn(linkDocument);
  const doUnlink = useServerFn(unlinkDocument);
  const [selectedId, setSelectedId] = useState<string>("");
  const [role, setRole] = useState<string>(DOC_ROLE_OPTIONS[0]);
  const [notes, setNotes] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const linkedIds = new Set(linked.map((l) => l.document_id));
  const available = allDocs.filter((d) => !linkedIds.has(d.id));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Linked documents</h2>
            <p className="text-xs text-muted-foreground">
              Transaction on {tx.sale_date} · {tx.vehicles?.year} {tx.vehicles?.make} {tx.vehicles?.model}
            </p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {linked.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            No documents attached yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {linked.map((l) => {
              const s = DOC_SCHEMA_BY_KEY[l.documents?.doc_type];
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <span
                    className="inline-flex h-8 w-12 items-center justify-center rounded-md text-[10px] font-bold text-white"
                    style={{ background: s?.accent ?? "#666" }}
                  >
                    {s?.short ?? "DOC"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.documents?.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Role: {l.role}
                      {l.notes ? ` · ${l.notes}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await doUnlink({ data: { id: l.id } });
                      onChanged();
                    }}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Unlink
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attach a document
          </div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Select an existing document —</option>
            {available.map((d) => {
              const s = DOC_SCHEMA_BY_KEY[d.doc_type];
              return (
                <option key={d.id} value={d.id}>
                  [{s?.short ?? d.doc_type}] {d.title}
                  {d.customer_name ? ` · ${d.customer_name}` : ""}
                </option>
              );
            })}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {DOC_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Remark (optional)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={!selectedId || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await doLink({
                    data: {
                      transaction_id: tx.id,
                      document_id: selectedId,
                      role,
                      notes: notes || null,
                    },
                  });
                  setSelectedId("");
                  setNotes("");
                  onChanged();
                  toast.success("Linked");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="btn-primary rounded-md px-3 py-2 text-sm disabled:opacity-50"
            >
              Attach
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Need a new record? Create it in the <span className="font-semibold">Documents</span> page first, then attach it here.
          </p>
        </div>
      </div>
    </div>
  );
}

