const env = process.env.NODE_ENV || 'dev'; // 'dev' or 'prod'

const dev = {
  app: {
    port: parseInt(process.env.DEV_APP_PORT, 10) || 3000,
    debug: true,
  },
  queue: {
    number: process.env.DEV_QUEUE_NUMBER || 20,
    size: process.env.DEV_QUEUE_SIZE || 2000,
  },
  redis: {
    host: process.env.DEV_REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.DEV_REDIS_PORT, 10) || 6379,
  },
  syslog: {
    use: process.env.DEV_SYSLOG_USE || true,
    host: process.env.DEV_SYSLOG_HOST || 'localhost',
    port: parseInt(process.env.DEV_SYSLOG_PORT, 10) || 514,
  },
  elastic: {
    use: process.env.DEV_ELASTIC_USE || true,
    host: process.env.DEV_ELASTIC_HOST || 'localhost',
    port: parseInt(process.env.DEV_ELASTIC_PORT, 10) || 9200,
  },
};

const prod = {
  app: {
    port: parseInt(process.env.TEST_APP_PORT, 10) || 3000,
    debug: false,
  },
  queue: {
    number: process.env.TEST_QUEUE_NUMBER || 20,
    size: process.env.TEST_QUEUE_SIZE || 2000,
  },
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT, 10) || 6379,
  },
  syslog: {
    use: process.env.TEST_SYSLOG_USE || false,
    host: process.env.TEST_SYSLOG_HOST || 'localhost',
    port: parseInt(process.env.TEST_SYSLOG_PORT, 10) || 514,
  },
  elastic: {
    use: process.env.TEST_ELASTIC_USE || false,
    host: process.env.TEST_ELASTIC_HOST || 'localhost',
    port: parseInt(process.env.TEST_ELASTIC_PORT, 10) || 9200,
  },
};

const config = {
  dev,
  prod,
};

module.exports = config[env];
