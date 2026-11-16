import type { Firm } from "../company";
import type { TCC, Vehicle, Driver } from "../types";
import logo from "../assets/logo-tcc.png";
import truck from "../assets/truck-tcc.png";
import { H, ScaledCanvas, SERIF, T, V, at, fmtDMY } from "./formKit";

export const TCC_W = 1202, TCC_H = 1600;

/** Tanker Cleaning Certificate letter laid out exactly like the printed A.H. Transport Co. stationery. */
export default function TCCPreview({ tcc, vehicle, driver, firm }: { tcc: TCC; vehicle?: Vehicle; driver?: Driver; firm: Firm }) {
  const [p1, ...rest] = firm.phones;
  const text = (y: number, s: string, x = 185) => <T x={x} y={y} size={25.5} ls={0.3}>{s}</T>;
  return (
    <ScaledCanvas w={TCC_W} h={TCC_H}>
      <div style={at(62, 30, 1103, 1537, { border: "2px solid #000" })} />
      {/* letterhead */}
      <div style={at(968, 12, 190, 90, { background: "#fff" })} />
      <T x={972} y={14} size={18} bold lh={19}>Mobile : {p1}</T>
      <T x={1034} y={33} size={18} bold lh={18.5}>{rest.map((p) => <div key={p}>{p}</div>)}</T>
      {firm.logo && <img src={logo} alt="" style={at(88, 62, 204, 80)} />}
      {firm.logo && <img src={truck} alt="" style={at(1036, 100, 114, 54)} />}
      <T x={290} y={64} w={740} size={79} bold align="center" ls={0.5} style={{ fontFamily: SERIF, fontWeight: 800, color: "#1d3b26" }}>{firm.display}</T>
      <div style={at(66, 160, 1094, 47, { background: "#262626" })} />
      <T x={66} y={171} w={1094} size={24.5} bold align="center" style={{ color: "#fff", fontFamily: SERIF }}>{firm.tagline}</T>
      <T x={66} y={216} w={1094} size={20.8} align="center">Office : {firm.address.replace(/^Office\s*:\s*/, "")}</T>
      <T x={66} y={242} w={1094} size={20.8} align="center"><b>E-mail :</b> {firm.email} | <b>Website :</b> {firm.website}</T>
      <H x={66} y={284} w={1094} />

      {/* addressee + date */}
      <T x={815} y={337} size={24}>Date :</T>
      <H x={885} y={362} w={195} t={1.5} />
      <V x={893} y={330} size={32}>{fmtDMY(tcc.date)}</V>
      <T x={182} y={350} size={25.5}>To,</T>
      <V x={182} y={392} w={480} size={34} style={{ whiteSpace: "normal", lineHeight: "66px" }}>{tcc.recipient}<br />{tcc.recipientAddr}</V>
      <H x={182} y={570} w={470} t={1.5} />

      {/* body */}
      {text(624, "Dear Sir,", 182)}
      {text(672, "We intend to Transport")}
      <H x={462} y={697} w={600} t={1.5} />
      {text(724, "in vehicle No.")}
      <H x={346} y={737} w={712} t={1.5} />
      <V x={346} y={700} w={712} size={36} align="center">{vehicle?.regNo}</V>
      {text(778, "On behalf of M/s.")}
      <H x={396} y={805} w={640} t={1.5} />
      <V x={404} y={755} w={630} size={34}>{tcc.onBehalf}</V>
      {text(824, "We hereby certify that the previous cargo loaded in the above vehicle was")}
      <H x={188} y={888} w={872} t={1.5} />
      <V x={188} y={850} w={872} size={40} align="center">{tcc.prevCargo}</V>
      {text(924, "Each compartment of the vehicle has been cleaned properly as per", 187)}
      {text(977, "requirement and it is fit for carrying above product.", 187)}
      <V x={792} y={962} size={36}>{tcc.prevCargo}</V>
      {text(1072, "We also certify that the driver of the above vehicle is duly authorized to")}
      {text(1127, "driver Hazardous goods vehicle and his licence in endorsed to the effect.", 182)}

      {/* driver */}
      {text(1240, "Name of the Driver :", 175)}
      <H x={425} y={1264} w={640} t={1.5} />
      <V x={425} y={1218} w={640} size={38} align="center">{driver?.name}</V>
      {text(1345, "Signature of the Driver :", 172)}
      <H x={460} y={1368} w={605} t={1.5} />

      {/* company sign-off */}
      <T x={658} y={1418} size={27} bold>For : {firm.display.toUpperCase()}</T>
      <T x={750} y={1508} size={24}>Authorised Signature</T>
    </ScaledCanvas>
  );
}
