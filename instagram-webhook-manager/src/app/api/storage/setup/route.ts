import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for Storage operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for Storage operations
);

// GET: Check and setup storage buckets
export async function GET(request: NextRequest) {
  try {
    // Check if line-media bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json(
        { error: 'Failed to list buckets', details: listError.message },
        { status: 500 }
      );
    }

    const lineMediaBucket = buckets?.find(bucket => bucket.name === 'line-media');

    if (!lineMediaBucket) {
      console.log('Creating line-media bucket...');
      
      // Create the bucket
      const { data: createData, error: createError } = await supabase.storage.createBucket(
        'line-media',
        {
          public: true, // Make it public so we can access files via URL
          fileSizeLimit: 52428800, // 50MB limit
          allowedMimeTypes: [
            'image/*',
            'video/*',
            'audio/*',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
            'text/*'
          ]
        }
      );

      if (createError) {
        console.error('Error creating bucket:', createError);
        return NextResponse.json(
          { error: 'Failed to create bucket', details: createError.message },
          { status: 500 }
        );
      }

      console.log('line-media bucket created successfully');
      
      // Set up folder structure (folders are created automatically when files are uploaded)
      return NextResponse.json({
        message: 'Storage bucket created successfully',
        bucket: 'line-media',
        folders: [
          'images/',
          'videos/',
          'audios/',
          'files/'
        ]
      });
    }

    // Bucket already exists
    return NextResponse.json({
      message: 'Storage bucket already exists',
      bucket: 'line-media',
      public: lineMediaBucket.public,
      created_at: lineMediaBucket.created_at
    });

  } catch (error) {
    console.error('Storage setup error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}