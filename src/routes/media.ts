import { Router, Request, Response } from 'express';
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';

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

    console.log('Received media item data (S3 metadata based):', { media_url, title, media_type, uploader_name });

    // Assuming the metadata is already set on the S3 object during the initial upload
    // This endpoint now only serves to acknowledge the frontend that the item has been "processed"
    // (i.e., its upload URL was generated and the upload to S3 was completed by the client).

    // Optionally, if you need to perform any backend-specific actions after upload, do it here.
    // For now, we'll just send a success response.

    res.status(201).json({ message: 'Media item successfully processed', media_url: media_url.split('?')[0] });
  } catch (error) {
    console.error('Error processing media item:', error);
    res.status(500).json({ message: 'Failed to process media item' });
  }
});

export default router; 