"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showHandle?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  showHandle = true,
}: BottomSheetProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-tavern-smoke border-t-4 border-tavern-oak rounded-t-2xl max-h-[85vh] overflow-hidden md:hidden"
          >
            {/* Handle bar */}
            {showHandle && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-tavern-oak rounded-full" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="px-4 py-3 border-b-2 border-tavern-oak">
                <h2 className="font-pixel text-tavern-gold text-sm text-center">
                  {title}
                </h2>
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-60px)] pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
