'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload, FileUploadResult, ReviewData, RewatchData, WatchlistData } from '@/components/FileUpload';
import { FilmCountdown, CurtainsOpening } from '@/components/animations';
import { GenreDonutChart, assignGenreColors } from '@/components/GenreDonutChart';
import { MusicToggleButton } from '@/components/MusicToggleButton';
import CountUp from '@/components/CountUp';
import BlurText from '@/components/BlurText';
import TiltedCard from '@/components/TiltedCard';
import Particles from '@/components/Particles';
import SparklesText from '@/components/SparklesText';
import AuroraText from '@/components/AuroraText';
import GradientText from '@/components/GradientText';
import {
  parseCSV,
  detectTargetYear,
  filterByYear,
  calculateStats,
  calculateDistribution,
  getHighlyRatedFilms,
  classifyArchetype,
} from '@/lib/analytics';
import { DiaryEntry, MovieStats, Archetype, HighlyRatedFilm, ViewingDistribution, GenreCount } from '@/lib/types';

interface TMDBResult {
  name: string;
  posterUrl: string | null;
  genres: string[];
}

interface WrappedData {
  entries: DiaryEntry[];
  year: number;
  stats: MovieStats;
  distribution: ViewingDistribution;
  archetype: Archetype;
  highlyRated: HighlyRatedFilm[];
  topMoviesWithPosters: { name: string; rating: number; year: number | string; posterUrl: string | null }[];
  genreDistribution: GenreCount[];
  username?: string;
  reviews?: ReviewData[];
  rewatched?: RewatchData[];
  watchlist?: WatchlistData[];
  reviewPersona?: ReviewPersona;
}

interface ReviewPersona {
  title: string;
  summary: string;
  signals: string[];
}

type Phase = 'upload' | 'countdown' | 'loading' | 'curtains' | 'stories';

// Preload images before showing stories
async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Resolve anyway to not block
      img.src = url;
    });
  });
  await Promise.all(promises);
}

export default function Home() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('upload');
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleFileSelect = async ({ diaryContent, username, reviews, allReviews, rewatched, watchlist }: FileUploadResult) => {
    setIsLoading(true);
    setError(null);

    try {
      const entries = parseCSV(diaryContent);
      if (entries.length === 0) throw new Error('No entries found');

      const year = detectTargetYear(entries);
      const filtered = filterByYear(entries, year);
      if (filtered.length < 5) throw new Error(`Only ${filtered.length} films found for ${year}`);

      const stats = calculateStats(filtered);
      const distribution = calculateDistribution(filtered);
      const archetype = classifyArchetype(filtered, stats);
      const highlyRated = getHighlyRatedFilms(filtered, 4.0).slice(0, 4);

      // Fetch TMDB data for top rated movies and genres
      const { topMoviesWithPosters, genreDistribution } = await fetchTMDBData(filtered, highlyRated, stats.totalFilms);

      // Analyze reviews with Gemini AI (if reviews exist)
      let reviewPersona: ReviewPersona | undefined;
      if (allReviews && allReviews.length > 0) {
        try {
          console.log('Analyzing reviews with Gemini...', allReviews.length, 'reviews');
          const response = await fetch('/api/analyze-reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reviews: allReviews }),
          });
          console.log('Gemini response status:', response.status);
          const data = await response.json();
          console.log('Gemini response data:', data);
          if (response.ok && data.persona) {
            reviewPersona = data.persona;
            console.log('Review persona set:', reviewPersona);
          } else {
            console.error('Gemini API error:', data.error || 'No persona in response');
          }
        } catch (e) {
          console.error('Failed to analyze reviews:', e);
        }
      }

      setData({
        entries: filtered,
        year,
        stats,
        distribution,
        archetype,
        highlyRated,
        topMoviesWithPosters,
        genreDistribution,
        username,
        reviews,
        rewatched,
        watchlist,
        reviewPersona,
      });
      setPhase('countdown');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToUpload = () => {
    setData(null);
    setPhase('upload');
    setSlideIndex(0);
    setProgress(0);
  };

  // Build slides data
  const slides = data ? buildSlides(data) : [];
  const totalSlides = slides.length;

  // Preload images during countdown phase
  useEffect(() => {
    if (phase === 'countdown' && data?.topMoviesWithPosters) {
      const imageUrls = data.topMoviesWithPosters
        .filter(m => m.posterUrl)
        .map(m => m.posterUrl as string);

      preloadImages(imageUrls).then(() => {
        // Images preloaded, ready for next phase
      });
    }
  }, [phase, data]);

  // Auto-advance
  useEffect(() => {
    if (phase !== 'stories' || isPaused) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (slideIndex < totalSlides - 1) {
            setSlideIndex(i => i + 1);
            return 0;
          }
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase, slideIndex, totalSlides, isPaused]);

  // Reset progress on slide change
  useEffect(() => {
    setProgress(0);
  }, [slideIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && slideIndex < totalSlides - 1) {
        setSlideIndex(i => i + 1);
      }
      if (e.key === 'ArrowLeft' && slideIndex > 0) {
        setSlideIndex(i => i - 1);
      }
      if (e.key === 'Escape') resetToUpload();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slideIndex, totalSlides]);

  // Upload Screen
  if (phase === 'upload') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-black">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-white mb-4 text-center"
        >
          Letterboxd Wrapped
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/50 mb-8 text-center"
        >
          Your year in cinema, beautifully visualized
        </motion.p>
        <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
        {error && <p className="text-red-400 mt-6 text-sm">{error}</p>}
      </main>
    );
  }

  // Countdown
  if (phase === 'countdown') {
    return <FilmCountdown onComplete={() => setPhase('curtains')} duration={2400} />;
  }

  // Curtains
  if (phase === 'curtains') {
    return (
      <>
        <CurtainsOpening onComplete={() => setPhase('stories')} duration={1500} />
        <div className="fixed inset-0 bg-black" />
      </>
    );
  }

  // FULLSCREEN STORIES
  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Particles Background */}
      <Particles
        className="absolute inset-0 z-0"
        quantity={80}
        ease={80}
        color="#ffffff"
        refresh
      />

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-4">
        {slides.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full bg-white/20">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: i < slideIndex ? '100%' : i === slideIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <MusicToggleButton
          audioSrc="https://res.cloudinary.com/dainr14h7/video/upload/v1767433797/Bryce_Dessner_-_The_Great_Mystery_kfyuup.flac"
          autoPlay={true}
        />
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-white/50 hover:text-white text-xl transition-colors"
          title={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
        <button
          onClick={resetToUpload}
          className="text-white/50 hover:text-white text-2xl transition-colors"
          title="Close"
        >
          ✕
        </button>
      </div>

      {/* Slide content - FULLSCREEN */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slideIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center px-8"
        >
          {slides[slideIndex]}
        </motion.div>
      </AnimatePresence>

      {/* Click navigation */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
        onClick={() => slideIndex > 0 && setSlideIndex(i => i - 1)}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer"
        onClick={() => slideIndex < totalSlides - 1 && setSlideIndex(i => i + 1)}
      />

      {/* Letterboxd branding */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 opacity-40">
        <div className="flex gap-0.5">
          <div className="w-2 h-2 rounded-full bg-[#00E054]" />
          <div className="w-2 h-2 rounded-full bg-[#40BCF4]" />
          <div className="w-2 h-2 rounded-full bg-[#FF8000]" />
        </div>
        <span className="text-white text-xs font-medium tracking-wide">letterboxd</span>
      </div>
    </div>
  );
}

// Fetch data from TMDB
async function fetchTMDBData(
  entries: DiaryEntry[],
  highlyRated: HighlyRatedFilm[],
  totalFilms: number
): Promise<{
  topMoviesWithPosters: { name: string; rating: number; year: number | string; posterUrl: string | null }[];
  genreDistribution: GenreCount[];
}> {
  try {
    // Fetch for top rated movies + a sample of other movies for genre data
    const moviesToFetch = [
      ...highlyRated.slice(0, 4).map(m => ({ name: m.name, year: m.year })),
      // Sample up to 16 more movies for better genre coverage
      ...entries
        .filter(e => !highlyRated.some(h => h.name === e.Name))
        .slice(0, 16)
        .map(e => ({ name: e.Name, year: e.Year })),
    ];

    const response = await fetch('/api/tmdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movies: moviesToFetch }),
    });

    if (!response.ok) {
      throw new Error('TMDB fetch failed');
    }

    const { results }: { results: TMDBResult[] } = await response.json();

    // Extract top movies with posters
    const topMoviesWithPosters = highlyRated.slice(0, 4).map(movie => {
      const tmdbResult = results.find(r => r.name === movie.name);
      return {
        ...movie,
        posterUrl: tmdbResult?.posterUrl || null,
      };
    });

    // Aggregate genres
    const genreCounts: Record<string, number> = {};
    results.forEach(result => {
      result.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    // Sort and get top 5
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre, count]) => ({ genre, count }));

    const genreDistribution = assignGenreColors(sortedGenres, totalFilms);

    return { topMoviesWithPosters, genreDistribution };
  } catch (error) {
    console.error('TMDB fetch error:', error);
    // Return empty data on error
    return {
      topMoviesWithPosters: highlyRated.slice(0, 4).map(m => ({ ...m, posterUrl: null })),
      genreDistribution: [],
    };
  }
}

// Build slide components from data
function buildSlides(data: WrappedData): React.ReactNode[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyData = dayNames.map(day => ({
    day,
    count: data.distribution.weekly?.[day] || 0,
  }));
  const maxDay = weeklyData.reduce((max, d) => d.count > max.count ? d : max, weeklyData[0]);
  const favoriteDayFull: Record<string, string> = {
    Sun: 'Sundays', Mon: 'Mondays', Tue: 'Tuesdays', Wed: 'Wednesdays',
    Thu: 'Thursdays', Fri: 'Fridays', Sat: 'Saturdays',
  };

  return [
    // 1. Title - Dramatic entrance with BlurText
    <div key="title" className="text-center flex flex-col items-center justify-center">
      {data.username && (
        <BlurText
          text={`${data.username}'s`}
          delay={100}
          animateBy="letters"
          direction="top"
          className="text-white/70 text-xl md:text-2xl font-medium mb-2"
        />
      )}
      <BlurText
        text="Year in Cinema"
        delay={80}
        animateBy="letters"
        direction="top"
        className="text-white/50 text-lg tracking-widest uppercase mb-4"
      />
      <motion.h1
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.6, type: "spring", stiffness: 100 }}
        className="text-8xl md:text-9xl font-bold text-white"
      >
        {data.year}
      </motion.h1>
    </div>,

    // 2. Total Films - Count up effect
    <div key="films" className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-white/50 text-xl mb-6 tracking-wide"
      >
        YOU WATCHED
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2, type: "spring", stiffness: 80 }}
        className="text-9xl md:text-[12rem] font-bold mb-4"
      >
        <GradientText
          colors={["#40ffaa", "#4079ff", "#40ffaa", "#4079ff", "#40ffaa"]}
          animationSpeed={3}
          showBorder={false}
        >
          <CountUp
            from={0}
            to={data.stats.totalFilms}
            duration={0.8}
            delay={0.1}
          />
        </GradientText>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-white/40 text-xl"
      >
        films this year
      </motion.p>
    </div>,

    // 3. Hours - Staggered reveal
    <div key="hours" className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-white/50 text-xl mb-6 tracking-wide"
      >
        THAT'S
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
        className="text-8xl md:text-9xl font-bold mb-2"
      >
        <GradientText
          colors={["#ff6b6b", "#feca57", "#ff6b6b", "#feca57", "#ff6b6b"]}
          animationSpeed={4}
          showBorder={false}
        >
          <CountUp
            from={0}
            to={data.stats.totalHours}
            duration={0.8}
            delay={0.1}
          />
        </GradientText>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="text-white text-4xl mb-8"
      >
        hours
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="text-white/40 text-lg"
      >
        spent in the dark
      </motion.p>
    </div>,

    // 4. Top 4 Movies with Posters - TiltedCard animation
    ...(data.topMoviesWithPosters?.length > 0 ? [
      <div key="top-movies" className="text-center flex flex-col items-center px-4">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-white/50 text-lg tracking-widest uppercase mb-6"
        >
          YOUR TOP RATED
        </motion.p>
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {data.topMoviesWithPosters.map((movie, index) => (
            <motion.div
              key={movie.name}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.15 + index * 0.1,
                type: "spring",
                stiffness: 120
              }}
              className="flex flex-col items-center"
            >
              <TiltedCard
                imageSrc={movie.posterUrl || undefined}
                altText={movie.name}
                captionText={`${movie.name} (${movie.year})`}
                containerHeight="270px"
                containerWidth="180px"
                imageHeight="270px"
                imageWidth="180px"
                rotateAmplitude={10}
                scaleOnHover={1.08}
                showMobileWarning={false}
                showTooltip={true}
                displayOverlayContent={false}
              />
            </motion.div>
          ))}
        </div>
      </div>
    ] : []),
    // 5. Genre Distribution Donut Chart
    ...(data.genreDistribution?.length > 0 ? [
      <div key="genre" className="text-center">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-white/50 text-lg tracking-widest uppercase mb-8"
        >
          YOUR GENRES
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GenreDonutChart
            genres={data.genreDistribution}
            topGenre={data.genreDistribution[0]}
          />
        </motion.div>
      </div>
    ] : []),

    // 6. Favorite Day - with animated bar chart
    <div key="day" className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-white/50 text-lg tracking-widest uppercase mb-4"
      >
        YOUR FAVORITE DAY?
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
        className="text-6xl md:text-7xl font-serif italic mb-16"
      >
        <AuroraText>{favoriteDayFull[maxDay.day]}.</AuroraText>
      </motion.h2>
      <div className="flex items-end justify-center gap-4 h-32 mb-8">
        {weeklyData.map((item, index) => {
          const maxCount = Math.max(...weeklyData.map(d => d.count));
          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const isTop = item.day === maxDay.day;
          return (
            <motion.div
              key={item.day}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.08 }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(height, 8)}%` }}
                transition={{ duration: 0.8, delay: 0.4 + index * 0.08, ease: "easeOut" }}
                className="w-10 md:w-14 rounded-md"
                style={{
                  background: isTop ? 'white' : 'rgba(255,255,255,0.3)',
                  boxShadow: isTop ? '0 0 30px rgba(255,255,255,0.5)' : 'none',
                  minHeight: '8px',
                }}
              />
              <span className="text-white/50 text-sm mt-2">{item.day}</span>
            </motion.div>
          );
        })}
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-white/40 text-lg"
      >
        You watch most on {favoriteDayFull[maxDay.day]}
      </motion.p>
    </div>,

    // 7. Average Rating - Star animation with top 5 movies
    <div key="rating" className="text-center flex flex-col items-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-white/50 text-lg tracking-widest uppercase mb-4"
      >
        YOUR RATING STYLE
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
        className="text-5xl md:text-6xl font-serif italic mb-4 capitalize"
      >
        <GradientText
          colors={["#a855f7", "#ec4899", "#a855f7", "#ec4899", "#a855f7"]}
          animationSpeed={5}
          showBorder={false}
        >
          {data.stats.avgRating >= 4 ? 'Generous' : data.stats.avgRating <= 2.5 ? 'Harsh' : 'Balanced'}.
        </GradientText>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
        className="text-3xl text-white mb-2"
      >
        {data.stats.avgRating.toFixed(1)} ★
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/40 text-sm mb-6"
      >
        average rating
      </motion.p>

      {/* Top 5 rated movies list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm"
      >
        <p className="text-white/50 text-xs uppercase tracking-wider mb-3">Your Highest Rated</p>
        <div className="space-y-2">
          {data.highlyRated.slice(0, 5).map((movie, index) => (
            <motion.div
              key={movie.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.08 }}
              className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
            >
              <span className="text-white text-lg font-semibold truncate flex-1">{movie.name}</span>
              <span className="text-white/60 text-base font-medium ml-3">{movie.rating}★</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>,

    // 8. Personality - Emoji bounce
    <div key="personality" className="text-center flex flex-col items-center justify-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="text-white/50 text-lg tracking-widest uppercase mb-4"
      >
        You are
      </motion.p>
      <motion.div
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
        className="text-8xl md:text-9xl mb-6"
      >
        {data.archetype.emoji}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-white mb-4"
      >
        {data.archetype.name}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-white/50 text-lg italic max-w-sm px-4"
      >
        "{data.archetype.tagline}"
      </motion.p>
    </div>,

    // 9. Review Persona slide - AI-generated persona from reviews
    ...(data.reviewPersona ? [
      <div key="review-persona" className="text-center flex flex-col items-center px-6 max-w-lg">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-white/50 text-lg tracking-widest uppercase mb-4"
        >
          YOUR REVIEW PERSONA
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
          className="text-3xl md:text-4xl font-bold mb-6"
        >
          <GradientText
            colors={["#60a5fa", "#a855f7", "#ec4899", "#60a5fa"]}
            animationSpeed={4}
            showBorder={false}
          >
            {data.reviewPersona.title}
          </GradientText>
        </motion.h2>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-4"
        >
          {data.reviewPersona.signals.map((signal, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.6 + index * 0.8, // Slow staggered entrance
                type: "spring",
                stiffness: 100
              }}
              className="flex items-center gap-3 bg-white/5 rounded-xl px-5 py-3 border border-white/5"
            >
              <span className="text-amber-400 text-xl font-bold">•</span>
              <span className="text-white/90 text-sm font-medium text-left leading-relaxed">{signal}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    ] : data.reviews && data.reviews.length > 0 ? [
      // Fallback to regular reviews if persona not available
      <div key="reviews" className="text-center flex flex-col items-center px-6 max-w-xl">
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-white/50 text-lg tracking-widest uppercase mb-6"
        >
          YOUR REVIEWS
        </motion.p>
        <div className="space-y-4 w-full">
          {data.reviews.map((review, index) => (
            <motion.div
              key={review.movieName}
              initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.15 }}
              className="bg-white/5 rounded-xl p-4 text-left border border-white/10"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-semibold text-sm">{review.movieName} <span className="text-white/40">({review.year})</span></p>
                <span className="text-white/60 text-sm font-bold">{review.rating}★</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed line-clamp-3">
                "{review.review.length > 150 ? review.review.slice(0, 150) + '...' : review.review}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    ] : []),

    // 10. Watchlist - Movies to watch
    ...(data.watchlist && data.watchlist.length > 0 ? [
      <div key="watchlist" className="text-center flex flex-col items-center px-6">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-white/50 text-xl tracking-widest uppercase mb-2"
        >
          STILL WAITING
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, type: "spring" }}
          className="text-5xl md:text-6xl font-bold mb-2"
        >
          <GradientText
            colors={["#f472b6", "#818cf8", "#f472b6", "#818cf8", "#f472b6"]}
            animationSpeed={4}
            showBorder={false}
          >
            {data.watchlist.length}
          </GradientText>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-lg mb-8"
        >
          movies on your watchlist
        </motion.p>
        <div className="space-y-3 w-full max-w-sm">
          {data.watchlist.map((movie, index) => (
            <motion.div
              key={movie.movieName}
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.4 + index * 0.12,
                type: "spring",
                stiffness: 100
              }}
              whileHover={{ scale: 1.02, x: 5 }}
              className="bg-white/5 rounded-xl px-5 py-4 border border-white/10 flex items-center gap-4 cursor-default"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.12, type: "spring" }}
                className="text-amber-400 text-2xl font-bold w-8"
              >
                {index + 1}
              </motion.span>
              <div className="text-left flex-1">
                <p className="text-white text-base font-semibold">{movie.movieName}</p>
                <p className="text-white/40 text-sm">{movie.year}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    ] : []),

    // 11. Outro - Fade in sequence with SparklesText
    <div key="outro" className="text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-white/40 text-xl mb-8"
      >
        That's a wrap on {data.year}.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, type: "spring" }}
        className="mb-8"
      >
        <SparklesText className="text-5xl md:text-6xl font-bold text-white">
          See you in {data.year + 1}
        </SparklesText>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/30 text-sm"
      >
        Made with Letterboxd Wrapped
      </motion.p>
    </div>,
  ];
}

