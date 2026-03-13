'use server';
/**
 * @fileOverview An AI flow for analyzing the tactical significance of a fire incident.
 *
 * - analyzeIncident - A function that handles the incident analysis.
 * - AnalyzeIncidentInput - The input type for the analyzeIncident function.
 * - AnalyzeIncidentOutput - The return type for the analyzeIncident function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeIncidentInputSchema = z.object({
  incident: z.object({
      lat: z.number(),
      lon: z.number(),
      frp: z.number().optional(),
      time: z.string(),
  }),
  nearbyInfrastructure: z.object({
      powerPlants: z.array(z.string()).describe("Names of power plants within 5km."),
      railways: z.number().describe("Number of railway lines within 5km."),
  }),
});
export type AnalyzeIncidentInput = z.infer<typeof AnalyzeIncidentInputSchema>;

export type AnalyzeIncidentOutput = string;

export async function analyzeIncident(input: AnalyzeIncidentInput): Promise<AnalyzeIncidentOutput> {
  const result = await analysisFlow(input);
  return result;
}

const prompt = ai.definePrompt({
  name: 'analyzeIncidentPrompt',
  input: {schema: AnalyzeIncidentInputSchema},
  output: {format: 'text'},
  prompt: `
  You are SENTINEL, an AI analyst for an OSINT (Open Source Intelligence) dashboard monitoring the conflict in Ukraine.
  Your role is to provide concise, tactical assessments of thermal anomalies (potential fires or explosions) detected by satellites.

  Analyze the following incident report and generate a brief "Intelligence Briefing".

  **Incident Data:**
  - Location: LAT {{incident.lat}}, LON {{incident.lon}}
  - Time Detected: {{incident.time}}
  - Fire Radiative Power (Intensity): {{#if incident.frp}}{{incident.frp}} MW{{else}}Not available{{/if}}

  **Proximity to Critical Infrastructure:**
  {{#if nearbyInfrastructure.powerPlants}}
  - Detected near {{nearbyInfrastructure.powerPlants.length}} power plant(s): {{#each nearbyInfrastructure.powerPlants}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}.
  {{/if}}
  {{#if nearbyInfrastructure.railways}}
  - Detected near {{nearbyInfrastructure.railways}} railway line(s).
  {{/if}}
  {{#unless nearbyInfrastructure.powerPlants}}{{#unless nearbyInfrastructure.railways}}
  - No critical infrastructure detected within the immediate 5km radius.
  {{/unless}}{{/unless}}

  **Your Task:**
  1.  Start with a one-sentence headline summarizing the event's significance (e.g., "Potential Strike on Energy Infrastructure" or "Isolated Anomaly Detected in Field").
  2.  In a short paragraph (2-4 sentences), elaborate on the potential cause and impact.
  3.  Consider the proximity to power plants and railways as a primary factor in your assessment. An incident near infrastructure is of higher significance.
  4.  Maintain a professional, analytical tone. Do not speculate wildly. Base your analysis only on the data provided.

  **Example Output:**
  **Headline:** Possible Strike Near Key Railway Junction
  **Briefing:** A thermal anomaly of moderate intensity was detected in close proximity to a major railway line. This could indicate a targeted strike intended to disrupt logistics and supply routes in the region. The event's timing and location suggest a potential military action, although accidental causes cannot be ruled out without further intelligence.
  `,
});

const analysisFlow = ai.defineFlow(
  {
    name: 'analysisFlow',
    inputSchema: AnalyzeIncidentInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const {text} = await prompt(input);
    return text;
  }
);
