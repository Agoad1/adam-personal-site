export default function CurrentlyBuilding() {
  return (
    <div className="card flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">
        Currently Building
      </h3>
      <div className="flex items-start gap-3 mt-1">
        <div className="mt-1.5 pulse-dot flex-shrink-0" />
        <div>
          <p className="text-lg font-bold text-text-primary">Spengo</p>
          <p className="text-sm text-text-secondary">
            AI &amp; Automation for Home Service Businesses
          </p>
          <p className="text-xs text-accent mt-2">In active development</p>
        </div>
      </div>
    </div>
  );
}
