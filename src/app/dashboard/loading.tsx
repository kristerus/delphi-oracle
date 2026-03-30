export default function DashboardLoading() {
  return (
    <div className="h-screen bg-void-950 flex flex-col overflow-hidden">
      {/* Navbar skeleton */}
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-void-950/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-3 max-w-screen-2xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg glass animate-pulse" />
            <div className="w-28 h-4 rounded-md glass animate-pulse" />
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <div className="w-24 h-8 rounded-lg glass animate-pulse" />
            <div className="w-20 h-8 rounded-lg glass animate-pulse" />
          </div>

          {/* User */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full glass animate-pulse" />
            <div className="w-20 h-4 rounded-md glass animate-pulse hidden sm:block" />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="w-64 shrink-0 border-r border-border-subtle bg-void-900/50 flex flex-col gap-3 p-4">
          {/* New simulation button */}
          <div className="w-full h-10 rounded-xl glass animate-pulse" />

          {/* Section label */}
          <div className="w-32 h-3 rounded-md glass animate-pulse mt-1" />

          {/* Simulation items */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-full rounded-xl glass p-3 animate-pulse space-y-2"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded glass shrink-0" />
                <div className="flex-1 h-3.5 rounded-md glass" />
              </div>
              <div className="flex items-center gap-2 pl-5">
                <div className="w-12 h-2.5 rounded glass" />
                <div className="w-16 h-2.5 rounded glass ml-auto" />
              </div>
            </div>
          ))}
        </aside>

        {/* Main canvas skeleton */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tree header */}
          <div className="px-6 py-3.5 border-b border-border-subtle flex items-center gap-3 bg-void-900/30">
            <div className="w-4 h-4 rounded glass animate-pulse shrink-0" />
            <div className="w-48 h-4 rounded-md glass animate-pulse" />
            <div className="ml-auto flex items-center gap-2">
              <div className="w-16 h-3 rounded glass animate-pulse" />
              <div className="w-24 h-3 rounded glass animate-pulse" />
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden bg-void-950">
            {/* Dot pattern simulation */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle, oklch(30% 0.048 265 / 0.5) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            {/* Fake node tree */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Root node */}
                <div
                  className="w-52 h-20 rounded-2xl glass-card animate-pulse mx-auto"
                  style={{ boxShadow: "0 0 24px oklch(72% 0.175 76 / 0.1)" }}
                />

                {/* Branch lines */}
                <svg
                  className="absolute top-20 left-1/2 -translate-x-1/2 opacity-20"
                  width="480"
                  height="80"
                  viewBox="0 0 480 80"
                >
                  <path d="M240 0 L80 80" stroke="oklch(55% 0.130 280 / 0.4)" strokeWidth="1.5" fill="none" />
                  <path d="M240 0 L240 80" stroke="oklch(55% 0.130 280 / 0.4)" strokeWidth="1.5" fill="none" />
                  <path d="M240 0 L400 80" stroke="oklch(55% 0.130 280 / 0.4)" strokeWidth="1.5" fill="none" />
                </svg>

                {/* Level 1 nodes */}
                <div className="flex gap-6 mt-20">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-44 h-16 rounded-2xl glass animate-pulse"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Controls skeleton */}
            <div className="absolute bottom-6 left-6 w-7 h-24 rounded-xl glass animate-pulse" />
          </div>
        </main>
      </div>
    </div>
  );
}
