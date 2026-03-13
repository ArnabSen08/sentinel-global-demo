import { fetchAndStoreFirmsData } from '@/app/actions';
import { NextResponse } from 'next/server';

// This route can be called by a cron job scheduler to periodically fetch FIRMS data.
// e.g., `curl -X GET https://your-app-url/api/cron`
export async function GET(req: Request) {
  // In a production environment, you would want to secure this endpoint.
  // For example, by checking for a secret token in the headers:
  // if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const result = await fetchAndStoreFirmsData();
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      // Use 500 status code for server-side errors from the action
      return NextResponse.json({ success: false, message: result.message }, { status: 500 });
    }
  } catch (error) {
    console.error("Cron job /api/cron failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ success: false, message: `Internal Server Error: ${errorMessage}` }, { status: 500 });
  }
}
