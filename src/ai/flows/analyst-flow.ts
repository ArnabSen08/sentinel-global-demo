'use server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as firestoreTools from '@/ai/tools/firestore-tools';

// Tool to get recent fire incidents
const getFiresTool = ai.defineTool(
    {
        name: 'getFires',
        description: 'Get the most recent fire and thermal anomaly incidents from around the world.',
        inputSchema: z.object({
            limit: z.number().optional().default(10).describe('The number of incidents to return.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => await firestoreTools.getFires(input.limit)
);

// Tool to get recent earthquakes
const getEarthquakesTool = ai.defineTool(
    {
        name: 'getEarthquakes',
        description: 'Get the most recent earthquake events.',
        inputSchema: z.object({
            minMagnitude: z.number().optional().default(1.0).describe('The minimum magnitude to filter by.'),
            limit: z.number().optional().default(10).describe('The number of events to return.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => await firestoreTools.getEarthquakes(input.minMagnitude, input.limit)
);

// Tool to get recent news articles
const getNewsTool = ai.defineTool(
    {
        name: 'getNews',
        description: 'Get the most recent global news articles.',
        inputSchema: z.object({
            limit: z.number().optional().default(10).describe('The number of articles to return.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => await firestoreTools.getNews(input.limit)
);

// Tool to get active ship positions
const getShipsTool = ai.defineTool(
    {
        name: 'getShips',
        description: 'Get a list of most recently updated active ship positions.',
        inputSchema: z.object({
            limit: z.number().optional().default(20).describe('The number of ships to return.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => await firestoreTools.getShips(input.limit)
);

// Tool to get active flight data
const getFlightsTool = ai.defineTool(
    {
        name: 'getFlights',
        description: 'Get a list of most recently updated active flight positions and data.',
        inputSchema: z.object({
            limit: z.number().optional().default(20).describe('The number of flights to return.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => await firestoreTools.getFlights(input.limit)
);

// Tool to get stock market data
const getStocksTool = ai.defineTool(
    {
        name: 'getStocks',
        description: 'Get the most recent stock market index and price updates.',
        inputSchema: z.object({
            limit: z.number().optional().default(10).describe('The number of stock updates to return.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => await firestoreTools.getStocks(input.limit)
);


// Define the main analyst flow
const analystFlow = ai.defineFlow(
    {
        name: 'analystFlow',
        inputSchema: z.string().describe('The user\'s question for the AI analyst.'),
        outputSchema: z.string().describe('The AI analyst\'s response.'),
    },
    async (prompt) => {
        const llmResponse = await ai.generate({
            prompt: prompt,
            model: 'openai/meta/llama-3.1-70b-instruct',
            tools: [getFiresTool, getEarthquakesTool, getNewsTool, getShipsTool, getFlightsTool, getStocksTool],
            config: {
                // Lower temperature for more factual, less creative responses
                temperature: 0.2,
            },
            system: `You are an expert AI analyst for the Sentinel Global dashboard, a real-time mission control center.
Your role is to answer questions by using the provided tools to query the live data streams for fires, earthquakes, news, ship positions, flights, and stock market information.
Be concise and factual in your responses.
Provide clear, data-driven answers.
If the user asks a general question like "what's happening?", use the tools to get a summary of recent events across different categories (fires, quakes, news) and provide an executive briefing.
Analyze the data returned by the tools to form your answer. Do not just list the raw data. Synthesize it.
When referencing data, mention how recent it is based on the timestamp. Current time is ${new Date().toISOString()}.
Format your response using markdown for readability.
If you can't answer the question with the available tools, state that clearly.`
        });
        
        return llmResponse.text;
    }
);

// Define the Executive Briefing Flow
const executiveBriefingFlow = ai.defineFlow(
    {
        name: 'executiveBriefingFlow',
        inputSchema: z.void(),
        outputSchema: z.string().describe('The executive briefing.'),
    },
    async () => {
        const prompt = "Provide a concise executive briefing of the most significant global events in the last few hours. Summarize major fires, earthquakes (over 4.5 magnitude), top 3 breaking news stories, and the performance of major stock indices.";
         const llmResponse = await ai.generate({
            prompt: prompt,
            model: 'openai/meta/llama-3.1-70b-instruct',
            tools: [getFiresTool, getEarthquakesTool, getNewsTool, getStocksTool],
             config: {
                temperature: 0.3,
            },
            system: `You are an expert AI analyst for the Sentinel Global dashboard.
Your role is to generate an "Executive Briefing" by using the provided tools to query live data streams.
Synthesize the information into a concise, high-level summary suitable for a quick overview.
Focus on the most significant events.
Format your response using markdown with clear headings for each section (e.g., ## Seismic Activity, ## Market Snapshot).
Current time is ${new Date().toISOString()}.`
        });
        
        return llmResponse.text;
    }
);


// Wrapper function for the client to call
export async function askAnalyst(prompt: string): Promise<string> {
    return await analystFlow(prompt);
}

export async function getExecutiveBriefing(): Promise<string> {
    return await executiveBriefingFlow();
}
