'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface CurtainsOpeningProps {
    onComplete: () => void;
    duration?: number;
}

export function CurtainsOpening({ onComplete, duration = 1500 }: CurtainsOpeningProps) {
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsAnimating(false);
            setTimeout(onComplete, 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onComplete]);

    // Curtain pleats pattern
    const pleatsCount = 15;
    const createPleats = () =>
        Array.from({ length: pleatsCount }).map((_, i) => (
            <div
                key={i}
                className="h-full"
                style={{
                    width: `${100 / pleatsCount}%`,
                    background: `linear-gradient(90deg, 
            rgba(139, 0, 0, 0.9) 0%, 
            rgba(178, 34, 34, 1) 30%, 
            rgba(139, 0, 0, 0.95) 50%,
            rgba(178, 34, 34, 1) 70%,
            rgba(139, 0, 0, 0.9) 100%
          )`,
                }}
            />
        ));

    return (
        <AnimatePresence>
            {isAnimating && (
                <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
                    {/* Left curtain */}
                    <motion.div
                        initial={{ x: 0 }}
                        animate={{ x: '-100%' }}
                        exit={{ x: '-100%' }}
                        transition={{
                            duration: duration / 1000,
                            ease: [0.22, 1, 0.36, 1] // Custom easing
                        }}
                        className="absolute left-0 top-0 w-1/2 h-full flex"
                        style={{
                            boxShadow: 'inset -50px 0 100px rgba(0,0,0,0.5)',
                        }}
                    >
                        {createPleats()}
                        {/* Curtain edge shadow */}
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/50 to-transparent" />
                        {/* Gold trim */}
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-300" />
                    </motion.div>

                    {/* Right curtain */}
                    <motion.div
                        initial={{ x: 0 }}
                        animate={{ x: '100%' }}
                        exit={{ x: '100%' }}
                        transition={{
                            duration: duration / 1000,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className="absolute right-0 top-0 w-1/2 h-full flex"
                        style={{
                            boxShadow: 'inset 50px 0 100px rgba(0,0,0,0.5)',
                        }}
                    >
                        {createPleats()}
                        {/* Curtain edge shadow */}
                        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/50 to-transparent" />
                        {/* Gold trim */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-300" />
                    </motion.div>

                    {/* Top drape/valance */}
                    <motion.div
                        initial={{ y: 0 }}
                        animate={{ y: '-100%' }}
                        transition={{
                            duration: duration / 1000,
                            ease: [0.22, 1, 0.36, 1],
                            delay: 0.1
                        }}
                        className="absolute top-0 left-0 right-0 h-20"
                        style={{
                            background: 'linear-gradient(180deg, #8B0000 0%, #B22222 50%, #8B0000 100%)',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Gold fringe */}
                        <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-amber-200 to-amber-400" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
