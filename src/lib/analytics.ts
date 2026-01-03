import Papa from 'papaparse';
import { DiaryEntry, ParsedData, MovieStats, ViewingDistribution, HighlyRatedFilm, MostWatchedPeriod, Archetype, TasteProfile } from './types';

/**
 * Parse CSV content into diary entries
 */
export function parseCSV(csvContent: string): DiaryEntry[] {
    const result = Papa.parse<DiaryEntry>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    return result.data.map(entry => ({
        ...entry,
        Rating: entry.Rating ? parseFloat(String(entry.Rating)) : null,
        Year: entry.Year ? parseInt(String(entry.Year)) : 0,
    }));
}

/**
 * Detect the target year (year with most entries)
 */
export function detectTargetYear(entries: DiaryEntry[]): number {
    const yearCounts: Record<number, number> = {};

    entries.forEach(entry => {
        const date = new Date(entry.Date);
        if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
    });

    const years = Object.entries(yearCounts);
    if (years.length === 0) return new Date().getFullYear();

    return parseInt(years.sort((a, b) => b[1] - a[1])[0][0]);
}

/**
 * Filter entries by year
 */
export function filterByYear(entries: DiaryEntry[], year: number): DiaryEntry[] {
    return entries.filter(entry => {
        const date = new Date(entry.Date);
        return !isNaN(date.getTime()) && date.getFullYear() === year;
    });
}

/**
 * Calculate basic movie statistics
 */
export function calculateStats(entries: DiaryEntry[]): MovieStats {
    const totalFilms = entries.length;
    const uniqueFilms = new Set(entries.map(e => e.Name)).size;
    const rewatches = entries.filter(e => e.Rewatch?.toLowerCase() === 'yes').length;

    const ratedFilms = entries.filter(e => e.Rating !== null && !isNaN(e.Rating!));
    const avgRating = ratedFilms.length > 0
        ? Math.round((ratedFilms.reduce((sum, e) => sum + e.Rating!, 0) / ratedFilms.length) * 100) / 100
        : 0;

    // Estimate 2 hours per film
    const totalHours = Math.round(totalFilms * 2);

    return {
        totalFilms,
        uniqueFilms,
        totalHours,
        avgRating,
        rewatches,
        rewatchPct: totalFilms > 0 ? Math.round((rewatches / totalFilms) * 100) : 0,
    };
}

/**
 * Calculate viewing distribution
 */
export function calculateDistribution(entries: DiaryEntry[]): ViewingDistribution {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const monthly: Record<number, number> = {};
    const weekly: Record<string, number> = {};

    dayNames.forEach(day => weekly[day] = 0);
    for (let i = 1; i <= 12; i++) monthly[i] = 0;

    entries.forEach(entry => {
        const date = new Date(entry.Date);
        if (!isNaN(date.getTime())) {
            const month = date.getMonth() + 1;
            const dayOfWeek = dayNames[date.getDay()];
            monthly[month]++;
            weekly[dayOfWeek]++;
        }
    });

    const busiestMonthNum = Object.entries(monthly).sort((a, b) => b[1] - a[1])[0];
    const busiestDayEntry = Object.entries(weekly).sort((a, b) => b[1] - a[1])[0];

    return {
        monthly,
        weekly,
        busiestMonth: busiestMonthNum ? monthNames[parseInt(busiestMonthNum[0]) - 1] : null,
        busiestDay: busiestDayEntry ? busiestDayEntry[0] : null,
    };
}

/**
 * Get highly rated films (4.5+ stars)
 */
export function getHighlyRatedFilms(entries: DiaryEntry[], minRating = 4.5): HighlyRatedFilm[] {
    return entries
        .filter(e => e.Rating !== null && e.Rating >= minRating)
        .sort((a, b) => (b.Rating || 0) - (a.Rating || 0))
        .slice(0, 6)
        .map(e => ({
            name: e.Name,
            rating: e.Rating!,
            year: e.Year,
        }));
}

/**
 * Find the most watched day
 */
export function findMostWatchedDay(entries: DiaryEntry[]): MostWatchedPeriod {
    const dayMap: Record<string, string[]> = {};

    entries.forEach(entry => {
        const date = entry.Date.split('T')[0];
        if (!dayMap[date]) dayMap[date] = [];
        dayMap[date].push(entry.Name);
    });

    const sorted = Object.entries(dayMap).sort((a, b) => b[1].length - a[1].length);

    if (sorted.length === 0) return { date: null, count: 0, films: [] };

    return {
        date: sorted[0][0],
        count: sorted[0][1].length,
        films: sorted[0][1],
    };
}

/**
 * Calculate taste stability score
 */
export function calculateTasteProfile(entries: DiaryEntry[]): TasteProfile {
    const ratedFilms = entries.filter(e => e.Rating !== null);

    if (ratedFilms.length < 5) {
        return { stabilityScore: 50, ratingVolatility: 0.5, isContrarian: false, contrarianScore: 0 };
    }

    // Calculate rating volatility (standard deviation)
    const ratings = ratedFilms.map(e => e.Rating!);
    const mean = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);

    // Higher volatility = lower stability
    const ratingVolatility = Math.min(stdDev / 2.5, 1); // Normalize to 0-1
    const stabilityScore = Math.round((1 - ratingVolatility) * 100);

    return {
        stabilityScore,
        ratingVolatility: Math.round(ratingVolatility * 100) / 100,
        isContrarian: mean < 3.5 || ratingVolatility > 0.6,
        contrarianScore: Math.round((1 - mean / 5) * 100),
    };
}

/**
 * Classify user into archetype
 */
export function classifyArchetype(entries: DiaryEntry[], stats: MovieStats): Archetype {
    const rewatchRatio = stats.rewatches / stats.totalFilms;
    const avgRating = stats.avgRating;
    const tasteProfile = calculateTasteProfile(entries);

    // Archetype definitions with conditions
    const archetypes: Archetype[] = [
        {
            id: 'marathoner',
            name: 'The Marathoner',
            emoji: '🏃',
            tagline: 'Quantity is a quality of its own.',
            description: 'You don\'t just watch movies — you consume them. Cinema isn\'t a hobby, it\'s a lifestyle.',
            evidence: [`${stats.totalFilms} films watched`, `${stats.totalHours} hours of your life`, 'No breaks. No mercy.'],
        },
        {
            id: 'comfort-rewinder',
            name: 'The Comfort Rewinder',
            emoji: '🔁',
            tagline: 'Why risk disappointment?',
            description: 'You find solace in the familiar. Rewatching isn\'t repetition — it\'s ritual.',
            evidence: [`${stats.rewatches} rewatches`, `${Math.round(rewatchRatio * 100)}% rewatch rate`, 'Comfort over curiosity'],
        },
        {
            id: 'chaos-curator',
            name: 'The Chaos Curator',
            emoji: '🎲',
            tagline: 'Predictability is for the weak.',
            description: 'Your taste is a beautiful mess. You don\'t follow trends — you defy them.',
            evidence: [`Volatility: ${tasteProfile.ratingVolatility}`, 'Wildly inconsistent ratings', 'Genre? Never heard of her.'],
        },
        {
            id: 'prestige-purist',
            name: 'The Prestige Purist',
            emoji: '🎭',
            tagline: 'Only the finest for your eyes.',
            description: 'You have standards. High ones. Not everything deserves your attention.',
            evidence: [`Avg rating: ${avgRating}⭐`, 'High bar, few disappointments', 'Quality over quantity'],
        },
        {
            id: 'emotional-explorer',
            name: 'The Emotional Explorer',
            emoji: '💔',
            tagline: 'Cinema is therapy.',
            description: 'You seek movies that make you feel. The heavier, the better.',
            evidence: ['Drawn to emotional weight', 'Heavy dramas dominate', 'You watch to process'],
        },
    ];

    // Selection logic
    if (stats.totalFilms >= 100) return archetypes[0]; // Marathoner
    if (rewatchRatio >= 0.3) return archetypes[1]; // Comfort Rewinder
    if (tasteProfile.ratingVolatility > 0.5) return archetypes[2]; // Chaos Curator
    if (avgRating >= 4.0) return archetypes[3]; // Prestige Purist

    return archetypes[4]; // Emotional Explorer (default)
}

/**
 * Generate micro-copy with personality
 */
export function generateMicroCopy(stats: MovieStats): Record<string, string> {
    return {
        hours: `${stats.totalHours} hours voluntarily spent staring at stories`,
        films: `${stats.totalFilms} films. That's not a hobby — that's commitment.`,
        rating: `Average rating: ${stats.avgRating}⭐ — ${stats.avgRating >= 4 ? 'Easy to please, or just good taste?' : 'Hard to impress. We respect that.'}`,
        rewatches: stats.rewatches > 0
            ? `${stats.rewatches} films you just couldn't let go`
            : 'No rewatches. Always chasing something new.',
    };
}
