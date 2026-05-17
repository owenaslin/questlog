"use client";

import React from "react";
import { useViewMode } from "@/components/ui/ViewModeProvider";

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
        <h3 className="kicker text-tavern-gold mb-3">
          {title}
        </h3>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </aside>
  );
}
