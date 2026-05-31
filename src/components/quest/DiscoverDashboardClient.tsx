"use client";

import React, { useState } from "react";
import DiscoveryForge from "./DiscoveryForge";
import ExpeditionForge from "./ExpeditionForge";

export default function DiscoverDashboardClient() {
  const [activeTab, setActiveTab] = useState<"single" | "expedition">("single");

  return (
    <div className="space-y-6">
      {/* 8-bit Tab Switcher */}
      <div className="flex border-b border-[#4b3b2e] pb-1">
        <button
          onClick={() => setActiveTab("single")}
          className={`px-4 py-2 font-medium text-sm transition-all focus:outline-none relative ${
            activeTab === "single"
              ? "text-tavern-gold border-b-2 border-tavern-gold font-bold"
              : "text-[--parchment-dim] hover:text-tavern-parchment"
          }`}
        >
          🔮 Single Quest Forge
        </button>
        <button
          onClick={() => setActiveTab("expedition")}
          className={`px-4 py-2 font-medium text-sm transition-all focus:outline-none relative ${
            activeTab === "expedition"
              ? "text-tavern-gold border-b-2 border-tavern-gold font-bold"
              : "text-[--parchment-dim] hover:text-tavern-parchment"
          }`}
        >
          🗺️ Travel Voyage Forge
        </button>
      </div>

      {/* Render the Active Forge */}
      {activeTab === "single" ? (
        <DiscoveryForge
          onQuestAccepted={() => {}}
          onQuestDismissed={() => {}}
        />
      ) : (
        <ExpeditionForge />
      )}
    </div>
  );
}
