/**
 * PM2 - Script de caja monedera (PC de caja Windows)
 * Ejecutar: pm2 start ecosystem.config.js
 * Guardar: pm2 save
 * Inicio con Windows: pm2 startup
 */

module.exports = {
  apps: [{
    name: 'cash-drawer-script',
    script: 'index.js',
    cwd: __dirname,

    instances: 1,
    exec_mode: 'fork',

    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 2000,
    max_memory_restart: '100M',

    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,

    env: {
      NODE_ENV: 'production'
    }
  }]
};
