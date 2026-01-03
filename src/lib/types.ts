// Types for Letterboxd data
export interface DiaryEntry {
    Date: string;
    Name: string;
    Year: number | string;
    'Letterboxd URI'?: string;
    Rating: number | null;
    Rewatch?: string;
    Tags?: string;
    'Watched Date'?: string;
}

export interface ParsedData {
    entries: DiaryEntry[];
    totalFilms: number;
    uniqueFilms: number;
    year: number;
}

export interface MovieStats {
    totalFilms: number;
    uniqueFilms: number;
    totalHours: number;
    avgRating: number;
    rewatches: number;
    rewatchPct: number;
}

export interface GenreCount {
    genre: string;
    count: number;
    percentage: number;
    color: string;
}

export interface ViewingDistribution {
    monthly: Record<number, number>;
    weekly: Record<string, number>;
    busiestMonth: string | null;
    busiestDay: string | null;
}

export interface HighlyRatedFilm {
    name: string;
    rating: number;
    year: number | string;
    posterUrl?: string;
}

export interface Archetype {
    id: string;
    name: string;
    emoji: string;
    tagline: string;
    description: string;
    evidence: string[];
}

export interface MostWatchedPeriod {
    date: string | null;
    count: number;
    films: string[];
}

export interface TasteProfile {
    stabilityScore: number; // 0-100
    ratingVolatility: number;
    isContrarian: boolean;
    contrarianScore: number;
}

export interface CinemaDNA {
    topGenres: { name: string; percentage: number }[];
    movieIfYearWasFilm: {
        genre: string;
        runtime: string;
        tagline: string;
    };
}
