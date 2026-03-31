import { NextRequest, NextResponse } from 'next/server';

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;

/**
 * Server-side proxy for PostHog Funnel/Trends queries.
 * Uses POSTHOG_PERSONAL_API_KEY to authenticate (not exposed to client).
 *
 * POST /api/posthog/funnel
 * Body: { events: string[], dateFrom: string, dateTo: string }
 *
 * Returns event counts for each event in the funnel within the date range.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { events, dateFrom, dateTo } = body as {
      events: string[];
      dateFrom: string;
      dateTo: string;
    };

    if (!events || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    // If no API key is configured, return mock data with a flag
    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return NextResponse.json({
        mock: true,
        message: 'Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID env vars for real data',
        results: generateMockResults(events),
      });
    }

    // Query PostHog Trends API for each event's total count in the date range
    const response = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/insights/trend/?format=json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: events.map((eventName) => ({
            id: eventName,
            type: 'events',
            math: 'dau', // unique users
          })),
          date_from: dateFrom,
          date_to: dateTo,
          display: 'ActionsTable',
          insight: 'TRENDS',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PostHog API error:', response.status, errorText);

      // Fall back to mock data on API error
      return NextResponse.json({
        mock: true,
        message: `PostHog API returned ${response.status}`,
        results: generateMockResults(events),
      });
    }

    const data = await response.json();

    // Parse PostHog Trends response into our format
    // PostHog returns { result: [{ action: { id }, count, data, ... }] }
    const results: Record<string, number> = {};

    if (data.result && Array.isArray(data.result)) {
      for (const series of data.result) {
        const eventName = series.action?.id || series.label;
        // For 'dau' math, aggregated_value is the total unique users
        const count = series.aggregated_value ?? series.count ?? 0;
        results[eventName] = Math.round(count);
      }
    }

    // Ensure all requested events have a value
    for (const event of events) {
      if (results[event] === undefined) {
        results[event] = 0;
      }
    }

    return NextResponse.json({ mock: false, results });
  } catch (error) {
    console.error('PostHog funnel query error:', error);
    return NextResponse.json(
      { error: 'Failed to query PostHog', mock: true, results: {} },
      { status: 500 }
    );
  }
}

/**
 * Generate realistic mock data when PostHog API key is not configured.
 * Uses consistent seed based on event names so numbers don't jump on every request.
 */
function generateMockResults(events: string[]): Record<string, number> {
  // Realistic e-commerce funnel drop-off pattern
  const baselineMap: Record<string, number> = {
    session_start: 982,
    $pageview: 834,
    view_item: 421,
    add_to_cart: 156,
    begin_checkout: 89,
    purchase: 34,
    remove_from_cart: 23,
    search: 187,
    custom: 50,
  };

  const results: Record<string, number> = {};
  for (const event of events) {
    results[event] = baselineMap[event] ?? Math.floor(50 + Math.random() * 200);
  }
  return results;
}
