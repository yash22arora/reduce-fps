import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { convertFps } from '@/lib/ffmpeg';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  try {
    const { fileId, targetFps, fileName } = await request.json();

    if (!fileId || !targetFps || !fileName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const fps = parseInt(targetFps, 10);
    if (isNaN(fps) || fps < 1 || fps > 60) {
      return NextResponse.json({ error: 'Invalid FPS value. Must be between 1 and 60.' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const outputsDir = path.join(process.cwd(), 'outputs');
    
    const inputPath = path.join(uploadsDir, fileName);
    
    // Verify input file exists
    try {
      await fs.access(inputPath);
    } catch {
      return NextResponse.json({ error: 'Input file not found' }, { status: 404 });
    }

    const outputFileName = `${fileId}_${fps}fps.mp4`;
    const outputPath = path.join(outputsDir, outputFileName);

    // Process the video using FFmpeg
    await convertFps(inputPath, outputPath, fps);
    
    // Get output file size
    const stats = await fs.stat(outputPath);

    return NextResponse.json({
      outputPath: `/outputs/${outputFileName}`,
      outputFileName,
      outputSize: stats.size,
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json({ error: 'Failed to convert video' }, { status: 500 });
  }
}
