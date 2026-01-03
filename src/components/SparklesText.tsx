"use client";

import { motion } from "framer-motion";
import { CSSProperties, ReactNode, useEffect, useState } from "react";

interface SparklesTextProps {
    children: ReactNode;
    className?: string;
    sparklesCount?: number;
    colors?: { first: string; second: string };
}

interface Sparkle {
    id: string;
    x: string;
    y: string;
    color: string;
    delay: number;
    scale: number;
}

export function SparklesText({
    children,
    className = "",
    sparklesCount = 10,
    colors = { first: "#FFD700", second: "#FFA500" },
}: SparklesTextProps) {
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        const generateSparkles = (): Sparkle[] => {
            return Array.from({ length: sparklesCount }, (_, i) => ({
                id: `sparkle-${i}`,
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                color: Math.random() > 0.5 ? colors.first : colors.second,
                delay: Math.random() * 2,
                scale: Math.random() * 0.5 + 0.5,
            }));
        };

        setSparkles(generateSparkles());

        const interval = setInterval(() => {
            setSparkles(generateSparkles());
        }, 3000);

        return () => clearInterval(interval);
    }, [sparklesCount, colors.first, colors.second]);

    return (
        <span
            className={`relative inline-block ${className}`}
            style={{ position: "relative" } as CSSProperties}
        >
            {sparkles.map((sparkle) => (
                <motion.svg
                    key={sparkle.id}
                    className="pointer-events-none absolute"
                    style={{
                        left: sparkle.x,
                        top: sparkle.y,
                        transform: `translate(-50%, -50%) scale(${sparkle.scale})`,
                    }}
                    initial={{ opacity: 0, scale: 0, rotate: 0 }}
                    animate={{
                        opacity: [0, 1, 0],
                        scale: [0, sparkle.scale, 0],
                        rotate: [0, 180],
                    }}
                    transition={{
                        duration: 1.5,
                        delay: sparkle.delay,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 2 + 1,
                    }}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
                        fill={sparkle.color}
                    />
                </motion.svg>
            ))}
            <span className="relative z-10">{children}</span>
        </span>
    );
}

export default SparklesText;
