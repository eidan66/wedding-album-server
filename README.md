# Wedding Album Server

A lightweight backend server for handling wedding photo uploads directly to AWS S3 using pre-signed URLs.

## Features

- Secure direct-to-S3 uploads using pre-signed URLs
- File type validation (JPEG, PNG, GIF)
- File size limits (10MB max)
- CORS support for frontend integration
- Health check endpoint for uptime monitoring

## Prerequisites

- Node.js 16+
- Yarn package manager
- AWS account with S3 bucket
- AWS credentials with appropriate permissions

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd wedding-album-server
```

2. Install dependencies:
```bash
yarn install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=your_region
S3_BUCKET_NAME=your_bucket_name
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
```

5. Configure your S3 bucket:
   - Create a bucket in AWS S3
   - Set up CORS configuration
   - Apply the provided bucket policy

## Development

Start the development server:
```bash
yarn dev
```

## Production

Build the project:
```bash
yarn build
```

Start the production server:
```bash
yarn start
```

## API Endpoints

### Generate Upload URL
```
POST /api/upload-url
```

Request body:
```json
{
  "filename": "photo.jpg",
  "filetype": "image/jpeg",
  "filesize": 2048000
}
```

Response:
```json
{
  "url": "https://s3.amazonaws.com/your-bucket-name/wedding-uploads/...",
  "key": "wedding-uploads/unique-filename.jpg"
}
```

### Health Check
```
GET /api/ping
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-21T12:00:00.000Z"
}
```

## S3 Bucket Policy

Apply this policy to your S3 bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPreSignedUpload",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::your-bucket-name/wedding-uploads/*",
      "Condition": {
        "NumericLessThanEquals": { "s3:content-length": 10485760 },
        "StringEquals": { "s3:x-amz-acl": "public-read" }
      }
    }
  ]
}
```

## Keeping the Server Alive (Free Tier)

For the free tier on Render, set up a ping service to hit the `/api/ping` endpoint every 5-10 minutes using:
- https://cron-job.org
- https://uptimerobot.com

## License

ISC 