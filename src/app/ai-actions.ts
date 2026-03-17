'use server';

import { askAnalyst as askAnalystFlow, getExecutiveBriefing as getBriefingFlow } from "@/ai/flows/analyst-flow";

export async function askAnalyst(prompt: string): Promise<string> {
    // Basic input validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return "Invalid question. Please provide a valid question.";
    }
    try {
        const response = await askAnalystFlow(prompt);
        return response;
    } catch (error) {
        console.error("Error calling analyst flow:", error);
        return "Sorry, I encountered an error while processing your request. Please try again later.";
    }
}

export async function getExecutiveBriefing(): Promise<string> {
     try {
        const response = await getBriefingFlow();
        return response;
    } catch (error) {
        console.error("Error calling briefing flow:", error);
        return "Sorry, I encountered an error while generating the briefing. Please try again later.";
    }
}
