const env = process.env.NODE_ENV || 'dev'; // 'dev' or 'prod'

const dev = {
  app: {
    port: 3000,
    debug: true,
  },
  queue: {
    number: 20,
    size: 2000,
  },
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
  syslog: {
    use: false,
    host: 'localhost',
    port: 514,
  },
  elastic: {
    use: true,
    host: 'localhost',
    port: 9200,
  },
};

const prod = {
  app: {
    port: parseInt(process.env.APP_PORT, 10),
    debug: process.env.APP_DEBUG === 'true',
  },
  queue: {
    number: process.env.QUEUE_NUMBER,
    size: process.env.QUEUE_SIZE,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10),
  },
  syslog: {
    use: process.env.SYSLOG_USE === 'true',
    host: process.env.SYSLOG_HOST,
    port: parseInt(process.env.SYSLOG_PORT, 10),
  },
  elastic: {
    use: process.env.ELASTIC_USE === 'true',
    host: process.env.ELASTIC_HOST,
    port: parseInt(process.env.ELASTIC_PORT, 10),
  },
};

const config = {
  dev,
  prod,
};

module.exports = config[env];
