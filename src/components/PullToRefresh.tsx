"use client";

import React, { useState, useRef } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Refresh button for mobile */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing || disabled}
        className="w-full flex items-center justify-center py-4 bg-tavern-oak/20 text-tavern-gold font-pixel text-[10px] hover:bg-tavern-oak/30 disabled:opacity-50"
      >
        {isRefreshing ? "✨ Refreshing..." : "🍺 Tap to refresh"}
      </button>

      {children}
    </div>
  );
}
