"use server";

import { adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Incident, Earthquake, EonetEvent, Ship } from "@/types";

/**
 * Generates 10 random mock incidents across the globe and saves them to Firestore.
 * This is useful for initial testing and development.
 */
export async function generateMockData() {
  if (!isFirebaseAdminInitialized) {
    const message = "Firebase Admin is not initialized. Cannot generate mock data.";
    console.error(message);
    return { success: false, message };
  }
  try {
    const batch = adminDb.batch();
    const incidentsCollection = adminDb.collection("incidents");

    for (let i = 0; i < 10; i++) {
       // Generate random coordinates globally
      const lat = Math.random() * 180 - 90;
      const lon = Math.random() * 360 - 180;

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
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `Failed to generate mock data: ${errorMessage}` };
  }
}

/**
 * Fetches real-time fire and thermal anomaly data from NASA's FIRMS API for the entire world
 * and stores it in the 'incidents' Firestore collection.
 * 
 * NOTE: To run this automatically every 30 minutes in production, you would set up
 * a scheduler (e.g., Google Cloud Scheduler) to call an API route that triggers this action.
 */
export async function fetchAndStoreFirmsData() {
  if (!isFirebaseAdminInitialized) {
    const message = "Firebase Admin is not initialized. Cannot store FIRMS data.";
    console.error(message);
    return { success: false, message };
  }

  const apiKey = process.env.FIRMS_MAP_KEY;
  if (!apiKey) {
    const message = "NASA FIRMS API key (FIRMS_MAP_KEY) is not configured in environment variables.";
    console.error(message);
    return { success: false, message };
  }

  // API fetches data for the entire world for the last 24 hours.
  const url = `https://firms.modaps.eosdis.nasa.gov/api/v1/nrt/world/csv/${apiKey}/VIIRS_SNPP_NRT/1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FIRMS API request failed with status: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");

    if (lines.length < 2 || !lines[0].includes('latitude')) {
      return { success: true, message: "No new FIRMS incidents found or invalid CSV format." };
    }
    
    const headers = lines[0].split(",");
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
            data[header.trim()] = values[index];
        });

        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);
        const acq_date = data.acq_date;
        const acq_time_str = data.acq_time ? data.acq_time.padStart(4, '0') : ''; // Ensure HHMM format

        if (isNaN(latitude) || isNaN(longitude) || !acq_date || !acq_time_str) continue;
        
        const year = parseInt(acq_date.substring(0, 4));
        const month = parseInt(acq_date.substring(5, 7)) - 1; // JS months are 0-indexed
        const day = parseInt(acq_date.substring(8, 10));
        const hour = parseInt(acq_time_str.substring(0, 2));
        const minute = parseInt(acq_time_str.substring(2, 4));
        const timestamp = Timestamp.fromDate(new Date(Date.UTC(year, month, day, hour, minute)));

        // Create a unique ID to prevent duplicates
        const docId = `${acq_date}-${acq_time_str}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`;

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

    if (newIncidentsCount > 0) {
      await batch.commit();
    }

    return { success: true, message: `Successfully processed and stored ${newIncidentsCount} FIRMS incidents.` };

  } catch (error) {
    console.error("Error fetching or storing FIRMS data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `An error occurred while fetching FIRMS data: ${errorMessage}` };
  }
}

/**
 * Fetches real-time earthquake data from the USGS feed for the past hour
 * and stores it in the 'earthquakes' Firestore collection.
 */
export async function fetchAndStoreUsgsData() {
  if (!isFirebaseAdminInitialized) {
    const message = "Firebase Admin is not initialized. Cannot store USGS data.";
    console.error(message);
    return { success: false, message };
  }

  const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USGS API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    const batch = adminDb.batch();
    const earthquakesCollection = adminDb.collection("earthquakes");
    let newEarthquakesCount = 0;

    for (const feature of data.features) {
      const { properties, geometry } = feature;
      if (!properties || !geometry || properties.type !== 'earthquake') continue;

      const [longitude, latitude] = geometry.coordinates;
      
      const newEarthquake: Omit<Earthquake, 'id'> = {
        latitude,
        longitude,
        timestamp: Timestamp.fromMillis(properties.time),
        magnitude: properties.mag,
        place: properties.place,
      };

      // Use USGS event id as the document ID to prevent duplicates
      const docId = feature.id;
      const docRef = earthquakesCollection.doc(docId);
      batch.set(docRef, newEarthquake, { merge: true });
      newEarthquakesCount++;
    }

    if (newEarthquakesCount > 0) {
      await batch.commit();
    }
    
    return { success: true, message: `Successfully processed and stored ${newEarthquakesCount} USGS earthquake events.` };

  } catch (error) {
    console.error("Error fetching or storing USGS data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `An error occurred while fetching USGS data: ${errorMessage}` };
  }
}

/**
 * Fetches open natural event data from NASA's EONET API
 * and stores it in the 'eonet_events' Firestore collection.
 */
export async function fetchAndStoreEonetData() {
    if (!isFirebaseAdminInitialized) {
        const message = "Firebase Admin is not initialized. Cannot store EONET data.";
        console.error(message);
        return { success: false, message };
    }

    // Fetches all open events
    const url = 'https://eonet.gsfc.nasa.gov/api/v3/events';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`EONET API request failed with status: ${response.status}`);
        }

        const data = await response.json();
        const batch = adminDb.batch();
        const eonetCollection = adminDb.collection("eonet_events");
        let newEventsCount = 0;

        for (const event of data.events) {
            // EONET events can have multiple geometries, we'll take the first one
            const geometry = event.geometry[0];
            if (!geometry || geometry.type !== 'Point') continue;

            const [longitude, latitude] = geometry.coordinates;

            const newEvent: Omit<EonetEvent, 'id'> = {
                title: event.title,
                category: event.categories[0]?.title || 'Unknown',
                latitude,
                longitude,
                timestamp: Timestamp.fromDate(new Date(geometry.date)),
            };

            const docId = event.id;
            const docRef = eonetCollection.doc(docId);
            batch.set(docRef, newEvent, { merge: true });
            newEventsCount++;
        }

        if (newEventsCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Successfully processed and stored ${newEventsCount} EONET events.` };

    } catch (error) {
        console.error("Error fetching or storing EONET data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `An error occurred while fetching EONET data: ${errorMessage}` };
    }
}

/**
 * Generates mock shipping data and stores it in Firestore.
 */
export async function fetchAndStoreShippingData() {
    if (!isFirebaseAdminInitialized) {
        const message = "Firebase Admin is not initialized. Cannot generate mock shipping data.";
        console.error(message);
        return { success: false, message };
    }
    try {
        const batch = adminDb.batch();
        const shippingCollection = adminDb.collection("ships");
        const shippingLanes = [
            { name: "Suez Canal", path: [{ lat: 30.0, lon: 32.5 }, { lat: 12.6, lon: 43.3 }] },
            { name: "Strait of Malacca", path: [{ lat: 1.2, lon: 103.8 }, { lat: 5.8, lon: 95.3 }] },
            { name: "Panama Canal", path: [{ lat: 9.0, lon: -79.7 }, { lat: 8.5, lon: -80.0 }] },
            { name: "Trans-Pacific", path: [{ lat: 34.0, lon: -118.2 }, { lat: 35.6, lon: 139.6 }] },
            { name: "Trans-Atlantic", path: [{ lat: 51.5, lon: -0.1 }, { lat: 40.7, lon: -74.0 }] },
        ];
        let newShipsCount = 0;
        
        // Clear old mock data
        const snapshot = await shippingCollection.limit(500).get();
        if(!snapshot.empty) {
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
        }

        for (const lane of shippingLanes) {
            for (let i = 0; i < 15; i++) { // 15 ships per lane
                const t = Math.random();
                const lat = lane.path[0].lat + t * (lane.path[1].lat - lane.path[0].lat);
                const lon = lane.path[0].lon + t * (lane.path[1].lon - lane.path[0].lon);
                
                const heading = Math.atan2(lane.path[1].lat - lane.path[0].lat, lane.path[1].lon - lane.path[0].lon) * 180 / Math.PI;

                const newShip: Omit<Ship, 'id'> = {
                    latitude: lat + (Math.random() - 0.5), // Add some jitter
                    longitude: lon + (Math.random() - 0.5),
                    timestamp: Timestamp.now(),
                    heading: heading,
                };
                const docRef = shippingCollection.doc();
                batch.set(docRef, newShip);
                newShipsCount++;
            }
        }
        await batch.commit();
        return { success: true, message: `Successfully generated ${newShipsCount} mock ships.` };
    } catch (error) {
        console.error("Error generating mock shipping data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `Failed to generate mock shipping data: ${errorMessage}` };
    }
}
