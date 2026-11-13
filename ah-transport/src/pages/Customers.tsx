import { useState } from "react";
import { useStore } from "../store";
import { Card, PageHeader, Table, Button, SearchBox, Input, Field, Textarea, Modal, Select, Badge, Stat } from "../ui";
import { Plus, Pencil, Building2, Trash2 } from "lucide-react";
import { fmtINR, uid } from "../company";
import type { Customer } from "../types";

const blank = (): Customer => ({ id: "", name: "", contactPerson: "", mobile: "", email: "", address: "", gstin: "", type: "General", terms: "30 days", remarks: "" });

export default function Customers() {
  const { db, set, toast } = useStore();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Customer | null>(null);

  const list = db.customers.filter((c) => !q || [c.name, c.contactPerson, c.mobile, c.gstin].join(" ").toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    if (!form) return;
    if (!form.name.trim()) return toast("Customer name is required", "error");
    set((d) => {
      if (form.id) { const i = d.customers.findIndex((x) => x.id === form.id); if (i >= 0) d.customers[i] = form; }
      else d.customers.push({ ...form, id: uid() });
      d.audits.unshift({ id: uid(), time: new Date().toISOString(), user: "Admin", action: form.id ? "Customer updated" : "Customer added", detail: form.name });
    });
    toast("Customer saved");
    setForm(null);
  };

  return (
    <div>
      <PageHeader title="Customer Management" subtitle="Consignors and consignees used to auto-fill LR, TCC and trips"
        actions={<Button onClick={() => setForm(blank())}><Plus className="w-4 h-4" /> Add Customer</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="Customers" value={db.customers.length} icon={<Building2 className="w-5 h-5" />} tone="green" />
        <Stat label="Chemical / Oil" value={db.customers.filter((c) => ["Chemical", "Oil", "Petrochem"].includes(c.type)).length} tone="blue" />
        <Stat label="Total billed freight" value={fmtINR(db.trips.reduce((a, t) => a + t.totalFreight, 0))} tone="indigo" />
        <Stat label="Active LRs" value={db.lrs.length} tone="orange" />
      </div>

      <Card className="p-3 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search customer, contact, GSTIN…" /></Card>

      <Card>
        <Table headers={["Customer", "Contact", "Mobile / Email", "Address", "GSTIN", "Type", "Terms", "Trips", "Actions"]}>
          {list.map((c) => {
            const trips = db.trips.filter((t) => t.customer === c.name);
            return (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs font-semibold max-w-52">{c.name}</td>
                <td className="px-3 py-2 text-xs">{c.contactPerson || "—"}</td>
                <td className="px-3 py-2 text-xs">{c.mobile}<span className="block text-[10px] text-gray-500">{c.email}</span></td>
                <td className="px-3 py-2 text-xs max-w-44 truncate">{c.address}</td>
                <td className="px-3 py-2 text-xs font-mono">{c.gstin}</td>
                <td className="px-3 py-2"><Badge cls="bg-blue-100 text-blue-800">{c.type}</Badge></td>
                <td className="px-3 py-2 text-xs">{c.terms}</td>
                <td className="px-3 py-2 text-xs">{trips.length}</td>
                <td className="px-3 py-2"><button onClick={() => setForm({ ...c })} className="p-1.5 rounded hover:bg-gray-100"><Pencil className="w-4 h-4 text-blue-600" /></button></td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit Customer" : "Add Customer"}>
        {form && (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Customer / Company Name" required className="sm:col-span-2"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Contact Person"><Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
            <Field label="Mobile Number"><Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Customer Type"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{["Chemical", "Oil", "Petrochem", "General", "Trader", "Manufacturer"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Billing Address" className="sm:col-span-2"><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <Field label="GSTIN"><Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
            <Field label="Payment Terms"><Select value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })}>{["Advance", "15 days", "30 days", "45 days", "60 days"].map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Remarks" className="sm:col-span-2"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
            <div className="sm:col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save}>Save Customer</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
