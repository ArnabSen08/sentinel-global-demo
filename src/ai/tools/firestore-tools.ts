'use server';

import { adminDb, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { Incident, Earthquake, NewsArticle, Ship, Flight, StockUpdate } from '@/types';
import { CollectionReference, Query, Timestamp } from 'firebase-admin/firestore';

// A generic query function to avoid repetition
async function queryCollection<T>(
    collectionName: string,
    queryParams: { limit?: number; where?: [string, FirebaseFirestore.WhereFilterOp, any][] }
): Promise<T[]> {
    if (!isFirebaseAdminInitialized) {
        console.error('Firebase Admin not initialized, cannot query collection.');
        return [];
    }

    let query: Query = adminDb.collection(collectionName);

    if (queryParams.where) {
        queryParams.where.forEach(condition => {
            query = query.where(...condition);
        });
    }
    
    // Always order by timestamp if it exists, for relevance
    try {
        // This is a check to see if timestamp field exists on documents in collection
        await adminDb.collection(collectionName).limit(1).where('timestamp', '>', Timestamp.fromMillis(0)).get();
        query = query.orderBy('timestamp', 'desc');
    } catch (e) {
        // 'timestamp' field probably doesn't exist, so we can't order by it.
    }

    if (queryParams.limit) {
        query = query.limit(queryParams.limit);
    } else {
        query = query.limit(25); // Default limit to prevent huge responses
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
}


export async function getFires(limit = 10) {
    return await queryCollection<Incident>('incidents', { limit });
}

export async function getEarthquakes(minMagnitude = 1.0, limit = 10) {
    return await queryCollection<Earthquake>('earthquakes', { 
        where: [['magnitude', '>=', minMagnitude]],
        limit 
    });
}

export async function getNews(limit = 10) {
    return await queryCollection<NewsArticle>('news', { limit });
}

export async function getShips(limit = 20) {
    return await queryCollection<Ship>('ships', { limit });
}

export async function getFlights(limit = 20) {
    return await queryCollection<Flight>('flights', { limit });
}

export async function getStocks(limit = 10) {
    return await queryCollection<StockUpdate>('stocks', { limit });
}
