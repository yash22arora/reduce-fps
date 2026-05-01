import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { writeFile } from 'fs/promises';



export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // MVP constraint: Reject very large files (~100MB limit)
    const MAX_SIZE = 100 * 1024 * 1024; // 100 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 400 });
    }

    // Validate mime type loosely
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Uploaded file is not a video' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get original extension
    const ext = path.extname(file.name) || '.mp4';
    const fileId = uuidv4();
    const fileName = `${fileId}${ext}`;
    
    // Save to local /uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      fileId,
      filePath: `/uploads/${fileName}`, // Relative for frontend display/API usage
      fileName,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}
