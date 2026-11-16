import { COMPANY, fmtDate } from "../company";
import type { LR, Vehicle, Driver } from "../types";

/** Printed A4 LR layout — recreate of the original A.H. Transport Co. lorry receipt. */
export default function LRPreview({ lr, vehicle, driver }: { lr: LR; vehicle?: Vehicle; driver?: Driver }) {
  const cell = "border border-black px-1.5 py-1 text-[11px] leading-tight";
  const lab = "border border-black px-1.5 py-1 text-[10px] font-bold uppercase bg-green-50 w-[28%]";
  return (
    <div id="lr-print" className="bg-white text-black mx-auto" style={{ width: "100%", maxWidth: 820, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div className="border-[3px] border-black p-0">
        {/* header */}
        <div className="border-b-2 border-black flex items-stretch">
          <div className="w-24 border-r-2 border-black flex items-center justify-center p-2">
            <div className="w-16 h-16 rounded-full border-[3px] border-green-900 flex flex-col items-center justify-center leading-none">
              <span className="text-[18px] font-black text-green-900">AH</span>
              <span className="text-[6px] font-bold text-green-900 tracking-widest mt-0.5">TRANSPORT</span>
            </div>
          </div>
          <div className="flex-1 text-center py-2 px-2">
            <h1 className="text-[26px] font-black tracking-wide text-green-900 leading-none">A.H. TRANSPORT CO.</h1>
            <p className="text-[10px] font-semibold mt-1">Fleet Owners &amp; Transport Contractors — Chemical Oil &amp; Bulk Cargo</p>
            <p className="text-[9.5px] mt-0.5">{COMPANY.address}</p>
            <p className="text-[9.5px]">Mob.: {COMPANY.phones.join(" / ")}</p>
            <p className="text-[9.5px]">Email: {COMPANY.email} &nbsp;•&nbsp; Website: {COMPANY.website}</p>
          </div>
          <div className="w-28 border-l-2 border-black p-1.5 text-[9px] flex flex-col justify-center">
            <p><b>GSTIN</b><br />{COMPANY.gstin}</p>
            <p className="mt-1"><b>PAN</b><br />{COMPANY.pan}</p>
          </div>
        </div>
        {/* title bar */}
        <div className="border-b-2 border-black bg-green-900 text-white text-center py-1">
          <span className="text-[13px] font-bold tracking-[3px]">LORRY RECEIPT (LR)</span>
        </div>
        <div className="border-b-2 border-black flex justify-between text-[10px] px-2 py-1 font-bold">
          <span>LR No. : <span className="text-[12px]">{lr.lrNo}</span></span>
          <span>Date : {fmtDate(lr.date)}</span>
          <span>Status : {lr.status.toUpperCase()}</span>
        </div>
        {/* Consignor / consignee */}
        <div className="grid grid-cols-2 border-b-2 border-black">
          <div className="border-r-2 border-black p-1.5">
            <p className="text-[9px] font-bold uppercase">Consignor</p>
            <p className="text-[12px] font-bold">{lr.consignor || "—"}</p>
            <p className="text-[9.5px]">{lr.consignorAddr || "—"}</p>
          </div>
          <div className="p-1.5">
            <p className="text-[9px] font-bold uppercase">Consignee</p>
            <p className="text-[12px] font-bold">{lr.consignee || "—"}</p>
            <p className="text-[9.5px]">{lr.consigneeAddr || "—"}</p>
          </div>
        </div>
        {/* route */}
        <div className="grid grid-cols-3 border-b-2 border-black text-center text-[11px]">
          <div className="border-r border-black py-1"><b>FROM</b><p>{lr.from || "—"}</p></div>
          <div className="border-r border-black py-1"><b>TO</b><p>{lr.to || "—"}</p></div>
          <div className="py-1"><b>VEHICLE NO.</b><p className="font-mono font-bold">{vehicle?.regNo || "—"}</p></div>
        </div>
        {/* table */}
        <table className="w-full border-collapse">
          <tbody>
            <tr><td className={lab}>Nature of Goods</td><td className={cell} colSpan={3}>{lr.goods}</td></tr>
            <tr><td className={lab}>Quantity</td><td className={cell}>{lr.quantity}</td><td className={lab + " !w-[20%]"}>Invoice / BE No.</td><td className={cell}>{lr.beNo || "—"}</td></tr>
            <tr>
              <td className={lab}>Weights</td>
              <td className={cell} colSpan={3}>
                <div className="grid grid-cols-3 text-center">
                  <div className="border-r border-black"><p className="text-[9px] font-bold">GROSS (KG)</p><p>{lr.gross}</p></div>
                  <div className="border-r border-black"><p className="text-[9px] font-bold">TARE (KG)</p><p>{lr.tare}</p></div>
                  <div><p className="text-[9px] font-bold">NET (KG)</p><p className="font-bold">{lr.net}</p></div>
                </div>
              </td>
            </tr>
            <tr><td className={lab}>Freight as per Contract</td><td className={cell + " font-bold"}>₹ {lr.freight}</td><td className={lab + " !w-[20%]"}>Value</td><td className={cell}>{lr.value}</td></tr>
            <tr><td className={lab}>Driver Name</td><td className={cell}>{driver?.name || "—"}</td><td className={lab + " !w-[20%]"}>Driver Mobile</td><td className={cell}>{driver?.mobile || "—"}</td></tr>
            <tr><td className={lab}>Reporting Date &amp; Time</td><td className={cell}>{lr.reportingDT ? new Date(lr.reportingDT).toLocaleString("en-IN") : "—"}</td><td className={lab + " !w-[20%]"}>Start Kilometre</td><td className={cell}>{lr.startKm || "—"}</td></tr>
            <tr><td className={lab}>Unloading Date &amp; Time</td><td className={cell}>{lr.unloadingDT ? new Date(lr.unloadingDT).toLocaleString("en-IN") : "—"}</td><td className={lab + " !w-[20%]"}>Vehicle Type</td><td className={cell}>{vehicle ? `${vehicle.type} · ${vehicle.capacity}` : "—"}</td></tr>
          </tbody>
        </table>
        {/* declaration */}
        <div className="border-t-2 border-black px-2 py-1.5 text-[9px] leading-snug">
          <b>DECLARATION:</b> Goods are carried at owner's risk. The consignor/consignee confirms that the particulars furnished above are true and correct.
          Freight is payable as per contract. Subject to Mumbai jurisdiction. Waiver of risk and E&amp;OE apply.
        </div>
        {/* signatures */}
        <div className="border-t-2 border-black grid grid-cols-3 min-h-[86px]">
          <div className="border-r border-black p-1.5 flex flex-col justify-between"><p className="text-[9px] font-bold">CONSIGNEE STAMP &amp; SIGNATURE</p><p className="text-[8px] text-gray-600">Received goods in good condition</p></div>
          <div className="border-r border-black p-1.5 flex flex-col justify-between"><p className="text-[9px] font-bold">DRIVER SIGNATURE</p><p className="text-[8px] text-gray-600">{driver?.name}</p></div>
          <div className="p-1.5 flex flex-col justify-between"><p className="text-[9px] font-bold text-right">FOR A.H. TRANSPORT CO.</p><p className="text-[8px] text-right">Authorised Signatory</p></div>
        </div>
        <div className="border-t border-black text-center text-[8px] py-1 bg-green-50">
          {COMPANY.name} · {COMPANY.address} · GSTIN {COMPANY.gstin} · PAN {COMPANY.pan} — Computer generated document
        </div>
      </div>
    </div>
  );
}
