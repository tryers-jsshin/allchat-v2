import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelAccessToken) {
      return NextResponse.json(
        { error: 'LINE channel access token not configured' },
        { status: 500 }
      );
    }

    console.log('Fetching LINE user profile:', { userId });

    // Check if we need to refresh from cache
    try {
      const { data: needsRefresh } = await supabase
        .rpc('line_profile_needs_refresh', { p_user_id: userId });
      
      if (!needsRefresh) {
        // Return from cache
        const { data: cachedProfile, error } = await supabase
          .from('line_user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (!error && cachedProfile) {
          console.log('Returning cached LINE profile:', userId);
          return NextResponse.json({
            userId: cachedProfile.user_id,
            displayName: cachedProfile.display_name,
            pictureUrl: cachedProfile.picture_url,
            language: cachedProfile.language,
            fetchedAt: cachedProfile.last_fetched_at,
            platform: 'line',
            fromCache: true
          });
        }
      }
    } catch (error) {
      console.log('Cache check failed, fetching from API:', error);
    }

    // Fetch user profile from LINE API
    const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`
      }
    });

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        userId
      });

      // Parse LINE error response
      try {
        const errorJson = JSON.parse(errorText);
        
        // Handle specific error cases
        if (response.status === 404) {
          return NextResponse.json(
            { 
              error: 'User not found',
              message: 'The user has not added this bot as a friend or has blocked it'
            },
            { status: 404 }
          );
        }
        
        return NextResponse.json(
          { 
            error: errorJson.message || 'Failed to fetch profile',
            details: errorJson.details || []
          },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { 
            error: `LINE API error: ${response.status} ${response.statusText}`,
            details: errorText
          },
          { status: response.status }
        );
      }
    }

    // Parse profile data
    const profile = await response.json();
    
    console.log('LINE profile fetched successfully:', {
      userId: profile.userId,
      displayName: profile.displayName,
      hasStatusMessage: !!profile.statusMessage,
      hasPictureUrl: !!profile.pictureUrl
    });

    // Save to database
    try {
      const { error: upsertError } = await supabase
        .from('line_user_profiles')
        .upsert({
          user_id: profile.userId,
          display_name: profile.displayName,
          picture_url: profile.pictureUrl,
          language: profile.language,
          cache_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          last_fetched_at: new Date()
        }, {
          onConflict: 'user_id'
        });
      
      if (upsertError) {
        console.error('Failed to save LINE profile to database:', upsertError);
      } else {
        console.log('LINE profile saved to database:', profile.userId);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Continue even if database save fails
    }

    // Return profile data with additional metadata
    return NextResponse.json({
      ...profile,
      fetchedAt: new Date().toISOString(),
      platform: 'line'
    });

  } catch (error) {
    console.error('Error fetching LINE profile:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Batch get profiles (for future use)
export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    if (userIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 user IDs allowed per request' },
        { status: 400 }
      );
    }

    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelAccessToken) {
      return NextResponse.json(
        { error: 'LINE channel access token not configured' },
        { status: 500 }
      );
    }

    console.log(`Fetching ${userIds.length} LINE user profiles`);

    // Fetch profiles in parallel
    const profilePromises = userIds.map(async (userId) => {
      try {
        const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${channelAccessToken}`
          }
        });

        if (response.ok) {
          const profile = await response.json();
          return {
            success: true,
            userId,
            profile: {
              ...profile,
              fetchedAt: new Date().toISOString(),
              platform: 'line'
            }
          };
        } else {
          return {
            success: false,
            userId,
            error: `Failed to fetch profile: ${response.status}`
          };
        }
      } catch (error) {
        return {
          success: false,
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    const results = await Promise.all(profilePromises);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`Batch profile fetch complete:`, {
      total: userIds.length,
      successful: successful.length,
      failed: failed.length
    });

    return NextResponse.json({
      profiles: successful.map(r => r.profile),
      errors: failed,
      summary: {
        requested: userIds.length,
        successful: successful.length,
        failed: failed.length
      }
    });

  } catch (error) {
    console.error('Error in batch profile fetch:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}