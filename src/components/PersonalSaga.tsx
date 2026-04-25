"use client";

import React from "react";
import { useSpring, animated } from "@react-spring/web";
import type { PersonalSaga } from "@/lib/saga-generator";
import { getSagaArchetype } from "@/lib/saga-generator";

interface PersonalSagaProps {
  saga: PersonalSaga;
  heroName: string;
}

function ChapterItem({ chapter, index }: { chapter: any; index: number }) {
  const spring = useSpring({
    opacity: 1,
    x: 0,
    delay: index * 150,
    config: { duration: 600 },
  });

  return (
    <animated.div
      style={{
        opacity: spring.opacity,
        transform: spring.x.to((x) => `translateX(${x}px)`),
      }}
      className="relative pl-4 border-l-2 border-tavern-oak"
    >
      <div className="absolute -left-[5px] top-0 w-2 h-2 bg-tavern-gold rounded-full" />
      <h4 className="font-pixel text-tavern-gold text-[9px] mb-1">
        Chapter {index + 1}: {chapter.title}
      </h4>
      <p className="font-pixel text-tavern-parchment text-[7px] leading-relaxed opacity-90">
        {chapter.description}
      </p>
      {chapter.date && (
        <p className="font-pixel text-tavern-smoke-light text-[6px] mt-1 opacity-60">
          {new Date(chapter.date).toLocaleDateString()}
        </p>
      )}
    </animated.div>
  );
}

export default function PersonalSaga({ saga, heroName }: PersonalSagaProps) {
  const archetype = getSagaArchetype(saga);

  const handleShare = async () => {
    const text = `🍺 ${heroName}: ${saga.title}\n\n${saga.subtitle}\n\n${saga.stats.totalQuests} quests completed across ${saga.stats.categoriesExplored} categories!`;
    
    if (navigator.share) {
      await navigator.share({
        title: `${heroName}'s Saga`,
        text,
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  };

  if (saga.chapters.length === 0) {
    return (
      <div className="tavern-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">📖</span>
          <h2 className="font-pixel text-tavern-gold text-[10px]">Your Saga</h2>
        </div>
        <p className="font-pixel text-tavern-parchment text-[8px] leading-loose opacity-70 text-center py-8">
          Your legend has not yet begun.<br />
          Complete your first quest to start writing your story.
        </p>
      </div>
    );
  }

  return (
    <div className="tavern-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📜</span>
            <span className="font-pixel text-tavern-smoke-light text-[7px] uppercase tracking-wider">
              The Chronicles of
            </span>
          </div>
          <h2 className="font-pixel text-tavern-gold text-lg leading-tight mb-1">
            {heroName}
          </h2>
          <p className="font-pixel text-tavern-cyan text-[8px]">
            {archetype}
          </p>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-tavern-oak hover:border-tavern-gold transition-colors"
          title="Share your saga"
        >
          <span className="text-sm">🔗</span>
          <span className="font-pixel text-[7px] text-tavern-parchment">Share</span>
        </button>
      </div>

      {/* Saga Title */}
      <div className="text-center mb-6 p-4 border-2 border-tavern-oak bg-tavern-smoke/30">
        <h3 className="font-pixel text-tavern-gold text-[11px] leading-relaxed mb-2">
          {saga.title}
        </h3>
        <p className="font-pixel text-tavern-parchment text-[8px] opacity-80">
          {saga.subtitle}
        </p>
      </div>

      {/* Chapters */}
      <div className="space-y-4 mb-6">
        {saga.chapters.map((chapter, index) => (
          <ChapterItem key={chapter.type} chapter={chapter} index={index} />
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t-2 border-tavern-oak">
        <StatBox label="Quests" value={saga.stats.totalQuests} />
        <StatBox label="Categories" value={saga.stats.categoriesExplored} />
        <StatBox label="Best Streak" value={`${saga.stats.longestStreak}d`} />
        <StatBox 
          label="Focus" 
          value={saga.stats.dominantCategory.slice(0, 8)} 
        />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-2 bg-tavern-smoke/20">
      <div className="font-pixel text-tavern-gold text-base leading-none mb-1">
        {value}
      </div>
      <div className="font-pixel text-tavern-smoke-light text-[6px] uppercase">
        {label}
      </div>
    </div>
  );
}
