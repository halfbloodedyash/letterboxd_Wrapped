import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface ReviewInput {
    movieName: string;
    year: string;
    rating: number;
    review: string;
}

interface ReviewPersona {
    title: string;
    summary: string;
    signals: string[];
}

const SYSTEM_PROMPT = `You are an expert cinema psychologist, literary critic, and language analyst.

Your task is to analyze a user's written movie reviews and infer their Review Persona — a concise but deeply insightful profile that captures how they think, feel, and express themselves about cinema.

You are not summarizing the reviews.
You are extracting the personality, values, and critical philosophy behind the writing.

CORE OBJECTIVE
Derive a human-readable Review Persona that feels:
- Personally accurate
- Emotionally resonant
- Introspective, not statistical
- Written like a mirror, not a report

ANALYSIS DIMENSIONS
Analyze these dimensions:
1. Writing Style (descriptive vs analytical, emotional vs technical, etc.)
2. Critical Priorities (what they value: cinematography, emotion, craft, etc.)
3. Emotional Orientation (emotional vs intellectual engagement)
4. Rating Philosophy (strict vs generous, consistency)
5. Review Triggers (why they write: impact, excellence, sincerity)
6. Underlying Cinema Values (honesty over perfection, craft over spectacle, etc.)
7. Voice & Identity (rhythm, vocabulary, presence of humility/curiosity)

OUTPUT FORMAT (STRICT JSON)
Return ONLY valid JSON in this exact format:
{
  "title": "2-4 word evocative persona title (e.g., 'The Reflective Observer')",
  "summary": "20-30 word tagline speaking directly to user ('You...'), capturing their essence as a film viewer. One to two sentences maximum. Punchy and memorable.",
  "signals": ["3-5 observable patterns from reviews, e.g., 'Frequently praises visual craft'", "second signal", "third signal"]
}

CONSTRAINTS
- Do NOT quote reviews directly
- Do NOT mention star ratings
- Do NOT sound like a marketing blurb
- Be personal, distinct, and earned from the writing itself
- If the output could apply to any user, it is a failure

Reviews are emotional artifacts. Treat them with care and respect.`;

export async function POST(request: NextRequest) {
    try {
        const { reviews } = await request.json() as { reviews: ReviewInput[] };

        if (!reviews || reviews.length === 0) {
            return NextResponse.json({ error: 'No reviews provided' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
        }

        // Format reviews for the prompt
        const reviewsText = reviews
            .filter(r => r.review && r.review.length > 10)
            .map(r => `Film: ${r.movieName} (${r.year}) - Rating: ${r.rating}/5\nReview: "${r.review}"`)
            .join('\n\n');

        if (!reviewsText) {
            return NextResponse.json({ error: 'No valid reviews to analyze' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `${SYSTEM_PROMPT}

USER'S MOVIE REVIEWS:
${reviewsText}

Analyze these reviews and return the Review Persona as JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        let persona: ReviewPersona;
        try {
            // Extract JSON from the response (handle markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            persona = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', text);
            // Fallback persona
            persona = {
                title: 'The Cinema Enthusiast',
                summary: 'You approach films with genuine curiosity and openness, letting each story unfold on its own terms. Your reviews reveal someone who values the emotional journey as much as the technical craft, finding meaning in moments that others might overlook. There\'s an authenticity in how you engage with cinema—honest reactions, thoughtful reflections, and a clear appreciation for filmmakers who dare to be different.',
                signals: [
                    'Values emotional authenticity in performances',
                    'Appreciates visual storytelling and cinematography',
                    'Responds strongly to directorial vision'
                ]
            };
        }

        return NextResponse.json({ persona });
    } catch (error) {
        console.error('Review analysis error:', error);
        return NextResponse.json({ error: 'Failed to analyze reviews' }, { status: 500 });
    }
}
