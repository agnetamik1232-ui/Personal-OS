"use client";

import { useState, useEffect } from "react";
import { CheckInCard } from "@/components/checkin/CheckInCard";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CheckInGate() {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch(`/api/checkin?date=${todayKey()}`)
      .then(r => r.json() as Promise<{ checkin?: { completed?: boolean } | null }>)
      .then(d => setDone(d.checkin?.completed === true))
      .catch(() => setDone(false));
  }, []);

  // While loading or if done, render nothing
  if (done !== false) return null;

  return (
    <div className="dash-full">
      <CheckInCard />
    </div>
  );
}
