"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

const TONIGHT_QUESTS = [
  {
    id: "q1",
    title: "Forge a 20-Minute Workout",
    blurb: "Do one focused strength circuit and log each set in your journal.",
    type: "side",
    xp: 60,
    href: "/board",
  },
  {
    id: "q2",
    title: "Sketch the Product Vision",
    blurb: "Map your next feature in three clear sections: problem, flow, and win state.",
    type: "main",
    xp: 220,
    href: "/board",
  },
  {
    id: "q3",
    title: "Learn 15 New Phrases",
    blurb: "Practice aloud and record a quick recap to lock in pronunciation.",
    type: "side",
    xp: 80,
    href: "/board",
  },
] as const;

export default function HomePage() {
  const [heroName, setHeroName] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pickedId, setPickedId] = useState<string>(TONIGHT_QUESTS[1].id);

  useEffect(() => {
    const check = async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const meta = data.session.user.user_metadata;
        setHeroName(meta?.display_name || meta?.name || "Adventurer");
      }
      setAuthChecked(true);
    };
    check();
  }, []);

  const isLoggedIn = authChecked && heroName !== null;
  const pickedQuest = TONIGHT_QUESTS.find((quest) => quest.id === pickedId) ?? TONIGHT_QUESTS[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6">
      <section className="tavrn-panel p-5 md:p-7">
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#4b3b2e] pb-4">
            <div>
              <h1 className="tavrn-wordmark text-4xl leading-none">tavrn</h1>
              <p className="text-[11px] text-[#cdb68f] mt-2 tracking-wide">a quiet corner of your life</p>
            </div>
            <div className="tavrn-kicker">Tonight&apos;s Hand · Three Drawn Quests</div>
          </header>

          <div className="tavern-card p-4 md:p-5">
            <p className="font-pixel text-tavern-gold text-[8px] mb-2">🍺 The barkeep speaks</p>
            <p className="text-[14px] leading-relaxed text-[#dbc59a]">
              {isLoggedIn
                ? `Welcome back, ${heroName}. Three quests are on the table tonight. Pick one and make it count.`
                : "Welcome, adventurer. Three quests are laid out tonight. Choose your path and begin your legend."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TONIGHT_QUESTS.map((quest) => {
              const active = pickedId === quest.id;
              return (
                <button
                  key={quest.id}
                  type="button"
                  onClick={() => setPickedId(quest.id)}
                  className={`text-left tavern-card p-4 transition-none ${
                    active ? "ring-2 ring-tavern-gold" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-pixel text-[7px] text-tavern-gold uppercase">
                      {quest.type === "main" ? "⚔ Main" : "🗡 Side"}
                    </span>
                    <span className="font-pixel text-[7px] text-retro-lime">+{quest.xp} XP</span>
                  </div>
                  <p className="font-pixel text-[9px] text-tavern-parchment mb-2 leading-relaxed">{quest.title}</p>
                  <p className="text-[12px] text-[#cdb68f] leading-relaxed">{quest.blurb}</p>
                </button>
              );
            })}
          </div>

          <div className="tavern-card p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="tavrn-kicker mb-2">Today&apos;s Quest</p>
              <p className="font-pixel text-[9px] text-tavern-gold">{pickedQuest.title}</p>
            </div>
            <div className="flex gap-2">
              <Link href="/board" className="tavrn-button !bg-tavern-oak !text-tavern-parchment">
                Draw Again
              </Link>
              <Link href={pickedQuest.href} className="tavrn-button">
                Accept
              </Link>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <div className="tavrn-panel p-4">
          <p className="tavrn-kicker mb-3">Hero Ledger</p>
          <p className="font-pixel text-[10px] text-tavern-gold">
            {isLoggedIn ? heroName : "Adventurer"}
          </p>
          <p className="text-[12px] text-[#cfb88f] mt-2">Level up by finishing one quest tonight.</p>
          <div className="mt-4 h-2 bg-black/40 border border-tavern-oak">
            <div className="h-full bg-tavern-gold" style={{ width: isLoggedIn ? "68%" : "24%" }} />
          </div>
        </div>

        <div className="tavrn-panel p-4">
          <p className="tavrn-kicker mb-3">In Progress</p>
          <div className="space-y-3">
            <div>
              <p className="font-pixel text-[8px] text-tavern-parchment">Learn conversational Spanish</p>
              <p className="text-[11px] text-[#bda780] mt-1">main quest · 40 / 90 days</p>
            </div>
            <div className="h-2 bg-black/40 border border-tavern-oak">
              <div className="h-full bg-retro-lime" style={{ width: "44%" }} />
            </div>
          </div>
        </div>

        <div className="tavern-card p-4" style={{ background: "linear-gradient(180deg, #3a1a3a, #1a0820)" }}>
          <p className="font-pixel text-[8px] text-tavern-gold mb-2">⚡ The Quest Giver</p>
          <p className="text-[13px] text-[#e8d4a0] leading-relaxed mb-3">
            Ask for a quest shaped to your current mood, location, and goals.
          </p>
          <Link href="/generate" className="tavrn-button block text-center !bg-[#8b2a8b] !text-white">
            Ask The Giver
          </Link>
        </div>
      </aside>
    </div>
  );
}
