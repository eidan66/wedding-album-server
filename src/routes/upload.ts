import { Router, Request, Response } from 'express';
import { generateUploadUrl } from '../utils/s3';


const router = Router();

interface UploadRequest {
  filename: string;
  filetype: string;
  filesize: number;
}

router.post('/upload-url', async (req: Request, res: Response) => {
  try {
    const { filename, filetype, filesize } = req.body as UploadRequest;

    // Validate required fields
    if (!filename || !filetype || !filesize) {
      return res.status(400).json({
        error: 'Missing required fields: filename, filetype, and filesize are required',
      });
    }

    const result = await generateUploadUrl(filename, filetype, filesize);
    res.json(result);
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to generate upload URL',
    });
  }
});

// Health check endpoint for uptime monitoring
router.get('/ping', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;  