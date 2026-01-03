'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilmCountdown } from './FilmCountdown';
import { CurtainsOpening } from './CurtainsOpening';
import { FilmGrainCSS } from './FilmGrain';

interface CinematicEntranceProps {
    children: React.ReactNode;
    enableGrain?: boolean;
    skipable?: boolean;
}

type AnimationPhase = 'countdown' | 'curtains' | 'complete';

const STORAGE_KEY = 'letterboxd-wrapped-skip-intro';

export function CinematicEntrance({
    children,
    enableGrain = true,
    skipable = true
}: CinematicEntranceProps) {
    const [phase, setPhase] = useState<AnimationPhase>('countdown');
    const [shouldSkip, setShouldSkip] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Check if user has opted to skip
        const skipPref = localStorage.getItem(STORAGE_KEY);
        if (skipPref === 'true') {
            setShouldSkip(true);
            setPhase('complete');
        }
        setIsLoaded(true);
    }, []);

    const handleCountdownComplete = useCallback(() => {
        setPhase('curtains');
    }, []);

    const handleCurtainsComplete = useCallback(() => {
        setPhase('complete');
    }, []);

    const handleSkip = useCallback(() => {
        setPhase('complete');
        if (skipable) {
            localStorage.setItem(STORAGE_KEY, 'true');
        }
    }, [skipable]);

    const handleReplayIntro = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setShouldSkip(false);
        setPhase('countdown');
    }, []);

    // Don't render until client-side check is complete
    if (!isLoaded) return null;

    // Skip directly to content
    if (shouldSkip) {
        return (
            <>
                {children}
                {enableGrain && <FilmGrainCSS />}
            </>
        );
    }

    return (
        <>
            {/* Skip button during animation */}
            {phase !== 'complete' && skipable && (
                <button
                    onClick={handleSkip}
                    className="fixed bottom-8 right-8 z-[60] px-4 py-2 rounded-full bg-black/50 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-all text-sm backdrop-blur-sm"
                >
                    Skip Intro →
                </button>
            )}

            {/* Animation phases */}
            {phase === 'countdown' && (
                <FilmCountdown onComplete={handleCountdownComplete} duration={2400} />
            )}

            {phase === 'curtains' && (
                <CurtainsOpening onComplete={handleCurtainsComplete} duration={1500} />
            )}

            {/* Main content - always rendered but hidden during animation */}
            <div
                className={phase === 'complete' ? 'opacity-100' : 'opacity-0'}
                style={{ transition: 'opacity 0.5s ease-in-out' }}
            >
                {children}
            </div>

            {/* Film grain overlay */}
            {enableGrain && phase === 'complete' && <FilmGrainCSS />}

            {/* Replay intro button (shown after complete) */}
            {phase === 'complete' && (
                <button
                    onClick={handleReplayIntro}
                    className="fixed bottom-8 left-8 z-50 px-3 py-1.5 rounded-full bg-cinema-card/80 border border-purple-500/20 text-gray-500 hover:text-gray-300 hover:border-purple-500/40 transition-all text-xs"
                    title="Replay intro animation"
                >
                    🎬 Replay Intro
                </button>
            )}
        </>
    );
}
