const redis = require('redis');
const config = require('../config.js');

const SCHEMA_KEY = 'schema';

class RedisClient {
  constructor() {
    this.redis = redis.createClient(config.redis.port, config.redis.host);
    this.redis.on('error', err => console.log(`Error ${err}`));
    console.log(`Redis connected on ${config.redis.host}:${config.redis.port}`);
  }

  getSchema(callback) {
    this.redis.get(SCHEMA_KEY, (err, reply) => {
      if (reply) {
        console.log('Schema successfully read form redis');
        callback(JSON.parse(reply));
      } else {
        console.log('No schema file in redis - schema file is empty');
        callback(JSON.parse({}));
      }
    });
  }


  setSchema(schema) {
    this.redis.set(SCHEMA_KEY, JSON.stringify(schema));
    console.log('New schema posted - schema updated in redis');
  }
}

module.exports = RedisClient;
