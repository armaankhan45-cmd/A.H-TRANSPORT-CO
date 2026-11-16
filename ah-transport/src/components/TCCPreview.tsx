import { COMPANY, fmtDate } from "../company";
import type { TCC, Vehicle, Driver } from "../types";

export default function TCCPreview({ tcc, vehicle, driver }: { tcc: TCC; vehicle?: Vehicle; driver?: Driver }) {
  return (
    <div className="bg-white text-black mx-auto" style={{ maxWidth: 820, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div className="border-[3px] border-black">
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
            <p className="text-[9.5px]">Mob.: {COMPANY.phones.join(" / ")} &nbsp;•&nbsp; {COMPANY.email}</p>
            <p className="text-[9.5px]">{COMPANY.website} &nbsp;•&nbsp; GSTIN {COMPANY.gstin} &nbsp;•&nbsp; PAN {COMPANY.pan}</p>
          </div>
        </div>
        <div className="border-b-2 border-black bg-green-900 text-white text-center py-1">
          <span className="text-[13px] font-bold tracking-[2px]">TANKER CLEANING CERTIFICATE</span>
        </div>
        <div className="border-b-2 border-black flex justify-between text-[11px] px-2 py-1 font-bold">
          <span>TCC No. : {tcc.tccNo}</span>
          <span>Date : {fmtDate(tcc.date)}</span>
        </div>
        <div className="p-3 text-[11px] leading-relaxed">
          <p className="font-bold text-[12px]">TO,</p>
          <p className="font-bold text-[13px]">{tcc.recipient || "—"}</p>
          <p className="mb-3">{tcc.recipientAddr || "—"}</p>

          <p className="mb-3"><b>Subject:</b> Tanker Cleaning Certificate — Vehicle No. <b className="font-mono text-[13px]">{vehicle?.regNo || "—"}</b></p>

          <table className="w-full border-collapse mb-3 text-[11px]">
            <tbody>
              <tr><td className="border border-black px-2 py-1 w-[40%] font-bold bg-green-50">Vehicle Number</td><td className="border border-black px-2 py-1 font-mono">{vehicle?.regNo || "—"}</td></tr>
              <tr><td className="border border-black px-2 py-1 font-bold bg-green-50">Vehicle Type / Capacity</td><td className="border border-black px-2 py-1">{vehicle ? `${vehicle.type} — ${vehicle.capacity}` : "—"}</td></tr>
              <tr><td className="border border-black px-2 py-1 font-bold bg-green-50">On Behalf of M/s.</td><td className="border border-black px-2 py-1">{tcc.onBehalf || "—"}</td></tr>
              <tr><td className="border border-black px-2 py-1 font-bold bg-green-50">Previous Cargo</td><td className="border border-black px-2 py-1">{tcc.prevCargo || "—"}</td></tr>
              <tr><td className="border border-black px-2 py-1 font-bold bg-green-50">Driver Name</td><td className="border border-black px-2 py-1">{driver?.name || "—"} {driver?.mobile ? `(${driver.mobile})` : ""}</td></tr>
            </tbody>
          </table>

          <p className="font-bold mb-1">CLEANING DECLARATION</p>
          <p className="text-justify mb-2">
            We hereby certify that the tanker vehicle bearing No. <b>{vehicle?.regNo || "—"}</b> has been emptied and thoroughly cleaned,
            washed and dried after the previous cargo of <b>{tcc.prevCargo || "—"}</b>. {tcc.declaration}
          </p>
          <p className="text-justify mb-2">
            We further confirm that <b>each and every compartment</b> of the tanker has been properly cleaned, and that the tanker is
            <b> fit to carry the next product</b> without any risk of contamination, odour or residue.
          </p>
          <p className="text-justify mb-4">This certificate is issued on behalf of M/s <b>{tcc.onBehalf || "—"}</b> at the request of the consignor/consignee.</p>

          <div className="grid grid-cols-2 gap-6 mt-8">
            <div><div className="border-t border-black mt-10 pt-1 text-[10px]"><b>DRIVER SIGNATURE</b><br />{driver?.name || ""}</div></div>
            <div className="text-right"><div className="border-t border-black mt-10 pt-1 text-[10px]"><b>FOR A.H. TRANSPORT CO.</b><br />Authorised Signatory &amp; Company Stamp</div></div>
          </div>
        </div>
        <div className="border-t border-black text-center text-[8px] py-1 bg-green-50">
          {COMPANY.name} · {COMPANY.address} · GSTIN {COMPANY.gstin} · PAN {COMPANY.pan} — Computer generated document
        </div>
      </div>
    </div>
  );
}
