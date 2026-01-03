"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import useSound from "use-sound";

interface MusicToggleButtonProps {
    audioSrc?: string;
    autoPlay?: boolean;
}

export const MusicToggleButton = ({
    audioSrc = "/audio/audio.m4a",
    autoPlay = false
}: MusicToggleButtonProps) => {
    const bars = 5;
    const hasAutoPlayed = useRef(false);

    const getRandomHeights = () => {
        return Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
    };

    const [heights, setHeights] = useState(getRandomHeights());
    const [isPlaying, setIsPlaying] = useState(false);

    const [play, { pause }] = useSound(audioSrc, {
        loop: true,
        volume: 0.5,
        onplay: () => setIsPlaying(true),
        onend: () => setIsPlaying(false),
        onpause: () => setIsPlaying(false),
        onstop: () => setIsPlaying(false),
        soundEnabled: true,
    });

    // Auto-play on mount if enabled
    useEffect(() => {
        if (autoPlay && !hasAutoPlayed.current) {
            hasAutoPlayed.current = true;
            // Small delay to ensure component is mounted
            const timer = setTimeout(() => {
                play();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [autoPlay, play]);

    useEffect(() => {
        if (isPlaying) {
            const waveformIntervalId = setInterval(() => {
                setHeights(getRandomHeights());
            }, 100);

            return () => {
                clearInterval(waveformIntervalId);
            };
        }
        setHeights(Array(bars).fill(0.1));
    }, [isPlaying]);

    const handleClick = () => {
        if (isPlaying) {
            pause();
            setIsPlaying(false);
            return;
        }
        play();
        setIsPlaying(true);
    };

    return (
        <motion.div
            onClick={handleClick}
            initial={{ padding: "10px" }}
            whileHover={{ padding: "12px" }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring" }}
            className="cursor-pointer rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title={isPlaying ? "Pause music" : "Play music"}
        >
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-[18px] w-[24px] items-center justify-center gap-[2px]"
            >
                {heights.map((height, index) => (
                    <motion.div
                        key={index}
                        className="w-[2px] rounded-full bg-white"
                        initial={{ height: 4 }}
                        animate={{
                            height: Math.max(4, height * 16),
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 10,
                        }}
                    />
                ))}
            </motion.div>
        </motion.div>
    );
};
