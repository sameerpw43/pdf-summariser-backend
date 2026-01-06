# Deploying PDF Summarizer Backend to Vercel

## Prerequisites
1. Install Vercel CLI: `npm i -g vercel`
2. Create a Vercel account at https://vercel.com

## Environment Variables
Before deploying, you need to set up these environment variables in Vercel:

### Required Variables:
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `OPENAI_API_KEY` - Your OpenAI API key (optional)
- `HUGGINGFACE_API_KEY` - Your Hugging Face API key (optional)

## Deployment Steps

### Option 1: Deploy via Vercel CLI
1. Navigate to the backend directory:
   ```bash
   cd pdf-summarizer-be
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Choose your account
   - Link to existing project? **N** (for first deployment)
   - Project name: `pdf-summarizer-backend` (or your choice)
   - Directory: `./` (current directory)

5. Set environment variables:
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add OPENAI_API_KEY
   vercel env add HUGGINGFACE_API_KEY
   ```

6. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your Git repository
4. Set the root directory to `pdf-summarizer-be`
5. Add environment variables in the project settings
6. Deploy

## Important Notes

### File Upload Limits
- Vercel has a 4.5MB limit for serverless function payloads
- For larger PDFs, consider using external storage (AWS S3, Cloudinary, etc.)

### Function Timeout
- Free tier: 10 seconds
- Pro tier: 60 seconds (configured in vercel.json)
- AI processing might need longer timeouts

### Database Connection
- Use MongoDB Atlas (cloud) instead of local MongoDB
- Ensure your MongoDB allows connections from Vercel IPs

### CORS Configuration
- Update your frontend API base URL to point to Vercel deployment
- Vercel URL format: `https://your-project-name.vercel.app`

## Testing Deployment
After deployment, test these endpoints:
- `GET /api/health` - Health check
- `POST /api/register` - User registration
- `POST /api/login` - User login

## Troubleshooting

### Common Issues:
1. **Module not found**: Ensure all dependencies are in package.json
2. **Environment variables**: Double-check they're set in Vercel dashboard
3. **Database connection**: Verify MongoDB URI and network access
4. **File upload errors**: Check file size limits
5. **Timeout errors**: Consider upgrading Vercel plan or optimizing AI calls

### Logs:
View deployment logs in Vercel dashboard or use:
```bash
vercel logs
```

## Production Considerations
1. Set up proper error monitoring (Sentry, LogRocket, etc.)
2. Implement rate limiting
3. Add request validation
4. Set up health checks
5. Configure proper CORS for your frontend domain
6. Consider caching strategies for AI responses