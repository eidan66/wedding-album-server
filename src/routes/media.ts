import { Router, Request, Response } from 'express';
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';
import { writeMetadata } from '../utils/s3';

const router = Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Define the POST /media endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    const { media_url, title, media_type, uploader_name } = req.body; // Data sent from the client

    console.log('Received media item data:', { media_url, title, media_type, uploader_name });

    // Extract S3 key from media_url (assuming a specific URL structure)
    const urlParts = media_url.split('/');
    const s3Key = urlParts.slice(urlParts.indexOf('wedding-uploads')).join('/');

    if (!s3Key) {
        return res.status(400).json({ message: 'Invalid media_url provided' });
    }

    // Store metadata in a JSON file in S3
    await writeMetadata({
        [s3Key]: {
            title: title || '',
            uploader_name: uploader_name || '',
            media_type: media_type,
            media_url: media_url.split('?')[0],
            created_date: new Date().toISOString() // Add creation date
        }
    });

    res.status(201).json({ message: 'Media item metadata saved', key: s3Key });
  } catch (error) {
    console.error('Error saving media item metadata:', error);
    res.status(500).json({ message: 'Failed to save media item metadata' });
  }
});

export default router; 