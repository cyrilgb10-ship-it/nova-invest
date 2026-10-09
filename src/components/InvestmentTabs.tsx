"use client";

import { useState } from "react";

type InvestmentTabsProps = {
  activeContent: React.ReactNode;
  completedContent: React.ReactNode;
  activeCount: number;
  completedCount: number;
};

export default function InvestmentTabs({
  activeContent,
  completedContent,
  activeCount,
  completedCount,
}: InvestmentTabsProps) {
  const [tab, setTab] = useState<"active" | "completed">("active");

  return (
    <>
      <div className="grid grid-cols-2 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
            tab === "active"
              ? "bg-[#071827] text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          En cours
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
              tab === "active"
                ? "bg-white/15 text-cyan-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("completed")}
          className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
            tab === "completed"
              ? "bg-[#071827] text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Terminés
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
              tab === "completed"
                ? "bg-white/15 text-emerald-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {completedCount}
          </span>
        </button>
      </div>

      <div className="mt-7">
        {tab === "active" ? activeContent : completedContent}
      </div>
    </>
  );
}