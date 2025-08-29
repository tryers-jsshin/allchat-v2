import { NextRequest, NextResponse } from 'next/server';

// Import the stored events from the main webhook handler
// In production, this would query from a database
let webhookEvents: any[] = [];

// Simple in-memory storage (shared with main webhook handler)
// Note: In production, use a proper database or Redis
global.lineWebhookEvents = global.lineWebhookEvents || [];

export async function GET(request: NextRequest) {
  try {
    // Return stored webhook events
    return NextResponse.json({
      events: global.lineWebhookEvents || [],
      count: global.lineWebhookEvents?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching LINE webhook events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}