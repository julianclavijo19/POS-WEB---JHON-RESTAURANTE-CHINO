/**
 * Configuración de PM2
 * 
 * Usar con: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'print-server',
    script: 'server.js',
    cwd: 'c:\\Users\\USUARIO\\Documents\\POS-WEB---JHON-RESTAURANTE-CHINO\\print-server',

    // Configuración de instancias
    instances: 1,
    exec_mode: 'fork',

    // Auto-restart
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 1000,

    // Memoria máxima antes de restart (150MB)
    max_memory_restart: '150M',

    // Logs
    log_file: 'logs/combined.log',
    out_file: 'logs/out.log',
    error_file: 'logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,

    // Variables de entorno
    env: {
      NODE_ENV: 'production'
    },

    // Exponential backoff en caso de crashes
    exp_backoff_restart_delay: 100
  }]
};
