"use client";

import React, { useState } from "react";
import {
  HabitRecurrenceType,
  HabitRecurrenceData,
} from "@/lib/types";
import {
  validateRecurrenceData,
  buildRecurrenceData,
} from "@/lib/habit-recurrence";

interface RecurrencePickerProps {
  value: {
    type: HabitRecurrenceType;
    data: HabitRecurrenceData;
  };
  onChange: (value: { type: HabitRecurrenceType; data: HabitRecurrenceData }) => void;
  error?: string;
}

const RECURRENCE_OPTIONS: { type: HabitRecurrenceType; label: string; description: string }[] = [
  { type: "daily", label: "Daily", description: "Every day" },
  { type: "weekdays", label: "Weekdays", description: "Selected days of the week" },
  { type: "weekly", label: "Weekly", description: "Same day each week" },
  { type: "weekly_x_days", label: "X per week", description: "Any N days per week" },
];

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurrencePicker({ value, onChange, error }: RecurrencePickerProps) {
  const [localError, setLocalError] = useState<string | undefined>(error);

  const handleTypeChange = (type: HabitRecurrenceType) => {
    const newData = buildRecurrenceData(type, {});
    onChange({ type, data: newData });
    setLocalError(undefined);
  };

  const handleDayToggle = (dayIndex: number) => {
    if (value.type !== "weekdays") return;

    const currentDays = value.data.days || [1, 2, 3, 4, 5];
    const newDays = currentDays.includes(dayIndex)
      ? currentDays.filter((d) => d !== dayIndex)
      : [...currentDays, dayIndex].sort();

    const newData = { days: newDays };
    const validation = validateRecurrenceData("weekdays", newData);
    setLocalError(validation.error);
    onChange({ type: "weekdays", data: newData });
  };

  const handleDayOfWeekChange = (dayOfWeek: number) => {
    const newData = { dayOfWeek };
    onChange({ type: "weekly", data: newData });
  };

  const handleIntervalChange = (intervalDays: number) => {
    const clamped = Math.min(365, Math.max(1, intervalDays));
    const newData = { intervalDays: clamped };
    const validation = validateRecurrenceData("interval", newData);
    setLocalError(validation.error);
    onChange({ type: "interval", data: newData });
  };

  const handleTimesPerWeekChange = (timesPerWeek: number) => {
    const clamped = Math.min(7, Math.max(1, timesPerWeek));
    onChange({ type: "weekly_x_days", data: { timesPerWeek: clamped } });
  };

  const renderTypeSelector = () => {
    const options = value.type === "interval"
      ? [...RECURRENCE_OPTIONS, { type: "interval" as HabitRecurrenceType, label: "Custom (Legacy)", description: "Every X days" }]
      : RECURRENCE_OPTIONS;

    return (
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const isLegacy = option.type === "interval";
          const isSelected = value.type === option.type;
          return (
            <button
              key={option.type}
              type="button"
              onClick={() => !isLegacy && handleTypeChange(option.type)}
              disabled={isLegacy}
              className={`
                p-3 text-left rounded border-2 transition-all
                ${isSelected
                  ? "border-tavern-gold bg-tavern-gold/10"
                  : "border-tavern-oak bg-tavern-smoke/50 hover:border-tavern-gold/50"
                }
                ${isLegacy ? "opacity-60 cursor-default" : ""}
              `}
            >
              <div className="text-body-sm font-semibold text-tavern-gold">{option.label}</div>
              <div className="text-body-sm text-tavern-parchment-dim mt-1">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderWeekdaysSelector = () => {
    const selectedDays = value.data.days || [1, 2, 3, 4, 5];
    
    return (
      <div className="mt-4">
        <p className="text-body-sm text-tavern-parchment mb-2">Select days:</p>
        <div className="flex gap-1">
          {DAY_NAMES.map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDayToggle(index)}
              className={`
                w-8 h-8 rounded text-body-sm font-medium transition-all
                ${selectedDays.includes(index)
                  ? "bg-tavern-gold text-tavern-smoke"
                  : "bg-tavern-oak text-tavern-parchment-dim hover:bg-tavern-oak/80"
                }
              `}
              title={DAY_FULL_NAMES[index]}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderWeeklySelector = () => {
    const selectedDay = value.data.dayOfWeek ?? 1;
    
    return (
      <div className="mt-4">
        <p className="text-body-sm text-tavern-parchment mb-2">Repeat on:</p>
        <select
          value={selectedDay}
          onChange={(e) => handleDayOfWeekChange(Number(e.target.value))}
          className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment text-sm"
        >
          {DAY_FULL_NAMES.map((day, index) => (
            <option key={index} value={index}>
              Every {day}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderIntervalSelector = () => {
    const intervalDays = value.data.intervalDays ?? 1;

    return (
      <div className="mt-4">
        <p className="text-body-sm text-tavern-parchment mb-2">
          Repeat every {intervalDays} day{intervalDays !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={30}
            value={intervalDays}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="flex-1 h-2 bg-tavern-oak rounded-lg appearance-none cursor-pointer"
          />
          <input
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={(e) => handleIntervalChange(Number(e.target.value))}
            className="w-16 bg-tavern-smoke border-2 border-tavern-oak rounded p-1 text-center text-tavern-parchment text-body-sm"
          />
        </div>
      </div>
    );
  };

  const renderWeeklyXDaysSelector = () => {
    const timesPerWeek = value.data.timesPerWeek ?? 3;

    return (
      <div className="mt-4">
        <p className="text-body-sm text-tavern-parchment mb-2">
          Complete {timesPerWeek} day{timesPerWeek !== 1 ? "s" : ""} per week
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleTimesPerWeekChange(n)}
              className={`
                w-8 h-8 rounded-full text-body-sm font-medium transition-all
                ${timesPerWeek === n
                  ? "bg-tavern-gold text-tavern-smoke"
                  : "bg-tavern-oak text-tavern-parchment-dim hover:bg-tavern-oak/80"
                }
              `}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderTypeSpecificOptions = () => {
    switch (value.type) {
      case "weekdays":
        return renderWeekdaysSelector();
      case "weekly":
        return renderWeeklySelector();
      case "interval":
        return renderIntervalSelector();
      case "weekly_x_days":
        return renderWeeklyXDaysSelector();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-body-sm font-medium text-tavern-gold block">
        Recurrence Pattern
      </label>
      
      {renderTypeSelector()}
      {renderTypeSpecificOptions()}
      
      {(localError || error) && (
        <p className="text-body-sm text-tavern-ember mt-1">
          {localError || error}
        </p>
      )}
    </div>
  );
}
