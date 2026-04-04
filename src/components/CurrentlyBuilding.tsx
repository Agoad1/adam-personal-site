export default function CurrentlyBuilding() {
  return (
    <div className="card flex flex-col gap-3">
      <h3 className="font-serif text-sm font-bold text-slate-900 uppercase tracking-wider">
        Currently Building
      </h3>
      <div className="flex items-start gap-3 mt-1">
        <div className="mt-1.5 pulse-dot flex-shrink-0" />
        <div>
          <p className="font-serif text-lg font-bold text-slate-900">Spengo</p>
          <p className="font-serif text-sm font-semibold text-slate-800">
            AI &amp; Automation for Home Service Businesses
          </p>
          <p className="font-mono text-xs font-bold text-blue-600 mt-2">In active development</p>
        </div>
      </div>
    </div>
  );
}
