'use client';

import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import JSZip from 'jszip';

export interface ReviewData {
    movieName: string;
    year: string;
    rating: number;
    review: string;
    date: string;
}

export interface RewatchData {
    movieName: string;
    year: string;
    rating: number;
}

export interface WatchlistData {
    movieName: string;
    year: string;
    dateAdded: string;
}

export interface FileUploadResult {
    diaryContent: string;
    username?: string;
    reviews?: ReviewData[];
    allReviews?: ReviewData[]; // All reviews for Gemini analysis
    rewatched?: RewatchData[];
    watchlist?: WatchlistData[];
}

interface FileUploadProps {
    onFileSelect: (result: FileUploadResult) => void;
    isLoading: boolean;
}

// Parse username from profile.csv (Letterboxd format)
function parseProfileCSV(content: string): string | undefined {
    const lines = content.split('\n');
    if (lines.length < 2) return undefined;

    // Parse headers - handle potential quotes
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    // Try to find "given name" first for friendlier display, then fall back to "username"
    const givenNameIndex = headers.findIndex(h => h === 'given name');
    const usernameIndex = headers.findIndex(h => h === 'username');

    // Parse data row
    const dataLine = lines[1];
    const values = dataLine.split(',').map(v => v.trim().replace(/"/g, ''));

    // Prefer given name if available, otherwise use username
    if (givenNameIndex !== -1 && values[givenNameIndex]) {
        return values[givenNameIndex];
    }
    if (usernameIndex !== -1 && values[usernameIndex]) {
        return values[usernameIndex];
    }

    return undefined;
}

// Parse reviews from reviews.csv
function parseReviewsCSV(content: string): { top3: ReviewData[]; all: ReviewData[] } {
    const lines = content.split('\n');
    if (lines.length < 2) return { top3: [], all: [] };

    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const dateIndex = headers.findIndex(h => h === 'date');
    const nameIndex = headers.findIndex(h => h === 'name');
    const yearIndex = headers.findIndex(h => h === 'year');
    const ratingIndex = headers.findIndex(h => h === 'rating');
    const reviewIndex = headers.findIndex(h => h === 'review');

    const reviews: ReviewData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Handle CSV with potential commas in review text (quoted fields)
        const values = parseCSVLine(line);

        const review = reviewIndex !== -1 ? values[reviewIndex]?.trim() : '';
        if (!review) continue; // Skip entries without reviews

        reviews.push({
            movieName: nameIndex !== -1 ? values[nameIndex]?.trim().replace(/"/g, '') : '',
            year: yearIndex !== -1 ? values[yearIndex]?.trim().replace(/"/g, '') : '',
            rating: ratingIndex !== -1 ? parseFloat(values[ratingIndex]) || 0 : 0,
            review: review.replace(/"/g, ''),
            date: dateIndex !== -1 ? values[dateIndex]?.trim().replace(/"/g, '') : '',
        });
    }

    // Filter and sort reviews
    const validReviews = reviews
        .filter(r => r.review.length > 10) // Filter out very short reviews
        .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.review.length - a.review.length;
        });

    // Return top 3 for display, all for analysis
    return {
        top3: validReviews.slice(0, 3),
        all: validReviews
    };
}

// Parse rewatched movies from reviews.csv
function parseRewatchedCSV(content: string): RewatchData[] {
    const lines = content.split('\n');
    if (lines.length < 2) return [];

    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const nameIndex = headers.findIndex(h => h === 'name');
    const yearIndex = headers.findIndex(h => h === 'year');
    const ratingIndex = headers.findIndex(h => h === 'rating');
    const rewatchIndex = headers.findIndex(h => h === 'rewatch');

    if (rewatchIndex === -1) return [];

    const rewatched: RewatchData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);
        const isRewatch = values[rewatchIndex]?.trim().toLowerCase() === 'yes';

        if (!isRewatch) continue;

        rewatched.push({
            movieName: nameIndex !== -1 ? values[nameIndex]?.trim().replace(/"/g, '') : '',
            year: yearIndex !== -1 ? values[yearIndex]?.trim().replace(/"/g, '') : '',
            rating: ratingIndex !== -1 ? parseFloat(values[ratingIndex]) || 0 : 0,
        });
    }

    // Return top 2 rewatched movies by rating
    return rewatched
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 2);
}

// Parse watchlist from watchlist.csv - get top 5 oldest entries
function parseWatchlistCSV(content: string): WatchlistData[] {
    const lines = content.split('\n');
    if (lines.length < 2) return [];

    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    const dateIndex = headers.findIndex(h => h === 'date');
    const nameIndex = headers.findIndex(h => h === 'name');
    const yearIndex = headers.findIndex(h => h === 'year');

    const watchlist: WatchlistData[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);
        const movieName = nameIndex !== -1 ? values[nameIndex]?.trim().replace(/"/g, '') : '';
        if (!movieName) continue;

        watchlist.push({
            movieName,
            year: yearIndex !== -1 ? values[yearIndex]?.trim().replace(/"/g, '') : '',
            dateAdded: dateIndex !== -1 ? values[dateIndex]?.trim().replace(/"/g, '') : '',
        });
    }

    // Sort by date (oldest first) and return top 5
    return watchlist
        .sort((a, b) => {
            const dateA = new Date(a.dateAdded);
            const dateB = new Date(b.dateAdded);
            return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 5);
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
    const [error, setError] = useState<string | null>(null);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, []);

    const processFile = async (file: File) => {
        setError(null);

        // Check if it's a ZIP file
        if (file.name.endsWith('.zip')) {
            try {
                const zip = await JSZip.loadAsync(file);
                const files = Object.keys(zip.files);

                // Find diary.csv
                let diaryContent: string | null = null;
                const diaryPath = files.find(f => f.endsWith('diary.csv'));
                if (diaryPath) {
                    diaryContent = await zip.file(diaryPath)!.async('string');
                }

                if (!diaryContent) {
                    setError('diary.csv not found in the ZIP file');
                    return;
                }

                // Find profile.csv for username
                let username: string | undefined;
                const profilePath = files.find(f => f.endsWith('profile.csv'));
                if (profilePath) {
                    const profileContent = await zip.file(profilePath)!.async('string');
                    username = parseProfileCSV(profileContent);
                }

                // Find reviews.csv for user reviews and rewatched
                let reviews: ReviewData[] = [];
                let allReviews: ReviewData[] = [];
                let rewatched: RewatchData[] = [];
                const reviewsPath = files.find(f => f.endsWith('reviews.csv'));
                if (reviewsPath) {
                    const reviewsContent = await zip.file(reviewsPath)!.async('string');
                    const parsedReviews = parseReviewsCSV(reviewsContent);
                    reviews = parsedReviews.top3;
                    allReviews = parsedReviews.all;
                    rewatched = parseRewatchedCSV(reviewsContent);
                }

                // Find watchlist.csv for unwatched movies
                let watchlist: WatchlistData[] = [];
                const watchlistPath = files.find(f => f.endsWith('watchlist.csv'));
                if (watchlistPath) {
                    const watchlistContent = await zip.file(watchlistPath)!.async('string');
                    watchlist = parseWatchlistCSV(watchlistContent);
                }

                onFileSelect({ diaryContent, username, reviews, allReviews, rewatched, watchlist });
            } catch (err) {
                console.error('ZIP extraction error:', err);
                setError('Failed to read ZIP file');
            }
        } else if (file.name.endsWith('.csv')) {
            // Handle CSV directly (no username or reviews available)
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                onFileSelect({ diaryContent: content });
            };
            reader.readAsText(file);
        } else {
            setError('Please upload a ZIP or CSV file');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-md mx-auto w-full flex flex-col gap-8"
        >
            {/* Simple Upload Button */}
            <label className="flex flex-col items-center justify-center cursor-pointer group">
                <div className="w-full py-4 px-8 bg-[#00e054] hover:bg-[#00c94a] rounded-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-[#00e054]/30 group-hover:scale-[1.02]">
                    <Upload className="w-5 h-5 text-[#14181c]" />
                    <span className="text-[#14181c] font-bold text-lg">
                        {isLoading ? 'Processing...' : 'Upload Your Data'}
                    </span>
                </div>
                <p className="text-[#9ab] text-xs mt-3 font-medium">
                    Accepts <span className="text-white">.zip</span> or <span className="text-white">diary.csv</span>
                </p>
                {error && (
                    <p className="text-[#ff8000] text-sm mt-3 font-bold bg-[#ff8000]/10 px-4 py-1.5 rounded-full">{error}</p>
                )}
                <input
                    type="file"
                    className="hidden"
                    accept=".zip,.csv"
                    onChange={handleFileChange}
                    disabled={isLoading}
                />
            </label>

            {/* How to Use Section */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-[#1c2229] border border-[#2c3440] rounded-xl p-6"
            >
                <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                    <span className="w-5 h-5 bg-[#00e054] rounded-full flex items-center justify-center text-[#14181c] text-xs font-bold">?</span>
                    How to get your data
                </h3>
                <ol className="text-[#9ab] space-y-3 text-sm list-decimal list-inside marker:text-[#40bcf4] font-medium">
                    <li>Go to <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer" className="text-[#00e054] hover:underline">letterboxd.com/settings/data</a></li>
                    <li>Click <strong className="text-white">Export Your Data</strong></li>
                    <li>Download the <span className="text-[#00e054]">.zip</span> file</li>
                    <li>Click the button above and select it</li>
                </ol>
            </motion.div>
        </motion.div>
    );
}
