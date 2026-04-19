"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CollapsibleHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleHeader({
  children,
  className = "",
}: CollapsibleHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          // Always show at top
          if (currentScrollY < 50) {
            setIsVisible(true);
          } else {
            // Hide on scroll down, show on scroll up
            const delta = currentScrollY - lastScrollY.current;
            if (delta > 5) {
              setIsVisible(false);
            } else if (delta < -5) {
              setIsVisible(true);
            }
          }
          
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`sticky top-0 z-50 ${className}`}
        >
          {children}
        </motion.header>
      )}
    </AnimatePresence>
  );
}
