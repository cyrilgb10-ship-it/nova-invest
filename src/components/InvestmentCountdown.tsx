"use client";

import { useEffect, useState } from "react";

type InvestmentCountdownProps = {
  startDate: string;
  maturityDate: string;
};

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours,
    minutes,
    seconds,
  };
}

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

export default function InvestmentCountdown({
  startDate,
  maturityDate,
}: InvestmentCountdownProps) {
  const start = new Date(startDate).getTime();
  const end = new Date(maturityDate).getTime();

  // Valeur identique côté serveur et côté client pour éviter
  // une différence pendant l'hydratation.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateNow = () => {
      setNow(Date.now());
    };

    updateNow();

    const timer = window.setInterval(updateNow, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const currentTime = now === 0 ? start : now;

  const totalDuration = Math.max(end - start, 1);
  const remaining = Math.max(end - currentTime, 0);

  const elapsed = Math.min(
    Math.max(currentTime - start, 0),
    totalDuration
  );

  const progress = Math.min(
    Math.max((elapsed / totalDuration) * 100, 0),
    100
  );

  const time = formatRemaining(remaining);

  const finished = remaining <= 0;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {finished ? "Temps écoulé" : "Temps restant"}
        </p>

        <p className="text-sm font-bold text-white">
          {pad(time.hours)}h {pad(time.minutes)}min{" "}
          {pad(time.seconds)}sec
        </p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 transition-[width] duration-1000 ease-linear"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>Début</span>
        <span>{Math.round(progress)}%</span>
        <span>Échéance</span>
      </div>
    </div>
  );
}