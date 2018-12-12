const redis = require('redis');
const config = require('../config.js');

const SCHEMA_KEY = 'schema';

class RedisClient {
  constructor() {
    this.redis = redis.createClient(config.redis.port, config.redis.host);
    this.redis.on('error', err => console.log(`Error ${err}`));
    console.log(`${process.env.INSTANCE_ID} Redis connected on ${config.redis.host}:${config.redis.port}`);
  }

  getSchema(callback) {
    this.redis.get(SCHEMA_KEY, (err, reply) => {
      if (reply) {
        console.log(`${process.env.INSTANCE_ID} Schema successfully read form redis`);
        callback(JSON.parse(reply));
      } else {
        console.log(`${process.env.INSTANCE_ID} No schema file in redis - schema file is empty`);
        callback(undefined);
      }
    });
  }


  setSchema(schema) {
    this.redis.set(SCHEMA_KEY, JSON.stringify(schema));
    console.log(`${process.env.INSTANCE_ID} New schema posted - schema updated in redis`);
  }
}

module.exports = RedisClient;
