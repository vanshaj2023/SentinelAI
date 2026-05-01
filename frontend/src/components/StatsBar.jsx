export default function StatsBar({ objectCount = 0, breachCount = 0 }) {
  return (
    <div className="grid grid-cols-3 gap-4 my-4">
      <div className="bg-gray-800 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-xs uppercase tracking-widest">
          Objects Tracked
        </p>
        <p className="text-white text-3xl font-bold mt-1">{objectCount}</p>
      </div>
      <div
        className={`rounded-xl p-4 text-center ${
          breachCount > 0 ? "bg-red-900 animate-pulse" : "bg-gray-800"
        }`}
      >
        <p
          className={`text-xs uppercase tracking-widest ${
            breachCount > 0 ? "text-red-300" : "text-gray-400"
          }`}
        >
          Zone Breaches
        </p>
        <p className="text-white text-3xl font-bold mt-1">{breachCount}</p>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-xs uppercase tracking-widest">
          System Status
        </p>
        <p className="text-green-400 text-xl font-bold mt-1">ACTIVE</p>
      </div>
    </div>
  );
}
