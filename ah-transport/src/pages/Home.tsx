import { useStore } from "../store";
import { daysLeft } from "../company";
import { askNew } from "../launch";
import { FilePlus2, Droplets, Truck, Users, MapPin, FileWarning, ChevronRight } from "lucide-react";

type Tile = { page: string; en: string; hi: string; icon: typeof Truck; color: string; sub?: string; isNew?: boolean };

export default function Home({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { db, firm } = useStore();
  const nd = db.settings.notifyDays || 30;
  const bad = db.vehicleDocs.filter((d) => daysLeft(d.expiryDate) <= nd).length
    + db.drivers.filter((d) => daysLeft(d.licenceExpiry) <= nd).length;
  const expired = db.vehicleDocs.filter((d) => daysLeft(d.expiryDate) < 0).length;
  const live = db.locations.filter((l) => l.consent && Date.now() - new Date(l.updated).getTime() < 5 * 60000).length;

  const tiles: Tile[] = [
    { page: "lr", en: "New LR", hi: "नया LR", icon: FilePlus2, color: "bg-green-700", isNew: true },
    { page: "tcc", en: "New TCC", hi: "नया TCC", icon: Droplets, color: "bg-teal-700", isNew: true },
    { page: "vehicles", en: "Vehicles", hi: "गाड़ियाँ", icon: Truck, color: "bg-blue-700", sub: `${db.vehicles.length}` },
    { page: "drivers", en: "Drivers", hi: "ड्राइवर", icon: Users, color: "bg-indigo-700", sub: `${db.drivers.length}` },
    { page: "tracking", en: "Live Location", hi: "लाइव लोकेशन", icon: MapPin, color: "bg-orange-600", sub: live ? `${live} live` : "" },
    { page: "expiry", en: "Papers", hi: "कागज़ात", icon: FileWarning, color: bad ? "bg-red-600" : "bg-gray-600", sub: bad ? `${bad} ⚠` : "OK" },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-1">{firm.display}</h1>
      <p className="text-sm text-gray-500 mb-4">क्या करना है? / What do you want to do?</p>

      {expired > 0 && (
        <button onClick={() => onNavigate("expiry")} className="w-full mb-4 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-4 text-left">
          <FileWarning className="w-8 h-8 text-red-600 shrink-0" />
          <span className="flex-1"><b className="block text-red-800 text-base">{expired} कागज़ात खत्म हो गए</b><span className="text-xs text-red-700">{expired} papers expired — tap to see</span></span>
          <ChevronRight className="w-5 h-5 text-red-500" />
        </button>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.en} onClick={() => { if (t.isNew) askNew(); onNavigate(t.page); }}
              className={`${t.color} text-white rounded-2xl p-4 sm:p-5 min-h-36 flex flex-col items-center justify-center gap-2 shadow-sm active:scale-[0.97] transition`}>
              <Icon className="w-11 h-11" strokeWidth={1.8} />
              <span className="text-lg font-bold leading-tight">{t.hi}</span>
              <span className="text-xs opacity-90 -mt-1">{t.en}{t.sub ? ` · ${t.sub}` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
