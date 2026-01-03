"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuroraTextProps {
    children: ReactNode;
    className?: string;
}

export function AuroraText({ children, className = "" }: AuroraTextProps) {
    return (
        <span
            className={`relative inline-block ${className}`}
            style={{
                background: "linear-gradient(90deg, #60a5fa, #a855f7, #ec4899, #60a5fa)",
                backgroundSize: "200% 100%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "aurora 4s linear infinite",
            }}
        >
            <style jsx>{`
        @keyframes aurora {
          0% {
            background-position: 0% 50%;
          }
          100% {
            background-position: 200% 50%;
          }
        }
      `}</style>
            {children}
        </span>
    );
}

export default AuroraText;
