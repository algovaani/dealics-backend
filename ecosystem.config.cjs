module.exports = {
  apps: [
    {
      name: 'staging-dealics-backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'staging',
        PORT: 5000,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'stagingtradeblock_new',
        DB_USER: 'root',
        DB_PASSWORD: 'RockyLinux@DB1',
        JWT_SECRET: 'my-super-secret-jwt-key-2024-dealics-backend-secure-random-string',
        FRONTEND_URL: 'https://spi.dealics.com'
      },
      error_file: './logs/staging-err.log',
      out_file: './logs/staging-out.log',
      log_file: './logs/staging-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'prod-dealics-backend',
      script: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        DB_HOST: 'localhost',
        DB_PORT: 3306,
        DB_NAME: 'stagingtradeblock_new',
        DB_USER: 'root',
        DB_PASSWORD: 'RockyLinux@DB1',
        JWT_SECRET: 'my-super-secret-jwt-key-2024-dealics-backend-secure-random-string',
        FRONTEND_URL: 'https://ppi.dealics.com'
      },
      error_file: './logs/prod-err.log',
      out_file: './logs/prod-out.log',
      log_file: './logs/prod-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
