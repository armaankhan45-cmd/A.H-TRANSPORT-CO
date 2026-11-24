import { useCallback, useEffect, useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Button, Modal, Badge } from "../ui";
import { Camera, Receipt, TriangleAlert, Check, Trash2, RefreshCw } from "lucide-react";
import { listReports, removeReport, setReportDone, type Report } from "../reports";

const ICON = { "Trip photo": Camera, "Toll receipt": Receipt, Breakdown: TriangleAlert } as const;

/** Photos, toll receipts and breakdown reports sent by drivers from their private link. */
export default function DriverReports() {
  const { db, toast } = useStore();
  const [rows, setRows] = useState<Report[] | null>(null);
  const [tab, setTab] = useState<"New" | "Done" | "All">("New");
  const [view, setView] = useState<Report | null>(null);
  const load = useCallback(async () => { try { setRows(await listReports()); } catch (e) { toast((e as Error).message, "error"); setRows([]); } }, [toast]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [load]);

  const list = (rows || []).filter((r) => tab === "All" || r.status === tab);
  const who = (r: Report) => { const d = db.drivers.find((x) => x.id === r.driverId); return { name: d?.name || "Driver", veh: db.vehicles.find((v) => v.id === d?.vehicleId)?.regNo || "" }; };
  const act = async (fn: () => Promise<void>, msg: string) => { try { await fn(); await load(); toast(msg); } catch (e) { toast((e as Error).message, "error"); } };

  return (
    <div>
      <PageHeader title="Driver reports" subtitle="Photos, toll receipts and breakdowns sent from the drivers' links"
        actions={<Button variant="secondary" onClick={() => void load()}><RefreshCw className="w-4 h-4" /> Refresh</Button>} />
      <div className="inline-flex rounded-md border border-slate-300 overflow-hidden mb-4">
        {(["New", "Done", "All"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium ${tab === t ? "bg-ink text-white" : "bg-white hover:bg-slate-50"}`}>{t}{t === "New" && rows ? ` (${rows.filter((r) => r.status === "New").length})` : ""}</button>)}
      </div>
      {rows === null && <p className="text-slate-500">Loading…</p>}
      {rows && list.length === 0 && <Card className="p-6 text-slate-600">Nothing here. Reports appear when a driver sends one from their link.</Card>}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {list.map((r) => {
          const Icon = ICON[r.kind]; const w = who(r);
          return (
            <Card key={r.id} className="p-3 flex gap-3">
              <button onClick={() => setView(r)} className="w-24 h-24 shrink-0 rounded-md bg-slate-100 overflow-hidden grid place-items-center">
                {r.photo ? <img src={r.photo} alt="" className="w-full h-full object-cover" /> : <Icon className="w-8 h-8 text-slate-400" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><Badge cls={r.kind === "Breakdown" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}>{r.kind}</Badge>{r.status === "Done" && <span className="text-xs text-slate-500">Done</span>}</div>
                <p className="font-semibold mt-1 truncate">{w.name}{w.veh ? ` · ${w.veh}` : ""}</p>
                <p className="text-xs text-slate-500">{new Date(r.at).toLocaleString("en-IN")}</p>
                {r.note && <p className="text-sm mt-1 line-clamp-2">{r.note}</p>}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="secondary" onClick={() => act(() => setReportDone(r.id, r.status !== "Done"), r.status === "Done" ? "Reopened" : "Marked done")}><Check className="w-3.5 h-3.5" /> {r.status === "Done" ? "Reopen" : "Mark done"}</Button>
                  <button title="Delete" onClick={() => { if (confirm("Delete this report?")) void act(() => removeReport(r.id), "Deleted"); }} className="p-1.5 rounded hover:bg-slate-100"><Trash2 className="w-4 h-4 text-red-600" /></button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${view.kind} · ${who(view).name}` : ""} wide>
        {view && <div>{view.photo && <img src={view.photo} alt="" className="w-full rounded-md" />}{view.note && <p className="mt-3 whitespace-pre-wrap">{view.note}</p>}</div>}
      </Modal>
    </div>
  );
}
