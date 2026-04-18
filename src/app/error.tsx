"use client";

import React from "react";
import PixelButton from "@/components/PixelButton";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4">
      <div className="text-4xl mb-4">💥</div>
      <h2 className="font-pixel text-retro-red text-lg mb-4">
        Something went wrong!
      </h2>
      <p className="font-pixel text-retro-lightgray text-[10px] mb-6 max-w-md leading-loose">
        {error.message || "An unexpected error occurred while loading this quest."}
      </p>
      {error.digest && (
        <p className="font-pixel text-retro-gray text-[8px] mb-6">
          Error ID: {error.digest}
        </p>
      )}
      <PixelButton variant="primary" onClick={reset}>
        Try Again
      </PixelButton>
    </div>
  );
}
