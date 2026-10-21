// Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8 text-center sm:py-12">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Welcome to LOOP
        </h1>
        <p className="max-w-md text-sm text-slate-600 sm:text-base">
          Sell, donate, and swap pre-owned goods across Electronics, Furniture, Books, and Hobbies in
          your local community.
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 max-w-lg">
        {["Electronics", "Furniture", "Books", "Hobbies"].map((category) => (
          <div
            key={category}
            className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:border-slate-300 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-800">{category}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 max-w-sm w-full text-left">
        <div className="flex items-center space-x-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
            System Foundation Ready
          </h2>
        </div>
        <p className="mt-1 text-xs text-emerald-700">
          Mobile-first PWA skeleton initialized. Backend health monitoring connected.
        </p>
      </div>
    </div>
  );
}
