
"use server";

import { adminDb, isFirebaseAdminInitialized } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type { Incident, Earthquake, EonetEvent, Ship, Flight, StockUpdate, WeatherUpdate } from "@/types";

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
 */
export async function fetchAndStoreFirmsData() {
  if (!isFirebaseAdminInitialized) {
    const message = "Firebase Admin is not initialized. Cannot store FIRMS data.";
    console.error(message);
    return { success: false, message };
  }

  const apiKey = process.env.FIRMS_MAP_KEY;
  if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_FIRMS_MAP_KEY') {
    const message = "NASA FIRMS API key (FIRMS_MAP_KEY) is not configured in environment variables.";
    console.warn(message);
    return { success: false, message };
  }

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
        const acq_time_str = data.acq_time ? data.acq_time.padStart(4, '0') : '';

        if (isNaN(latitude) || isNaN(longitude) || !acq_date || !acq_time_str) continue;
        
        const year = parseInt(acq_date.substring(0, 4));
        const month = parseInt(acq_date.substring(5, 7)) - 1;
        const day = parseInt(acq_date.substring(8, 10));
        const hour = parseInt(acq_time_str.substring(0, 2));
        const minute = parseInt(acq_time_str.substring(2, 4));
        const timestamp = Timestamp.fromDate(new Date(Date.UTC(year, month, day, hour, minute)));

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
 * Fetches real-time shipping data from Airstream API and stores it in Firestore.
 */
export async function fetchAndStoreShippingData() {
    if (!isFirebaseAdminInitialized) {
        const message = "Firebase Admin is not initialized. Cannot fetch shipping data.";
        console.error(message);
        return { success: false, message };
    }

    const apiKey = process.env.AISTREAM_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_AISTREAM_API_KEY') {
        const message = "Airstream API key (AISTREAM_API_KEY) is not configured in environment variables. Shipping data will not be available.";
        console.warn(message);
        return { success: false, message };
    }

    const url = 'https://api.aistream.io/v2/vessels'; 

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!response.ok) {
            throw new Error(`Airstream API request failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data || !Array.isArray(data.data)) {
             return { success: true, message: "No new shipping data found or invalid API response format." };
        }

        const batch = adminDb.batch();
        const shipsCollection = adminDb.collection("ships");
        let newShipsCount = 0;

        const snapshot = await shipsCollection.limit(1000).get(); 
        const existingShipIds = new Set(snapshot.docs.map(d => d.id));

        for (const ship of data.data) {
            const { id, last_known_position } = ship;
            
            if (!id || !last_known_position || !last_known_position.geometry || !last_known_position.geometry.coordinates) continue;

            const [longitude, latitude] = last_known_position.geometry.coordinates;
            
            const newShip: Omit<Ship, 'id'> = {
                latitude: latitude,
                longitude: longitude,
                timestamp: Timestamp.fromDate(new Date(last_known_position.timestamp)),
                heading: last_known_position.heading || last_known_position.course_over_ground || 0,
            };

            const docId = String(ship.mmsi || id);
            const docRef = shipsCollection.doc(docId);
            batch.set(docRef, newShip);
            newShipsCount++;
            existingShipIds.delete(docId);
        }
        
        existingShipIds.forEach(shipId => {
            batch.delete(shipsCollection.doc(shipId));
        });

        await batch.commit();

        return { success: true, message: `Successfully processed and stored ${newShipsCount} ships.` };

    } catch (error) {
        console.error("Error fetching or storing Airstream shipping data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `An error occurred while fetching shipping data: ${errorMessage}` };
    }
}

/**
 * Fetches real-time flight data from AviationStack and stores it in Firestore.
 */
export async function fetchAndStoreFlightsData() {
    if (!isFirebaseAdminInitialized) {
        const message = "Firebase Admin is not initialized. Cannot fetch flight data.";
        console.error(message);
        return { success: false, message };
    }

    const apiKey = process.env.AVIATIONSTACK_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_AVIATIONSTACK_API_KEY') {
        const message = "AviationStack API key is not configured. Flight data will be unavailable.";
        console.warn(message);
        return { success: false, message };
    }

    // Free plan requires HTTP, not HTTPS.
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_status=active`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data?.error?.message || `AviationStack API request failed with status: ${response.status}`);
        }

        const flightsCollection = adminDb.collection("flights");
        const batch = adminDb.batch();
        let newFlightsCount = 0;

        const allFlights = data.data
            .filter((flight: any) => flight.live && flight.live.latitude && flight.live.longitude)
            .map((flight: any): Omit<Flight, 'id'> => ({
                latitude: flight.live.latitude,
                longitude: flight.live.longitude,
                direction: flight.live.direction,
                timestamp: Timestamp.fromMillis(flight.live.updated_unix * 1000),
                flight_iata: flight.flight.iata,
                airline_name: flight.airline.name,
                dep_iata: flight.departure.iata,
                arr_iata: flight.arrival.iata,
            }));
        
        for (const flight of allFlights) {
            // Use flight IATA as a unique ID, falling back to a composite key.
            const docId = flight.flight_iata || `${flight.dep_iata}-${flight.arr_iata}-${flight.airline_name}`;
            const docRef = flightsCollection.doc(docId);
            batch.set(docRef, flight, { merge: true });
            newFlightsCount++;
        }

        if (newFlightsCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Successfully processed and stored ${newFlightsCount} active flights.` };

    } catch (error) {
        console.error("Error fetching or storing flight data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `An error occurred while fetching flight data: ${errorMessage}` };
    }
}


/**
 * Fetches stock market data and stores it in Firestore.
 */
export async function fetchAndStoreStockData() {
    if (!isFirebaseAdminInitialized) {
        const message = "Firebase Admin is not initialized. Cannot fetch stock data.";
        console.error(message);
        return { success: false, message };
    }

    const apiKey = process.env.FINANCIAL_API_KEY;
    if (!apiKey || apiKey === 'REPLACE_WITH_YOUR_FINANCIAL_API_KEY') {
        const message = "Financial API key is not configured. Stock data will be unavailable.";
        console.warn(message);
        return { success: false, message };
    }

    // Example: Fetching major indices from Financial Modeling Prep
    const tickers = ['^GSPC', '^IXIC', '^FTSE', '^N225', '^GDAXI', '000001.SS', '^BSESN'];
    const url = `https://financialmodelingprep.com/api/v3/quote/${tickers.join(',')}?apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Financial API request failed with status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            return { success: true, message: "No new stock data found or invalid API response format." };
        }

        const batch = adminDb.batch();
        const stocksCollection = adminDb.collection("stocks");
        let newStocksCount = 0;

        for (const stock of data) {
            if (!stock.symbol || stock.price === undefined) continue;
            
            const newStock: Omit<StockUpdate, 'id'> = {
                price: stock.price,
                change: stock.changesPercentage,
                timestamp: Timestamp.now(),
            };

            const docRef = stocksCollection.doc(stock.symbol);
            batch.set(docRef, newStock, { merge: true });
            newStocksCount++;
        }
        
        if (newStocksCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Successfully processed and stored ${newStocksCount} stock updates.` };

    } catch (error) {
        console.error("Error fetching or storing stock data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, message: `An error occurred while fetching stock data: ${errorMessage}` };
    }
}

/**
 * Fetches real-time weather data from Open-Meteo for major cities
 * and stores it in the 'weather' Firestore collection.
 */
export async function fetchAndStoreWeatherData() {
  if (!isFirebaseAdminInitialized) {
    const message = "Firebase Admin is not initialized. Cannot store weather data.";
    console.error(message);
    return { success: false, message };
  }

  const cities = {
    'New York': { lat: 40.71, lon: -74.01 },
    'London': { lat: 51.51, lon: -0.13 },
    'Tokyo': { lat: 35.69, lon: 139.69 },
    'Sydney': { lat: -33.87, lon: 151.21 },
    'Cairo': { lat: 30.05, lon: 31.24 },
    'Sao Paulo': { lat: -23.55, lon: -46.63 },
    'Beijing': { lat: 39.91, lon: 116.40 },
  };

  const latitudes = Object.values(cities).map(c => c.lat.toFixed(2)).join(',');
  const longitudes = Object.values(cities).map(c => c.lon.toFixed(2)).join(',');

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,wind_speed_10m`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API request failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.current || !Array.isArray(data.current.temperature_2m)) {
        return { success: true, message: "No new weather data found or invalid API response format." };
    }

    const cityNames = Object.keys(cities);
    const batch = adminDb.batch();
    const weatherCollection = adminDb.collection("weather");

    data.current.temperature_2m.forEach((temp: number, index: number) => {
      const cityName = cityNames[index];
      const cityCoords = Object.values(cities)[index];
      const windSpeed = data.current.wind_speed_10m[index];
      
      const newWeather: Omit<WeatherUpdate, 'id'> = {
        latitude: cityCoords.lat,
        longitude: cityCoords.lon,
        temperature: temp,
        windspeed: windSpeed,
        timestamp: Timestamp.now(),
      };

      const docId = cityName.replace(/\s+/g, '_');
      const docRef = weatherCollection.doc(docId);
      batch.set(docRef, newWeather, { merge: true });
    });

    await batch.commit();

    return { success: true, message: `Successfully processed and stored weather for ${cityNames.length} cities.` };

  } catch (error) {
    console.error("Error fetching or storing Open-Meteo data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, message: `An error occurred while fetching weather data: ${errorMessage}` };
  }
}
