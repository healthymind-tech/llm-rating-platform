// Use require to avoid strict type dependency on minio types
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Minio = require('minio');
import { v4 as uuidv4 } from 'uuid';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
const MINIO_PORT = parseInt(process.env.MINIO_PORT || '9000', 10);
const MINIO_USE_SSL = (process.env.MINIO_USE_SSL || 'false').toLowerCase() === 'true';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'chat-uploads';
// First check for explicit public URL, then construct from frontend URL, then fall back to direct access
const PUBLIC_BASE_URL = process.env.MINIO_PUBLIC_BASE_URL || 
                       (process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/minio` : null) ||
                       'http://localhost/minio'; // Safe fallback for containerized environments

let client: any | null = null;

function getClient(): any {
  if (!client) {
    client = new Minio.Client({
      endPoint: MINIO_ENDPOINT,
      port: MINIO_PORT,
      useSSL: MINIO_USE_SSL,
      accessKey: MINIO_ACCESS_KEY,
      secretKey: MINIO_SECRET_KEY,
    });
  }
  return client;
}

async function ensureBucket(): Promise<void> {
  const c = getClient();
  const exists = await c.bucketExists(MINIO_BUCKET).catch(() => false);
  if (!exists) {
    await c.makeBucket(MINIO_BUCKET, '');
  }
}

export const storageService = {
  async uploadBase64Image(base64: string, opts: { userId: string; sessionId: string }): Promise<{ url: string; key: string }>{
    await ensureBucket();
    const c = getClient();
    const buffer = Buffer.from(base64, 'base64');
    // naive content detection; default to jpg
    const ext = 'jpg';
    const key = `chat/${opts.userId}/${opts.sessionId}/${uuidv4()}.${ext}`;
    await c.putObject(MINIO_BUCKET, key, buffer, { 'Content-Type': 'image/jpeg' });
    
    // Always use the public base URL (should never fall back to direct MinIO access)
    const url = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/${MINIO_BUCKET}/${key}`;
    
    return { url, key };
  },

  async getImageAsBase64(key: string): Promise<string> {
    try {
      await ensureBucket();
      const c = getClient();
      const dataStream = await c.getObject(MINIO_BUCKET, key);
      
      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of dataStream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Convert to base64 and return as data URL
      const base64 = buffer.toString('base64');
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error fetching image from MinIO:', error);
      throw new Error('Failed to fetch image from storage');
    }
  },

  // Helper function to extract key from MinIO URL
  extractKeyFromUrl(url: string): string | null {
    try {
      // Extract key from URL like http://162.38.2.150/minio/chat-uploads/chat/user/session/image.jpg
      const match = url.match(/\/chat-uploads\/(.+)$/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  },
};
