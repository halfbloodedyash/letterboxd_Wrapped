import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TMDBMovie {
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
    genre_ids: number[];
}

interface TMDBSearchResponse {
    results: TMDBMovie[];
}

// TMDB genre ID to name mapping
const GENRE_MAP: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const movieName = searchParams.get('name');
    const movieYear = searchParams.get('year');

    if (!movieName) {
        return NextResponse.json({ error: 'Movie name is required' }, { status: 400 });
    }

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    try {
        const query = encodeURIComponent(movieName);
        let url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${query}`;
        if (movieYear) {
            url += `&year=${movieYear}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data: TMDBSearchResponse = await response.json();

        if (data.results.length === 0) {
            return NextResponse.json({
                posterUrl: null,
                genres: []
            });
        }

        const movie = data.results[0];
        const posterUrl = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null;
        const genres = movie.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean);

        return NextResponse.json({
            posterUrl,
            genres,
            title: movie.title,
            year: movie.release_date?.split('-')[0] || null,
        });
    } catch (error) {
        console.error('TMDB fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 500 });
    }
}

// Batch endpoint for multiple movies
export async function POST(request: NextRequest) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
    }

    try {
        const { movies } = await request.json();

        if (!Array.isArray(movies) || movies.length === 0) {
            return NextResponse.json({ error: 'Movies array is required' }, { status: 400 });
        }

        // Limit to 20 movies per request to avoid rate limiting
        const limitedMovies = movies.slice(0, 20);

        const results = await Promise.all(
            limitedMovies.map(async (movie: { name: string; year?: string | number }) => {
                const query = encodeURIComponent(movie.name);

                // Try with year first
                let url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${query}`;
                if (movie.year) {
                    url += `&year=${movie.year}`;
                }

                try {
                    let response = await fetch(url);
                    if (!response.ok) return { name: movie.name, posterUrl: null, genres: [] };

                    let data: TMDBSearchResponse = await response.json();

                    // If no results with year, try without year
                    if (data.results.length === 0 && movie.year) {
                        const urlWithoutYear = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${query}`;
                        response = await fetch(urlWithoutYear);
                        if (response.ok) {
                            data = await response.json();
                        }
                    }

                    if (data.results.length === 0) {
                        return { name: movie.name, posterUrl: null, genres: [] };
                    }

                    const result = data.results[0];
                    return {
                        name: movie.name,
                        posterUrl: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : null,
                        genres: result.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean),
                    };
                } catch {
                    return { name: movie.name, posterUrl: null, genres: [] };
                }
            })
        );

        return NextResponse.json({ results });
    } catch (error) {
        console.error('TMDB batch fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 500 });
    }
}
