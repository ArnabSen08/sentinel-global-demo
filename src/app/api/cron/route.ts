import { fetchAndStoreFirmsData, fetchAndStoreUsgsData, fetchAndStoreEonetData, fetchAndStoreShippingData } from '@/app/actions';
import { NextResponse } from 'next/server';

// This route can be called by a cron job scheduler to periodically fetch data.
export async function GET(req: Request) {
  // In a production environment, you would want to secure this endpoint.
  try {
    // Run all data fetch actions in parallel
    const [firmsResult, usgsResult, eonetResult, shippingResult] = await Promise.all([
      fetchAndStoreFirmsData(),
      fetchAndStoreUsgsData(),
      fetchAndStoreEonetData(),
      fetchAndStoreShippingData() // Add shipping data fetch
    ]);

    const results = {
      firms: firmsResult,
      usgs: usgsResult,
      eonet: eonetResult,
      shipping: shippingResult
    };
    
    // Check if any of them failed
    const hasError = Object.values(results).some(r => !r.success);

    if (hasError) {
        console.error("Cron job /api/cron finished with errors:", results);
        return NextResponse.json({ success: false, results }, { status: 500 });
    }

    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error("Cron job /api/cron failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ success: false, message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}
