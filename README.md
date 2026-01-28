This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# SMTP Configuration (Gmail)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App URL (for email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Cron job secret for schedule notifications
CRON_SECRET=your-secret-key-here
```

## Schedule Notification Cron Job

To enable automatic schedule notifications, set up a cron job to call the notification endpoint:

### Using crontab (Linux/Mac)

```bash
# Run every 5 minutes
*/5 * * * * curl -X POST "http://localhost:3000/api/schedule/notifications/send" -H "Authorization: Bearer your-secret-key"
```

### Using Vercel Cron Jobs

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/schedule/notifications/send",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Using external cron services

Services like [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com/), or [Render](https://render.com) can call your endpoint periodically.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
