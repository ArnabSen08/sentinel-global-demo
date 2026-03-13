"use server";

import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Incident } from "@/types";

// Bounding box for Ukraine
const UKRAINE_BOUNDS = {
  lat: { min: 44.3, max: 52.4 },
  lon: { min: 22.1, max: 40.2 },
};

/**
 * Generates 10 random mock incidents within Ukraine's borders and saves them to Firestore.
 * This is useful for initial testing and development.
 */
export async function generateMockData() {
  try {
    const batch = adminDb.batch();
    const incidentsCollection = adminDb.collection("incidents");

    for (let i = 0; i < 10; i++) {
      const lat =
        Math.random() * (UKRAINE_BOUNDS.lat.max - UKRAINE_BOUNDS.lat.min) +
        UKRAINE_BOUNDS.lat.min;
      const lon =
        Math.random() * (UKRAINE_BOUNDS.lon.max - UKRAINE_BOUNDS.lon.min) +
        UKRAINE_BOUNDS.lon.min;

      const newIncident: Omit<Incident, 'id'> = {
        latitude: lat,
        longitude: lon,
        timestamp: Timestamp.now(),
        confidence: 'high',
        brightness: 300 + Math.random() * 50,
      };
      
      const docRef = incidentsCollection.doc();
      batch.set(docRef, newIncident);
    }

    await batch.commit();
    return { success: true, message: "Successfully generated 10 mock incidents." };
  } catch (error) {
    console.error("Error generating mock data:", error);
    return { success: false, message: "Failed to generate mock data." };
  }
}

/**
 * Fetches real-time fire and thermal anomaly data from NASA's FIRMS API for Ukraine
 * and stores it in the 'incidents' Firestore collection.
 * 
 * NOTE: To run this automatically every 30 minutes in production, you would set up
 * a scheduler (e.g., Google Cloud Scheduler) to call an API route that triggers this action.
 */
export async function fetchAndStoreFirmsData() {
  const apiKey = process.env.NASA_FIRMS_API_KEY;
  if (!apiKey) {
    const message = "NASA FIRMS API key is not configured.";
    console.error(message);
    return { success: false, message };
  }

  // API fetches data for Ukraine for the last 24 hours.
  // See FIRMS API docs: https://firms.modaps.eosdis.nasa.gov/api/
  const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${apiKey}/VIIRS_SNPP_NRT/UKR/1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FIRMS API request failed with status: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");
    const headers = lines[0].split(",");

    if (lines.length < 2) {
      return { success: true, message: "No new FIRMS incidents found." };
    }
    
    // Remove header line
    lines.shift(); 

    const batch = adminDb.batch();
    const incidentsCollection = adminDb.collection("incidents");
    let newIncidentsCount = 0;

    for (const line of lines) {
        if (!line) continue;
        const values = line.split(",");
        const data: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            data[header] = values[index];
        });

        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        const acq_date = data.acq_date;
        const acq_time = data.acq_time.padStart(4, '0'); // Ensure HHMM format

        if (isNaN(latitude) || isNaN(longitude)) continue;

        const year = parseInt(acq_date.substring(0, 4));
        const month = parseInt(acq_date.substring(5, 7)) - 1; // JS months are 0-indexed
        const day = parseInt(acq_date.substring(8, 10));
        const hour = parseInt(acq_time.substring(0, 2));
        const minute = parseInt(acq_time.substring(2, 4));
        const timestamp = Timestamp.fromDate(new Date(Date.UTC(year, month, day, hour, minute)));

        // Create a unique ID to prevent duplicates
        const docId = `${acq_date}-${acq_time}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`;

        const newIncident: Omit<Incident, 'id'> = {
            latitude,
            longitude,
            timestamp,
            brightness: parseFloat(data.bright_ti5),
            frp: parseFloat(data.frp),
            confidence: data.confidence,
        };
        
        const docRef = incidentsCollection.doc(docId);
        batch.set(docRef, newIncident, { merge: true });
        newIncidentsCount++;
    }

    await batch.commit();

    return { success: true, message: `Successfully processed and stored ${newIncidentsCount} FIRMS incidents.` };

  } catch (error) {
    console.error("Error fetching or storing FIRMS data:", error);
    return { success: false, message: "An error occurred while fetching FIRMS data." };
  }
}
