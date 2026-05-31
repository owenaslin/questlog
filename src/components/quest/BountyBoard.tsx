"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Quest } from "@/lib/types";
import {
  getUserCreatedActiveQuests,
  createOneOffBounty,
  completeQuest,
} from "@/lib/quest-progress";

export default function BountyBoard() {
  const [bounties, setBounties] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [difficulty, setDifficulty] = useState<number>(2); // 1 = Trivial, 2 = Minor, 3 = Major
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [xpAnimations, setXpAnimations] = useState<{ id: string; amount: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchBounties = useCallback(async () => {
    try {
      const activeUserQuests = await getUserCreatedActiveQuests();
      if (!mountedRef.current) return;
      const userBounties = activeUserQuests.filter((q) => q.source === "user");
      setBounties(userBounties);
    } catch (err) {
      console.error("Failed to fetch bounties:", err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  const handlePostBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || posting) return;

    setPosting(true);
    setErrorMsg(null);

    try {
      const result = await createOneOffBounty(titleInput.trim(), difficulty);
      if (result.success) {
        setTitleInput("");
        setDifficulty(2);
        await fetchBounties();
      } else {
        setErrorMsg(result.error || "Failed to post bounty.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      if (mountedRef.current) setPosting(false);
    }
  };

  const handleCompleteBounty = async (quest: Quest) => {
    if (completingId) return;

    setCompletingId(quest.id);
    setErrorMsg(null);

    try {
      const result = await completeQuest(quest.id, "side", quest.category);

      if (result.success) {
        // Trigger +XP float animation
        setXpAnimations((prev) => [
          ...prev,
          { id: quest.id, amount: quest.xp_reward },
        ]);
        
        // Remove animation after 2 seconds
        setTimeout(() => {
          if (mountedRef.current) {
            setXpAnimations((prev) => prev.filter((a) => a.id !== quest.id));
          }
        }, 2000);

        // Fetch refreshed list
        await fetchBounties();
      } else {
        setErrorMsg(result.error || "Failed to complete bounty.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      if (mountedRef.current) setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="tavrn-panel p-4 md:p-5 animate-pulse min-h-[180px]">
        <div className="h-4 bg-tavern-oak/50 rounded w-1/4 mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-tavern-oak/30 rounded" />
          <div className="h-8 bg-tavern-oak/20 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="tavrn-panel p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#4b3b2e] pb-3 mb-4">
        <div>
          <p className="kicker">Guild Bounty Board</p>
          <p className="text-[11px] text-[#cdb68f] mt-1">Quick one-off tasks for immediate gold and glory</p>
        </div>
        <span className="text-xl">📋</span>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2 border border-red-700 bg-red-900/20 text-xs text-red-400">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handlePostBounty} className="mb-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Post a new bounty (e.g., Pick up groceries)..."
            className="flex-1 bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment text-sm focus:border-tavern-gold focus:outline-none"
            disabled={posting}
            maxLength={80}
            required
          />
          <div className="flex gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="bg-tavern-smoke border-2 border-tavern-oak rounded p-2 text-tavern-parchment text-sm focus:border-tavern-gold focus:outline-none"
              disabled={posting}
            >
              <option value={1}>★ Trivial (10 XP)</option>
              <option value={2}>★★ Minor (25 XP)</option>
              <option value={3}>★★★ Major (50 XP)</option>
            </select>
            <button
              type="submit"
              disabled={posting || !titleInput.trim()}
              className="tavrn-btn tavrn-btn-primary tavrn-btn-sm whitespace-nowrap min-h-[38px] disabled:opacity-50"
            >
              {posting ? "Posting..." : "Post Bounty"}
            </button>
          </div>
        </div>
      </form>

      {/* Bounty list */}
      <div className="space-y-2">
        {bounties.length === 0 ? (
          <div className="text-center py-6 px-4 bg-black/10 border border-tavern-oak/30 rounded">
            <p className="text-sm text-tavern-parchment-dim mb-1">
              Your bounty board is empty.
            </p>
            <p className="text-xs text-[#8a7258]">
              Post a one-off task above to set a target for today!
            </p>
          </div>
        ) : (
          bounties.map((bounty, index) => {
            const isCompleting = completingId === bounty.id;
            const xpAmount = xpAnimations.find((a) => a.id === bounty.id)?.amount;
            const stars = "★".repeat(bounty.difficulty) + "☆".repeat(3 - bounty.difficulty);

            return (
              <div
                key={bounty.id}
                style={{
                  opacity: 0,
                  animation: "fadeInSlide 0.25s ease-out forwards",
                  animationDelay: `${index * 40}ms`,
                }}
                className="relative flex items-center justify-between p-3 border border-tavern-oak/50 bg-tavern-smoke/20 hover:border-tavern-gold/45 transition-all group"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-tavern-parchment truncate">
                    {bounty.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-tavern-ember tracking-wide">
                      {stars}
                    </span>
                    <span className="text-[10px] text-[#cdb68f]/70">•</span>
                    <span className="text-[10px] text-[#cdb68f]/70 uppercase tracking-wider">
                      Productivity Bounty
                    </span>
                  </div>
                </div>

                {xpAmount && (
                  <span className="xp-particle right-16">
                    +{xpAmount} XP
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <span className="badge badge-lime">+{bounty.xp_reward} XP</span>
                  
                  {/* Custom check button */}
                  <button
                    type="button"
                    aria-label={`Complete bounty: ${bounty.title}`}
                    onClick={() => handleCompleteBounty(bounty)}
                    disabled={!!completingId}
                    className={`w-6 h-6 border-2 flex items-center justify-center rounded cursor-pointer transition-all ${
                      isCompleting
                        ? "border-tavern-gold bg-tavern-gold/20"
                        : "border-tavern-oak hover:border-tavern-gold bg-black/30"
                    }`}
                  >
                    {isCompleting ? (
                      <div className="w-2.5 h-2.5 bg-tavern-gold animate-ping rounded-sm" />
                    ) : (
                      <span className="text-[10px] text-tavern-oak group-hover:text-tavern-gold font-bold">✓</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
