import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function convertFps(inputPath: string, outputPath: string, targetFps: number): Promise<void> {
  try {
    // Construct the FFmpeg command
    // -i: input file
    // -vf fps: video filter for fps
    // -an: remove audio
    // -y: overwrite output file if it exists
    const command = `ffmpeg -y -i "${inputPath}" -vf "fps=${targetFps}" -c:v libx264 -pix_fmt yuv420p -an "${outputPath}"`;
    
    console.log(`Running FFmpeg command: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    // FFmpeg typically writes logs to stderr
    console.log('FFmpeg processing complete.');
    // console.debug('FFmpeg stdout:', stdout);
    // console.debug('FFmpeg stderr:', stderr);
  } catch (error) {
    console.error('FFmpeg processing failed:', error);
    throw new Error('Failed to process video with FFmpeg');
  }
}
