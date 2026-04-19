"use client";

import React from "react";
import { useViewMode } from "@/components/ViewModeProvider";

export default function DesktopRightRail({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { isDesktopActive } = useViewMode();

  if (!isDesktopActive) {
    return null;
  }

  return (
    <aside className="hidden xl:block sticky top-24 self-start w-72">
      <div className="tavern-card p-4">
        <h3 className="font-pixel text-tavern-gold text-[8px] mb-3 uppercase tracking-wider">
          {title}
        </h3>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </aside>
  );
}
