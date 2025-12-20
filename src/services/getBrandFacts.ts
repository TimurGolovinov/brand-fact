import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import z from 'zod/v4';

// Constants
const MODEL_NAME = 'gpt-4o-mini' as const;
const EXTRACTION_MODEL_NAME = 'gpt-4o-mini' as const;
const TEMPERATURE = 0.7;
const MIN_FACTS = 1;
const MAX_FACTS = 7;

// Initialize OpenAI client
// @ts-expect-error - Vite environment variables are typed via vite/client, but TypeScript may not recognize it in all configurations
const apiKey: string | undefined = import.meta.env.VITE_OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('VITE_OPENAI_API_KEY environment variable is required');
}

const openai = createOpenAI({
  apiKey,
});

// Schema definitions
const factSchema = z.object({
  content: z.string().min(1, 'Fact content cannot be empty'),
  source: z.string().min(1, 'Fact source cannot be empty'),
});

const brandNameSchema = z.object({
  name: z.string().min(1, 'Brand name cannot be empty'),
});

const factsResponseSchema = z.object({
  facts: z.array(factSchema),
});

// Type exports
export type Fact = z.infer<typeof factSchema>;

export class BrandFactsError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_INPUT' | 'INVALID_URL' | 'API_ERROR' | 'NO_FACTS_FOUND' | 'BRAND_NAME_EXTRACTION_FAILED',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'BrandFactsError';
  }
}

// Helper functions
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const createFactFinderPrompt = (url: string, brandName?: string): string => {
  const brandIdentifier = brandName 
    ? `called "${brandName}"` 
    : 'that owns this website';
  
  return `Find ${MIN_FACTS}-${MAX_FACTS} interesting, unusual, or lesser-known facts about the brand ${brandIdentifier} (website: ${url}).

Focus on:
- Unique history or origin stories
- Unusual business practices or innovations
- Interesting company culture or values
- Notable achievements or milestones
- Surprising partnerships or collaborations
- Fun facts that most people don't know

For each fact, provide:
1. The fact itself (be specific and factual)
2. A source or context (e.g., "According to company history", "Industry reports", "Public records", etc.)

Return your response as a JSON object with a "facts" array. Each item in the array should have:
- "content": the fact text (do not include links here)
- "source": website link

Example format: {"facts": [{"content": "fact text", "source": "https://google.com..."}, ...]}`;
};

const extractBrandNameFromUrl = async (url: string): Promise<string> => {
  try {
    const { experimental_output } = await generateText({
      model: openai(EXTRACTION_MODEL_NAME),
      prompt: `Given the URL "${url}", determine the name of the brand or company that owns this website. Return only the brand name.`,
      tools: {
        web_search: openai.tools.webSearch({}),
      },
      experimental_output: Output.object({
        schema: brandNameSchema,
      }),
    });

    const validated = brandNameSchema.parse(experimental_output);
    return validated.name.trim();
  } catch (error) {
    throw new BrandFactsError(
      'Failed to extract brand name from URL',
      'BRAND_NAME_EXTRACTION_FAILED',
      error
    );
  }
};

const generateBrandFacts = async (
  url: string,
  brandName?: string
): Promise<Fact[]> => {
  try {
    const { experimental_output } = await generateText({
      model: openai(MODEL_NAME),
      system: 'You are a helpful assistant that finds interesting, unusual, or lesser-known facts about brands. Always verify information through web search before presenting facts.',
      prompt: createFactFinderPrompt(url, brandName),
      tools: {
        web_search: openai.tools.webSearch({}),
      },
      toolChoice: { type: 'tool', toolName: 'web_search' },
      temperature: TEMPERATURE,
      experimental_output: Output.object({
        schema: factsResponseSchema,
      }),
    });

    const validated = factsResponseSchema.parse(experimental_output);

    if (!validated.facts.length) {
      throw new BrandFactsError(
        'No facts were generated. The AI model did not return any facts.',
        'NO_FACTS_FOUND'
      );
    }

    return validated.facts;
  } catch (error) {
    if (error instanceof BrandFactsError) {
      throw error;
    }
    throw new BrandFactsError(
      'Failed to generate brand facts from AI model',
      'API_ERROR',
      error
    );
  }
};

/**
 * Retrieves interesting facts about a brand based on the brand name and/or URL.
 * 
 * @param name - Optional brand name. If not provided, will attempt to extract from URL.
 * @param url - The website URL of the brand (required).
 * @returns Promise resolving to an array of facts about the brand.
 * @throws {BrandFactsError} If input validation fails, URL is invalid, or API calls fail.
 * 
 * @example
 * ```ts
 * const facts = await getBrandFacts('Apple', 'https://apple.com');
 * // or
 * const facts = await getBrandFacts(undefined, 'https://apple.com');
 * ```
 */
export const getBrandFacts = async (
  name: string | undefined,
  url: string
): Promise<Fact[]> => {
  // Validate inputs
  const trimmedName = name?.trim() || undefined;
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    throw new BrandFactsError(
      'URL is required and cannot be empty',
      'INVALID_INPUT'
    );
  }

  if (!isValidUrl(trimmedUrl)) {
    throw new BrandFactsError(
      `Invalid URL format: "${trimmedUrl}". URL must be a valid HTTP or HTTPS URL.`,
      'INVALID_URL'
    );
  }

  // Extract brand name if not provided
  let brandName = trimmedName;
  if (!brandName) {
    try {
      brandName = await extractBrandNameFromUrl(trimmedUrl);
    } catch (error) {
      // Log warning but continue with URL-only search
      console.warn(
        `Could not determine brand name from URL "${trimmedUrl}". Proceeding with URL-only search.`,
        error
      );
      // Continue without brand name - the prompt will handle this case
    }
  }

  // Generate facts
  return generateBrandFacts(trimmedUrl, brandName);
};


