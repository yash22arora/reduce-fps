import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function DELETE(request: NextRequest) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const outputsDir = path.join(process.cwd(), 'outputs');

    const cleanDirectory = async (dir: string) => {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.startsWith(fileId)) {
            await fs.unlink(path.join(dir, file));
            console.log(`Cleaned up file: ${file}`);
          }
        }
      } catch (err) {
        console.error(`Error cleaning directory ${dir}:`, err);
      }
    };

    await Promise.all([
      cleanDirectory(uploadsDir),
      cleanDirectory(outputsDir)
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Failed to cleanup files' }, { status: 500 });
  }
}
