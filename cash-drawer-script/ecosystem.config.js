/**
 * PM2 - Script de caja monedera (PC de caja Windows)
 * Ejecutar: pm2 start ecosystem.config.js
 * Guardar: pm2 save
 * Inicio con Windows: pm2 startup
 *
 * IMPORTANTE: Este script mantiene el puerto serial ABIERTO.
 * Solo debe haber UNA instancia (instances: 1).
 * kill_timeout alto para permitir cierre graceful del puerto.
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
    max_restarts: 50,
    restart_delay: 3000,
    max_memory_restart: '100M',
    kill_timeout: 5000,       // 5s para cerrar puerto serial gracefully
    listen_timeout: 10000,
    shutdown_with_message: true,

    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',

    env: {
      NODE_ENV: 'production'
    }
  }]
};
