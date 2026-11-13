import { useState } from "react";
import { useStore, PERMISSIONS } from "../store";
import { Card, PageHeader, Table, Button, Badge, Input, Field, Select, Modal, Tabs, Stat } from "../ui";
import { Plus, ShieldCheck, UserCog, ScrollText, Settings, Database, KeyRound } from "lucide-react";
import { fmtDate, todayISO, uid } from "../company";
import type { Role, User } from "../types";

const ROLES: Role[] = ["Super Admin", "Admin", "Office Staff", "Accounts Staff", "Driver"];
const MODULES = ["dashboard", "vehicles", "documents", "maintenance", "expiry", "drivers", "assignments", "lr", "tcc", "trips", "customers", "salary", "expenses", "reports", "tracking", "users", "settings", "audit"];

export default function Admin() {
  const { db, set, toast, user, reset } = useStore();
  const [tab, setTab] = useState("Users");
  const [form, setForm] = useState<User | null>(null);

  const blank = (): User => ({ id: "", name: "", email: "", password: "", role: "Office Staff", active: true });

  const save = () => {
    if (!form) return;
    if (!form.name || !form.email) return toast("Name and email are required", "error");
    if (form.password.length < 6) return toast("Password must be at least 6 characters", "error");
    if (db.users.some((u) => u.id !== form.id && u.email.toLowerCase() === form.email.toLowerCase())) return toast("Email already exists", "error");
    set((d) => {
      if (form.id) { const i = d.users.findIndex((u) => u.id === form.id); if (i >= 0) d.users[i] = form; }
      else d.users.push({ ...form, id: uid() });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: form.id ? "User updated" : "User created", detail: `${form.name} (${form.role})` });
    });
    toast("User saved");
    setForm(null);
  };

  const isSuper = user?.role === "Super Admin";

  return (
    <div>
      <PageHeader title="Users, Roles & Security" subtitle="Role-based access control, audit log, backup guidance"
        actions={isSuper ? <Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> Add User</Button> : <span className="text-xs text-gray-500">User management is restricted to Super Admin</span>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Users" value={db.users.length} icon={<UserCog className="w-5 h-5" />} tone="green" />
        <Stat label="Active" value={db.users.filter((u) => u.active).length} tone="blue" />
        <Stat label="Audit entries" value={db.audits.length} icon={<ScrollText className="w-5 h-5" />} tone="indigo" />
        <Stat label="Roles" value={ROLES.length} icon={<ShieldCheck className="w-5 h-5" />} tone="orange" />
      </div>

      <Tabs tabs={["Users", "Role Permissions", "Audit Log", "Settings & Backup"]} active={tab} onChange={setTab} />

      {tab === "Users" && (
        <Card>
          <Table headers={["Name", "Email", "Role", "Linked driver", "Status", "Actions"]}>
            {db.users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs font-semibold">{u.name}</td>
                <td className="px-3 py-2 text-xs">{u.email}</td>
                <td className="px-3 py-2"><Badge cls="bg-green-100 text-green-800">{u.role}</Badge></td>
                <td className="px-3 py-2 text-xs">{db.drivers.find((d) => d.id === u.driverId)?.name || "—"}</td>
                <td className="px-3 py-2"><Badge cls={u.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}>{u.active ? "Active" : "Disabled"}</Badge></td>
                <td className="px-3 py-2 space-x-2">
                  {isSuper ? <button className="text-xs text-blue-700 hover:underline" onClick={() => setForm({ ...u })}>Edit</button> : null}
                  {isSuper ? <button className="text-xs text-red-700 hover:underline" onClick={() => { set((d) => { const x = d.users.find((y) => y.id === u.id); if (x) x.active = !x.active; d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: user?.name || "Admin", action: "User status toggled", detail: u.email }); }); toast("User status changed"); }}>{u.active ? "Disable" : "Enable"}</button> : null}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Role Permissions" && (
        <Card className="p-3 overflow-x-auto">
          <p className="text-xs text-gray-500 mb-2">Module access matrix. Edit <code>PERMISSIONS</code> in <code>src/store.tsx</code> and mirror it in Supabase RLS policies + <code>role_permissions</code> table.</p>
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-gray-50"><th className="text-left px-2 py-2">Module</th>{ROLES.map((r) => <th key={r} className="px-2 py-2">{r}</th>)}</tr></thead>
            <tbody>{MODULES.map((m) => <tr key={m} className="border-t border-gray-100"><td className="px-2 py-1.5 font-medium capitalize">{m}</td>{ROLES.map((r) => <td key={r} className="px-2 py-1.5 text-center">{PERMISSIONS[r].includes(m) ? <span className="text-green-700 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>)}</tr>)}</tbody>
          </table>
          <div className="mt-3 text-[11px] text-gray-500 space-y-1">
            <p>• Drivers are restricted to the Driver App view only — they can never read another driver's salary, documents or profile.</p>
            <p>• Accounts Staff cannot edit vehicles/maintenance. Office Staff cannot see salary or expenses.</p>
          </div>
        </Card>
      )}

      {tab === "Audit Log" && (
        <Card>
          <Table headers={["Time", "User", "Action", "Detail"]} empty={db.audits.length === 0}>
            {db.audits.slice(0, 100).map((a) => (
              <tr key={a.id}><td className="px-3 py-2 text-[11px] whitespace-nowrap">{new Date(a.time).toLocaleString("en-IN")}</td><td className="px-3 py-2 text-xs">{a.user}</td><td className="px-3 py-2 text-xs font-semibold">{a.action}</td><td className="px-3 py-2 text-xs text-gray-600">{a.detail}</td></tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "Settings & Backup" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Settings className="w-4 h-4" /> Notification periods</h3>
            <Field label="Days before expiry to alert"><Input type="number" value={db.settings.notifyDays} onChange={(e) => set((d) => { d.settings.notifyDays = Number(e.target.value) || 30; })} /></Field>
            <p className="text-[11px] text-gray-500 mt-2">Fixed alert tiers are always active: 30 / 15 / 7 days and expired.</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Database className="w-4 h-4" /> Data & backup</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => {
                const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ah_tms_backup_${todayISO()}.json`; a.click(); toast("Backup JSON downloaded");
              }}>Export backup (JSON)</Button>
              <Button variant="secondary" size="sm" onClick={() => document.getElementById("import-file")?.click()}>Import backup</Button>
              <input id="import-file" type="file" accept="application/json" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onload = () => { try { const parsed = JSON.parse(String(r.result)); set((d) => { Object.assign(d, parsed); }); toast("Backup restored"); } catch { toast("Invalid backup file", "error"); } }; r.readAsText(f);
              }} />
              <Button variant="danger" size="sm" onClick={() => { if (confirm("Reset all data to demo seed? This cannot be undone.")) reset(); }}>Reset demo data</Button>
            </div>
            <p className="text-[11px] text-gray-500 mt-3">Production: enable Supabase daily backups (free tier: 7-day retention on paid plans; on free tier take scheduled <code>pg_dump</code> exports). Store a copy off-site.</p>
          </Card>
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-2"><KeyRound className="w-4 h-4" /> Security checklist (production)</h3>
            <ul className="text-xs text-gray-600 space-y-1 list-disc pl-5">
              <li>Authentication handled by Supabase Auth (bcrypt/scrypt hashing server-side) — never store passwords in the app DB. This demo uses localStorage only.</li>
              <li>Row Level Security ON for every table; drivers restricted to rows where <code>driver_id = auth.uid()</code>.</li>
              <li>Private storage buckets (<code>vehicle-docs</code>, <code>driver-docs</code>, <code>receipts</code>) with signed URLs valid for 60 seconds.</li>
              <li>Service-role key used only on the server (Edge Functions) — never shipped in frontend bundles.</li>
              <li>Enable MFA for Super Admin; enforce strong password policy; log all privileged actions to <code>audit_logs</code>.</li>
              <li>Back up daily; test restore quarterly; keep PITR or scheduled dumps.</li>
            </ul>
          </Card>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit User" : "Add User"}>
        {form && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full Name" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Password" required hint="Demo only — Supabase Auth hashes passwords in production"><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Role"><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field>
            {form.role === "Driver" && <Field label="Linked Driver Record" className="sm:col-span-2"><Select value={form.driverId || ""} onChange={(e) => setForm({ ...form, driverId: e.target.value })}><option value="">Select driver</option>{db.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>}
            <Field label="Status"><Select value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}><option value="1">Active</option><option value="0">Disabled</option></Select></Field>
            <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save User</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
