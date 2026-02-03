require('dotenv').config({ path: '.env.local' });

module.exports = {
  apps: [{
    name: 'mission-control',
    cwd: '/home/ubuntu/clawd/mission-control-ui',
    script: 'npm',
    args: 'start',
    env: {
      PORT: 3456,
      NODE_ENV: 'production',
      MISSION_CONTROL_PASSWORD: process.env.MISSION_CONTROL_PASSWORD,
      AUTH_SECRET: process.env.AUTH_SECRET,
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
      CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY,
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
      NEXT_PUBLIC_CONVEX_SITE_URL: process.env.NEXT_PUBLIC_CONVEX_SITE_URL
    }
  }]
};
