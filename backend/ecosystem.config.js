/**
 * PM2 ecosystem — API + dedicated Copilot worker.
 * Usage: pm2 startOrReload ecosystem.config.js --env production
 * Ensure COPILOT_RUN_WORKERS=false on the API when the worker process is used.
 */
module.exports = {
  apps: [
    {
      name: 'realestate-backend',
      script: './src/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      kill_timeout: 8000,
      env: {
        NODE_ENV: 'production',
        COPILOT_RUN_WORKERS: 'false',
      },
      error_file: './logs/pm2-backend-error.log',
      out_file: './logs/pm2-backend-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'realestate-copilot-worker',
      script: './src/copilot/worker.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      kill_timeout: 15000,
      env: {
        NODE_ENV: 'production',
        COPILOT_RUN_WORKERS: 'true',
        COPILOT_USE_BULLMQ: 'true',
      },
      error_file: './logs/pm2-copilot-worker-error.log',
      out_file: './logs/pm2-copilot-worker-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
