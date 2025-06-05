import { Router, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// Path to the metadata file
const METADATA_FILE = path.join(__dirname, 'metadata.json');

// Helper function to read metadata
const readMetadata = async () => {
  try {
    const data = await fs.readFile(METADATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid JSON, return empty object
    return {};
  }
};

// Helper function to write metadata
const writeMetadata = async (metadata: any) => {
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf-8');
};

// Define the POST /media endpoint
router.post('/', async (req: Request, res: Response) => {
  try {
    const { media_url, title, media_type, uploader_name } = req.body; // Data sent from the client

    // Extract S3 key from media_url (assuming a specific URL structure)
    const urlParts = media_url.split('/');
    const s3Key = urlParts.slice(urlParts.indexOf('wedding-uploads')).join('/');

    if (!s3Key) {
        return res.status(400).json({ message: 'Invalid media_url provided' });
    }

    const metadata = await readMetadata();

    metadata[s3Key] = {
      title: title || '',
      uploader_name: uploader_name || '',
      media_type: media_type, // Store media type for consistency
      // We don't store media_url here as it can be reconstructed
    };

    await writeMetadata(metadata);

    res.status(201).json({ message: 'Media item metadata saved', key: s3Key });
  } catch (error) {
    console.error('Error saving media item metadata:', error);
    res.status(500).json({ message: 'Failed to save media item metadata' });
  }
});

export default router; 