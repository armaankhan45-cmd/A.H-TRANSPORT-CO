import type { Firm } from "../company";
import type { LR, Vehicle, Driver } from "../types";
import logo from "../assets/logo-lr.png";
import { lrVehicleNo, lrValueText } from "../lrExtra";
import { Box, H, ScaledCanvas, SERIF, T, V, Vl, at, fmtDMY, fmtDT } from "./formKit";

export const LR_W = 1600, LR_H = 1267;

const DECL = "We hereby certify that we have not taken credit of duty paid on inputs or capital goods or the CENVAT credit of service tax on inputs services. used for providing such taxable service under the provisions on CENVAT credit rules, 2004 or We have availed the benefit of Notification No.:12/2003-ST-date 20-06-2003 (Refer Notification No. : 1/2006-ST-date 01-03/2006)";
const NOTES = ["Goods to be insured by the party.", "Leakage and breakage on party's risk.", "Goods carried at owner's risk.", "Quality of goods not checked & on party risk.", "Service tax payable by consignee / Consignor.", "General Terms & Condition as overleaf."];

/** "Transport Receipt" laid out exactly like the printed A.H. Transport Co. book. */
export default function LRPreview({ lr, vehicle, firm }: { lr: LR; vehicle?: Vehicle; driver?: Driver; firm: Firm }) {
  const pill = (x: number, w: number, label: string) => <div style={at(x, 659, w, 42, { border: "2px solid #000", borderRadius: 22, background: "#fff", fontSize: 21, fontWeight: 700, lineHeight: "20px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" })}><div dangerouslySetInnerHTML={{ __html: label }} /></div>;
  const addr = (v: string) => <V x={125} y={538} w={645} size={26} bold={false} style={{ whiteSpace: "normal", lineHeight: "57px" }}>{v}</V>;
  const [p1, ...rest] = firm.phones;
  const reg = lrVehicleNo(lr, vehicle?.regNo).trim().toUpperCase();
  const m = reg.replace(/\s+/g, "").match(/^([A-Z]{2}\d{1,2}[A-Z]{0,3})(\d{3,4})$/);
  const regLines = m ? [m[1], m[2]] : reg.split(/\s+/).filter(Boolean);
  return (
    <ScaledCanvas w={LR_W} h={LR_H}>
      {/* letterhead */}
      <T x={723} y={64} w={290} size={19} bold align="center" style={{ textDecoration: "underline" }}>Subject to Mumbai Jurisdiction</T>
      <T x={1278} y={58} size={23} bold lh={29}>Mobile : {p1}</T>
      <T x={1378} y={87} size={23} bold lh={29}>{rest.map((p) => <div key={p}>{p}</div>)}</T>
      {firm.logo && <img src={logo} alt="" style={at(85, 95, 270, 105)} />}
      <T x={430} y={96} w={885} size={74} bold align="center" ls={2} style={{ fontFamily: SERIF, fontWeight: 800, color: "#111", whiteSpace: "nowrap" }}>{firm.display}</T>
      <div style={at(52, 197, 1486, 48, { background: "#222" })} />
      <T x={52} y={207} w={1486} size={30.5} bold align="center" ls={0.3} style={{ color: "#fff", fontFamily: SERIF }}>{firm.tagline}</T>
      <T x={52} y={246} w={1486} size={24} align="center">Office : {firm.address.replace(/^Office\s*:\s*/, "")}</T>
      <T x={52} y={271} w={1486} size={24} align="center"><b>E-mail :</b> {firm.email} | <b>Website :</b> {firm.website}</T>
      <H x={52} y={300} w={1490} />

      {/* number / title / date */}
      <T x={60} y={344} size={26} bold>L.R. No.:</T>
      <H x={172} y={372} w={210} t={1.5} />
      <V x={180} y={330} size={36}>{lr.lrNo}</V>
      <div style={at(616, 318, 380, 68, { border: "4px double #000", textAlign: "center", fontSize: 33, fontWeight: 700, lineHeight: "60px" })}>TRANSPORT RECEIPT</div>
      <T x={1208} y={344} size={26} bold>Date :</T>
      <H x={1275} y={366} w={270} t={1.5} />
      <V x={1285} y={330} size={34}>{fmtDMY(lr.date)}</V>

      {/* from / to */}
      <Box x={50} y={402} w={737} h={56} />
      <div style={at(50, 402, 133, 56, { background: "#d9d9d9", border: "2px solid #000" })} />
      <T x={60} y={417} size={25} bold>FROM :</T>
      <V x={196} y={414} size={28} bold={false}>{lr.from}</V>
      <Box x={800} y={402} w={746} h={56} />
      <div style={at(800, 402, 133, 56, { background: "#d9d9d9", border: "2px solid #000" })} />
      <T x={812} y={417} size={25} bold>TO :</T>
      <V x={946} y={414} size={28} bold={false}>{lr.to}</V>

      {/* consignor / consignee */}
      <Box x={48} y={466} w={739} h={182} />
      <T x={60} y={494} size={25} bold>CONSIGNOR :</T>
      <H x={235} y={520} w={537} t={1.5} />
      <V x={240} y={484} size={34}>{lr.consignor}</V>
      <T x={60} y={556} size={25} bold>Add.</T>
      <H x={120} y={578} w={652} t={1.5} />
      <H x={62} y={634} w={710} t={1.5} />
      {addr(lr.consignorAddr)}
      <Box x={800} y={466} w={746} h={182} />
      <T x={815} y={494} size={25} bold>CONSIGNEE :</T>
      <H x={985} y={520} w={545} t={1.5} />
      <V x={990} y={484} size={34}>{lr.consignee}</V>
      <T x={815} y={556} size={25} bold>Add.</T>
      <H x={872} y={578} w={658} t={1.5} />
      <H x={815} y={634} w={715} t={1.5} />
      <V x={877} y={538} w={650} size={26} bold={false} style={{ whiteSpace: "normal", lineHeight: "57px" }}>{lr.consigneeAddr}</V>

      {/* goods table */}
      <Box x={50} y={652} w={1500} h={320} />
      <div style={at(52, 654, 1496, 50, { background: "#ececec" })} />
      <H x={50} y={705} w={1500} />
      {pill(60, 215, "Vehicle No. /<br/>Container No.")}
      {pill(297, 378, "Nature of Goods (Said to Contain)")}
      {pill(690, 212, "Quantity (Weight)")}
      {pill(922, 118, "Metric<br/><span style='font-size:17px'>(Tonnes)</span>")}
      {pill(1148, 292, "Freight as per Contract")}
      <Vl x={288} y={652} h={320} />
      <Vl x={682} y={652} h={320} />
      <Vl x={915} y={652} h={320} />
      <Vl x={1048} y={652} h={320} />
      <H x={682} y={760} w={366} />
      <H x={682} y={860} w={366} />
      <T x={765} y={712} size={22} bold>G. Wt. :</T>
      <T x={765} y={770} size={22} bold>T. Wt. :</T>
      <T x={765} y={867} size={22} bold>N. Wt. :</T>
      <V x={700} y={728} w={210} size={24} align="center">{lr.gross}</V>
      <V x={700} y={790} w={210} size={24} align="center">{lr.tare}</V>
      <V x={700} y={905} w={210} size={40} align="center">{lr.net}</V>
      <V x={60} y={regLines.length > 1 ? 770 : 812} w={225} size={50} align="center" style={{ whiteSpace: "normal", lineHeight: "56px" }}>{regLines.map((l) => <div key={l}>{l}</div>)}</V>
      <V x={300} y={770} w={375} size={52} align="center" style={{ whiteSpace: "normal", lineHeight: "56px" }}>{lr.goods}</V>
      {lr.quantity && <V x={300} y={720} w={375} size={20} bold={false} align="center">{lr.quantity}</V>}
      <T x={305} y={909} size={22}>Value :</T>
      <H x={372} y={929} w={148} t={1.5} />
      <V x={378} y={898} w={140} size={24}>{lrValueText(lr)}</V>
      <T x={305} y={936} size={22}>Declared / not declared.</T>
      {/* declaration */}
      <T x={1068} y={705} size={17.5} bold ls={3.3}>DECLARATION FOR CENVAT / CREDIT</T>
      <T x={1068} y={726} w={462} size={17} lh={18.4} align="justify">{DECL}</T>
      <H x={1048} y={857} w={502} />
      <T x={1068} y={861} size={15.5} lh={16.6}><div><b>Note :</b> 1) {NOTES[0]}</div>{NOTES.slice(1).map((n, i) => <div key={n} style={{ paddingLeft: 42 }}>{i + 2}) {n}</div>)}</T>

      {/* bottom blocks */}
      <Box x={48} y={985} w={580} h={128} />
      <T x={63} y={1005} size={18.5}>BE / Invoice No. :</T><H x={190} y={1023} w={425} t={1.5} /><V x={196} y={998} size={22}>{lr.beNo}</V>
      <T x={63} y={1046} size={18.5}>Reporting Date &amp; Time :</T><H x={232} y={1063} w={383} t={1.5} /><V x={238} y={1038} size={20}>{fmtDT(lr.reportingDT)}</V>
      <T x={63} y={1087} size={18.5}>Unloading Date &amp; Time :</T><H x={238} y={1104} w={377} t={1.5} /><V x={244} y={1079} size={20}>{fmtDT(lr.unloadingDT)}</V>
      <Box x={48} y={1113} w={580} h={90} />
      <T x={135} y={1123} size={30} ls={2} style={{ fontWeight: 900 }}>GSTIN : {firm.gstin}</T>
      <T x={158} y={1160} size={30} ls={2} style={{ fontWeight: 900 }}>PAN No. : {firm.pan}</T>

      <Box x={635} y={982} w={415} h={216} />
      <T x={635} y={986} w={415} size={18} bold italic align="center">CONSIGNEE STAMP &amp; SIGNATURE</T>
      <T x={635} y={1007} w={415} size={17.5} italic align="center">Goods received in full Quantity / Quality Ok</T>
      <H x={635} y={1032} w={415} />

      <Box x={1058} y={978} w={490} h={48} />
      <T x={1070} y={991} size={25} bold>Start Km. :</T><V x={1200} y={988} size={26}>{lr.startKm}</V>
      <Box x={1058} y={1026} w={490} h={172} />
      <T x={1100} y={1038} size={29} bold>For {firm.display.toUpperCase()}</T>
      <T x={1115} y={1160} size={25}>Sign.</T>
      <H x={1170} y={1184} w={330} t={1.5} />
    </ScaledCanvas>
  );
}
