import {  createOpenAI } from '@ai-sdk/openai';
import { generateText, Output } from 'ai';
import z from 'zod/v4';


const openai = createOpenAI({
  // @ts-expect-error todo improve typing in vite. This key shouldn't be here anyway 
  apiKey:  import.meta.env.VITE_OPENAI_API_KEY,
});


const factSchema =  z.object({
  content: z.string().min(1),
  source: z.string().min(1)
})

type Fact = z.infer<typeof factSchema>;

const createFactFinderPrompt = (url: string, brandName?: string) => `Find 5-7 interesting, unusual, or lesser-known facts about the brand ${brandName ? `called ` + brandName : 'that owns this website : ' } (website: ${url}).
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
        - "content": the fact text
        - "source": where this information comes from or context

        Example format: {"facts": [{"content": "fact text", "source": "source info"}, ...]}`

        


export const getBrandFacts = async (
  name: string,
  url: string
): Promise<Fact[]> => {

  console.log('Research started...')
  // Check edge cases
  if (!name && !url) {
    console.error('Invalid input: ', { name, url });
    return [];
  }

  // Validate URL format
  try { 
    new URL(url);
  } catch {
    console.error('Invalid URL: ', { url });
    return [];
  }

  let brandName = name;

  // If no name is provided, try to determine it from the URL
  if(!name && url){
    const { experimental_output } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `given url, scrape the website and return the name of the brand`,
      tools: {
        web_search: openai.tools.webSearch({}),
      },
      experimental_output: Output.object({
        schema: z.object({
          name: z.string()
        })
      })
    });
    brandName = experimental_output.name.trim();
  }

  if(!brandName) console.error('Cannot determine brand name from URL, proceeding with url search only: ', { url });
  

  try {
    // TODO: 
    // 1. add streaming, research progress steps and error states to FE
    // 2. Handle more edge cases (i.e brand and url are two different companies...)
    const { experimental_output } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a helpful assistant that finds interesting, unusual, or lesser-known facts about a brands.`,
      prompt: createFactFinderPrompt(url, brandName),
      tools: {
        web_search: openai.tools.webSearch({}),
      },
      // Force web search tool (optional):
      toolChoice: { type: 'tool', toolName: 'web_search' },
      temperature: 0.7, // allow for some creativity, but not too much
      experimental_output: Output.object({ schema: z.object({ facts: z.array(factSchema)}) })      
    });


    if(!experimental_output.facts.length) {
      console.warn('No facts found in AI response');
      return [];
    }

    return experimental_output.facts

  } catch (error) {
    console.error('Error generating brand facts:', error);
    return [];
  }
}


