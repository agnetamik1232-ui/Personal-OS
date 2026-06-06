"use client";

import { useEffect, useState } from "react";

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  action?:   React.ReactNode;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const now = useClock();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="ph-wrap">
      <div className="ph-left">
        <h1 className="ph-title">{title}</h1>
        {subtitle && <p className="ph-subtitle">{subtitle}</p>}
      </div>
      <div className="ph-right">
        {action && <div className="ph-action">{action}</div>}
        <div className="ph-datetime">
          <span className="ph-time">{time}</span>
          <span className="ph-date">{date}</span>
        </div>
      </div>
    </div>
  );
}
