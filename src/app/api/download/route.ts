import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path'); 

  if (!filePath) {
    return new NextResponse('Missing path parameter', { status: 400 });
  }

  // Sanitize path
  const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  
  if (!safePath.startsWith('/outputs')) {
    return new NextResponse('Can only download from outputs', { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), safePath);

  try {
    // Read the file directly to avoid Next.js stream chunk corruption
    const fileBuffer = fs.readFileSync(absolutePath);

    const fileName = path.basename(absolutePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType = ext === '.mov' ? 'video/quicktime' : 
                        ext === '.webm' ? 'video/webm' : 'video/mp4';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}
