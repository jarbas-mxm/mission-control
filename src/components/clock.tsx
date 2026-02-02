"use client";

import { useState, useEffect } from "react";

export function Clock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const monthNames = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
  ];

  const dayName = dayNames[time.getDay()];
  const monthName = monthNames[time.getMonth()];
  const date = time.getDate();

  return (
    <div className="text-right">
      <div className="font-mono text-lg font-light text-stone-700 tracking-wider">
        {hours}:{minutes}
        <span className="text-stone-400">:{seconds}</span>
      </div>
      <div className="text-xs text-stone-400 tracking-wide">
        {dayName}, {monthName} {date}
      </div>
    </div>
  );
}
