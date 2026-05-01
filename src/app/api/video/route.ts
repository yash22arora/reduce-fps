import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const statAsync = promisify(fs.stat);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path'); // e.g., "/uploads/123.mp4" or "/outputs/123_4fps.mp4"

  if (!filePath) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }

  // Sanitize path (prevent directory traversal)
  const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  
  if (!safePath.startsWith('/uploads') && !safePath.startsWith('/outputs')) {
    return new NextResponse('Invalid path', { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), safePath);

  try {
    const stats = await statAsync(absolutePath);
    const fileSize = stats.size;
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(absolutePath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
      };
      
      // @ts-ignore - Next.js NextResponse can accept Node.js streams via ReadableStream constructor, but we'll use a standard workaround
      const stream = new ReadableStream({
        start(controller) {
          file.on('data', (chunk) => controller.enqueue(chunk));
          file.on('end', () => controller.close());
          file.on('error', (err) => controller.error(err));
        }
      });

      return new NextResponse(stream, {
        status: 206,
        headers: head as HeadersInit,
      });
    } else {
      const head = {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'video/mp4',
      };
      
      const file = fs.createReadStream(absolutePath);
      const stream = new ReadableStream({
        start(controller) {
          file.on('data', (chunk) => controller.enqueue(chunk));
          file.on('end', () => controller.close());
          file.on('error', (err) => controller.error(err));
        }
      });

      return new NextResponse(stream, {
        status: 200,
        headers: head as HeadersInit,
      });
    }
  } catch (err) {
    console.error('Error streaming video:', err);
    return new NextResponse('File not found', { status: 404 });
  }
}
