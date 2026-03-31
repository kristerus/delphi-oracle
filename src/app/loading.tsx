export default function RootLoading() {
  return (
    <div className="min-h-screen bg-void-950 flex items-center justify-center">
      <div className="relative flex flex-col items-center gap-8">
        {/* Oracle eye pulse */}
        <div className="relative">
          {/* Outer ring 1 */}
          <div
            className="absolute inset-0 rounded-full border border-oracle-800/20 animate-ping"
            style={{ animationDuration: "2.4s", margin: "-16px" }}
          />
          {/* Outer ring 2 */}
          <div
            className="absolute inset-0 rounded-full border border-nebula-700/15 animate-ping"
            style={{ animationDuration: "3.2s", animationDelay: "0.4s", margin: "-28px" }}
          />

          {/* Core icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(25% 0.080 62), oklch(18% 0.090 286))",
              border: "1px solid oklch(30% 0.055 258 / 0.5)",
              boxShadow: "0 0 32px oklch(72% 0.175 76 / 0.2), 0 0 64px oklch(55% 0.130 280 / 0.15)",
            }}
          >
            {/* Stylized oracle eye */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              {/* Eye outline */}
              <path
                d="M3 14 C8 7, 20 7, 25 14 C20 21, 8 21, 3 14Z"
                stroke="oklch(72% 0.175 76)"
                strokeWidth="1.5"
                fill="none"
                className="animate-pulse-slow"
              />
              {/* Iris */}
              <circle
                cx="14"
                cy="14"
                r="4.5"
                stroke="oklch(68% 0.115 276)"
                strokeWidth="1"
                fill="oklch(18% 0.090 286 / 0.8)"
              />
              {/* Pupil */}
              <circle
                cx="14"
                cy="14"
                r="2"
                fill="oklch(72% 0.175 76)"
                style={{ filter: "drop-shadow(0 0 3px oklch(72% 0.175 76 / 0.8))" }}
              />
              {/* Reflection */}
              <circle cx="15.5" cy="12.5" r="0.8" fill="oklch(97% 0.050 88 / 0.7)" />
            </svg>
          </div>
        </div>

        {/* Shimmer text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-shimmer">
            Consulting the Oracle…
          </p>

          {/* Dot loader */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-oracle-600 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
              />
            ))}
          </div>
        </div>

        {/* Skeleton cards */}
        <div className="flex items-center gap-4 mt-2 opacity-30">
          {[80, 120, 96].map((w, i) => (
            <div
              key={i}
              className="h-10 rounded-xl glass animate-pulse"
              style={{ width: `${w}px`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
