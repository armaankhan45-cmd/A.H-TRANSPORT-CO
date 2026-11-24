/** Survey-map backdrop: contour lines, a dashed route and pins that land one after another (plays once). */
const lines = Array.from({ length: 16 }, (_, i) => {
  const y = 40 + i * 42;
  const a = 18 + (i % 5) * 7, k = 0.9 + (i % 4) * 0.12;
  let d = `M-80 ${y}`;
  for (let x = 0; x <= 960; x += 80) d += ` Q${x + 40} ${y + (x / 80 % 2 ? a : -a) * k} ${x + 80} ${y}`;
  return d;
});
export default function Contours({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 880 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#a39b89" strokeOpacity=".28" fill="none" strokeWidth="1" style={{ animation: "drift 40s linear infinite alternate" }}>
        {lines.map((d, i) => <path key={i} d={d} strokeWidth={i % 5 === 0 ? 1.6 : 1} />)}
      </g>
      <path d="M110 560 C 250 470, 330 540, 450 420 S 650 300, 760 190" fill="none" stroke="#c6f432" strokeWidth="3" strokeLinecap="round" strokeDasharray="9 9" pathLength="1000"
        style={{ strokeDasharray: "1000", strokeDashoffset: 1000, animation: "draw 2.6s .5s cubic-bezier(.2,.7,.2,1) forwards" }} />
      {[[110, 560, 0.4], [450, 420, 1.4], [760, 190, 2.6]].map(([x, y, t], i) => (
        <g key={i} style={{ opacity: 0, transformOrigin: `${x}px ${y}px`, animation: `land .5s ${t}s cubic-bezier(.2,.7,.2,1) forwards` }}>
          {i === 0 && <circle cx={x} cy={y} r="9" fill="#c6f432" />}
          {i === 1 && <rect x={x - 8} y={y - 8} width="16" height="16" transform={`rotate(45 ${x} ${y})`} fill="#f2ede1" />}
          {i === 2 && <path d={`M${x} ${y - 11} L${x + 10} ${y + 8} L${x - 10} ${y + 8} Z`} fill="#c6f432" />}
        </g>
      ))}
    </svg>
  );
}
