"use client";

import React, { useState, useCallback } from "react";
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
  { type: "interval", label: "Custom", description: "Every X days" },
  { type: "times_per_week", label: "Times per week", description: "Set target completions per week" },
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
    const currentWeekStart = value.data.weekStartDay ?? 1;
    const newData = { timesPerWeek: clamped, weekStartDay: currentWeekStart };
    const validation = validateRecurrenceData("times_per_week", newData);
    setLocalError(validation.error);
    onChange({ type: "times_per_week", data: newData });
  };

  const handleWeekStartDayChange = (weekStartDay: number) => {
    const currentTimes = value.data.timesPerWeek ?? 3;
    const newData = { timesPerWeek: currentTimes, weekStartDay };
    onChange({ type: "times_per_week", data: newData });
  };

  const renderTypeSelector = () => (
    <div className="grid grid-cols-2 gap-2">
      {RECURRENCE_OPTIONS.map((option) => (
        <button
          key={option.type}
          type="button"
          onClick={() => handleTypeChange(option.type)}
          className={`
            p-3 text-left rounded border-2 transition-all
            ${value.type === option.type
              ? "border-tavern-gold bg-tavern-gold/10"
              : "border-tavern-oak bg-tavern-smoke/50 hover:border-tavern-gold/50"
            }
          `}
        >
          <div className="font-pixel text-[9px] text-tavern-gold">{option.label}</div>
          <div className="text-[10px] text-tavern-parchment-dim mt-1">
            {option.description}
          </div>
        </button>
      ))}
    </div>
  );

  const renderWeekdaysSelector = () => {
    const selectedDays = value.data.days || [1, 2, 3, 4, 5];
    
    return (
      <div className="mt-4">
        <p className="font-pixel text-[8px] text-tavern-parchment mb-2">Select days:</p>
        <div className="flex gap-1">
          {DAY_NAMES.map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDayToggle(index)}
              className={`
                w-8 h-8 rounded font-pixel text-[9px] transition-all
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
        <p className="font-pixel text-[8px] text-tavern-parchment mb-2">Repeat on:</p>
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
        <p className="font-pixel text-[8px] text-tavern-parchment mb-2">
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
            className="w-16 bg-tavern-smoke border-2 border-tavern-oak rounded p-1 text-center text-tavern-parchment font-pixel text-xs"
          />
        </div>
      </div>
    );
  };

  const renderTimesPerWeekSelector = () => {
    const timesPerWeek = value.data.timesPerWeek ?? 3;
    const weekStartDay = value.data.weekStartDay ?? 1;
    
    return (
      <div className="mt-4 space-y-3">
        <div>
          <p className="font-pixel text-[8px] text-tavern-parchment mb-2">
            Target: {timesPerWeek} time{timesPerWeek !== 1 ? "s" : ""} per week
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => handleTimesPerWeekChange(Number(e.target.value))}
              className="flex-1 h-2 bg-tavern-oak rounded-lg appearance-none cursor-pointer"
            />
            <input
              type="number"
              min={1}
              max={7}
              value={timesPerWeek}
              onChange={(e) => handleTimesPerWeekChange(Number(e.target.value))}
              className="w-16 bg-tavern-smoke border-2 border-tavern-oak rounded p-1 text-center text-tavern-parchment font-pixel text-xs"
            />
          </div>
        </div>
        
        <div>
          <p className="font-pixel text-[8px] text-tavern-parchment mb-2">Week starts on:</p>
          <select
            value={weekStartDay}
            onChange={(e) => handleWeekStartDayChange(Number(e.target.value))}
            className="w-full bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment text-sm"
          >
            {DAY_FULL_NAMES.map((day, index) => (
              <option key={index} value={index}>
                {day}
              </option>
            ))}
          </select>
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
      case "times_per_week":
        return renderTimesPerWeekSelector();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      <label className="font-pixel text-[9px] text-tavern-gold block">
        Recurrence Pattern
      </label>
      
      {renderTypeSelector()}
      {renderTypeSpecificOptions()}
      
      {(localError || error) && (
        <p className="font-pixel text-[7px] text-tavern-ember mt-1">
          {localError || error}
        </p>
      )}
    </div>
  );
}
