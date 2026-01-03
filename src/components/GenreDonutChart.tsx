'use client';

import { motion } from 'framer-motion';

interface GenreData {
    genre: string;
    count: number;
    percentage: number;
    color: string;
}

interface GenreDonutChartProps {
    genres: GenreData[];
    topGenre?: GenreData;
}

// Colors matching the reference design
const GENRE_COLORS = [
    '#00D9C0', // Turquoise (primary)
    '#FF6B9D', // Pink
    '#6B7280', // Gray
    '#3B82F6', // Blue
    '#A855F7', // Purple
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
];

export function GenreDonutChart({ genres, topGenre }: GenreDonutChartProps) {
    const size = 280;
    const strokeWidth = 42;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Gap between segments
    const gapPercent = 1; // 1% gap between each segment
    const totalGaps = genres.slice(0, 5).length * gapPercent;
    const availablePercent = 100 - totalGaps;

    // Calculate segments with proper rotation offsets
    let currentRotation = 0;
    const segments = genres.slice(0, 5).map((genre, index) => {
        // Scale the percentage to available space
        const scaledPercent = (genre.percentage / 100) * availablePercent;
        const segmentLength = (scaledPercent / 100) * circumference;
        const rotation = currentRotation;

        // Move to next segment position (segment + gap)
        currentRotation += scaledPercent + gapPercent;

        return {
            ...genre,
            color: genre.color || GENRE_COLORS[index % GENRE_COLORS.length],
            segmentLength,
            rotation: rotation * 3.6, // Convert percentage to degrees
        };
    });

    const displayTopGenre = topGenre || genres[0];

    return (
        <div className="flex flex-col items-center">
            {/* Donut Chart */}
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={strokeWidth}
                    />

                    {/* Genre segments */}
                    {segments.map((segment, index) => (
                        <motion.circle
                            key={segment.genre}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${segment.segmentLength} ${circumference}`}
                            strokeDashoffset={0}
                            strokeLinecap="butt"
                            style={{
                                transformOrigin: 'center',
                                transform: `rotate(${segment.rotation - 90}deg)`,
                            }}
                            initial={{ strokeDasharray: `0 ${circumference}` }}
                            animate={{ strokeDasharray: `${segment.segmentLength} ${circumference}` }}
                            transition={{
                                duration: 0.8,
                                delay: index * 0.1,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                        />
                    ))}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-white text-xl font-medium tracking-wide"
                    >
                        {displayTopGenre?.genre || 'Mixed'}
                    </motion.span>
                    <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.65 }}
                        className="text-white text-5xl font-bold mt-1"
                    >
                        {displayTopGenre?.percentage || 0}%
                    </motion.span>
                </div>
            </div>

            {/* Legend */}
            <motion.div
                className="mt-10 space-y-3 w-full max-w-xs"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
            >
                {segments.map((segment, index) => (
                    <motion.div
                        key={segment.genre}
                        className="flex items-center justify-between px-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + index * 0.08 }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: segment.color }}
                            />
                            <span className="text-white/90 text-base">{segment.genre}</span>
                        </div>
                        <span className="text-white font-semibold text-base tabular-nums">
                            {segment.percentage}%
                        </span>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

export function assignGenreColors(genres: { genre: string; count: number }[], totalFilms: number): GenreData[] {
    // Get top 5 genres
    const topGenres = genres.slice(0, 5);

    // Calculate total from top genres only (so they sum to 100%)
    const topGenreTotal = topGenres.reduce((sum, g) => sum + g.count, 0);

    // Calculate raw percentages
    const rawPercentages = topGenres.map(g => (g.count / topGenreTotal) * 100);

    // Round and adjust to ensure sum is exactly 100
    let roundedPercentages = rawPercentages.map(p => Math.round(p));
    const sum = roundedPercentages.reduce((a, b) => a + b, 0);

    // Adjust the largest value to make sum exactly 100
    if (sum !== 100 && roundedPercentages.length > 0) {
        const diff = 100 - sum;
        const maxIndex = roundedPercentages.indexOf(Math.max(...roundedPercentages));
        roundedPercentages[maxIndex] += diff;
    }

    return topGenres.map((g, i) => ({
        ...g,
        percentage: roundedPercentages[i],
        color: GENRE_COLORS[i % GENRE_COLORS.length],
    }));
}
