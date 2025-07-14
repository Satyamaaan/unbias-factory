# Production Deployment Guide

This guide covers deploying Unbias Factory to production using recommended hosting providers.

## 🚀 Quick Deploy to Vercel

The fastest way to deploy this application is using Vercel with the Supabase integration.

### Prerequisites

1. GitHub account with this repository
2. Vercel account
3. Supabase account (optional - can be created during deployment)

### One-Click Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/unbias-factory&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY&envDescription=Supabase%20configuration%20required&integration-ids=oac_VqOgBHqhEpLGy5oSP7a1ueE4)

## 🏗️ Manual Deployment Setup

### 1. Frontend Deployment (Vercel)

#### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```

#### Step 3: Deploy
```bash
# From your project root
vercel

# For production deployment
vercel --prod
```

#### Step 4: Configure Environment Variables
In Vercel dashboard, add these environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. Backend Setup (Supabase)

#### Option A: Supabase Cloud (Recommended)

1. **Create Project**: Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. **Create new project**: Choose your organization and set project details
3. **Configure Database**: Run migrations from `supabase/migrations/`
4. **Deploy Edge Functions**: Deploy the `match_offers` function
5. **Set up Authentication**: Configure auth providers and redirect URLs

#### Option B: Self-Hosted Supabase

For enterprise or custom requirements:

```bash
# Clone Supabase
git clone https://github.com/supabase/supabase.git

# Navigate to Docker setup
cd supabase/docker

# Configure environment
cp .env.example .env
# Edit .env with your configurations

# Start services
docker compose up -d
```

### 3. Database Setup

#### Run Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Run migrations
supabase db push
```

#### Deploy Edge Functions
```bash
# Deploy match_offers function
supabase functions deploy match_offers
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auto-configured by Vercel-Supabase integration
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
```

### Supabase Auth Configuration

1. **Redirect URLs**: Add your Vercel domain to auth redirect URLs
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**` (for all auth flows)

2. **Row Level Security**: Ensure RLS is enabled on all tables

3. **CORS**: Configure CORS for your domain in Supabase settings

## 🛡️ Security Checklist

### Pre-Production Security

- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Configure proper CORS settings
- [ ] Set up proper redirect URLs
- [ ] Enable MFA on Supabase account
- [ ] Review and test all API endpoints
- [ ] Configure network restrictions (if using Supabase Pro)
- [ ] Set up proper backup strategy

### Environment Security

- [ ] Never commit `.env` files
- [ ] Use environment variables for all secrets
- [ ] Rotate API keys regularly
- [ ] Monitor access logs
- [ ] Set up alerts for suspicious activity

## 📊 Performance Optimization

### Next.js Optimizations

1. **Enable Image Optimization**
   - Already configured with `next/image`
   - Consider CDN for static assets

2. **Bundle Analysis**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   npm run analyze
   ```

3. **Database Optimization**
   - Add proper indices for common queries
   - Enable connection pooling
   - Monitor query performance

### Supabase Optimizations

1. **Connection Pooling**: Enabled by default with Vercel integration
2. **Point-in-Time Recovery**: Enable for databases > 4GB
3. **Read Replicas**: Consider for high-traffic applications

## 🔍 Monitoring & Debugging

### Performance Monitoring

1. **Vercel Analytics**: Enable in Vercel dashboard
2. **Supabase Insights**: Monitor database performance
3. **Core Web Vitals**: Use Lighthouse for performance audits

### Error Tracking

1. **Vercel Functions**: Monitor edge function logs
2. **Supabase Logs**: Monitor database and auth logs
3. **Browser Console**: Check for client-side errors

### Health Checks

```bash
# Test API endpoints
curl https://your-app.vercel.app/api/health

# Test database connectivity
npm run test:db

# Test edge functions
supabase functions serve --env-file .env.local
```

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run build`
   - Verify environment variables are set
   - Check dependency versions

2. **Database Connection Issues**
   - Verify Postgres URLs are correct
   - Check network restrictions
   - Ensure SSL is enabled

3. **Authentication Issues**
   - Verify redirect URLs in Supabase
   - Check CORS configuration
   - Ensure JWT secrets are properly set

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)

## 📈 Scaling Considerations

### Traffic Growth

1. **Database Scaling**
   - Upgrade Supabase plan as needed
   - Consider read replicas for high-read workloads
   - Implement caching strategies

2. **Function Scaling**
   - Monitor Vercel function execution times
   - Optimize edge function performance
   - Consider dedicated compute for heavy operations

3. **CDN & Caching**
   - Leverage Vercel's Edge Network
   - Implement proper cache headers
   - Consider additional CDN for assets

### Cost Optimization

1. **Monitor Usage**
   - Track Vercel function invocations
   - Monitor Supabase database size and requests
   - Set up billing alerts

2. **Optimize Resources**
   - Clean up unused database connections
   - Optimize image sizes and formats
   - Review and optimize bundle size

---

## 🎯 Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Edge functions deployed and tested
- [ ] Authentication flows tested
- [ ] Security checklist completed
- [ ] Performance optimizations applied
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented
- [ ] Domain configured and SSL enabled
- [ ] Load testing completed
- [ ] Documentation updated

For additional support, refer to the project's CLAUDE.md file for development guidelines.