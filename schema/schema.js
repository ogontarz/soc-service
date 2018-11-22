const Ajv = require('ajv');
const RedisClient = require('./redis-client');
const config = require('../config.js');

class Schema {
  constructor() {
    this.redisClient = new RedisClient();
    this.ajv = new Ajv({ verbose: true });
    this.get();
  }

  isEmpty() {
    return this.schema === {};
  }

  get() {
    this.redisClient.getSchema((result) => {
      if (config.app.debug) console.log(JSON.stringify(result, undefined, 2));
      this.schema = result;
      this.validator = this.ajv.compile(result);
    });
  }

  set(schema) {
    this.redisClient.setSchema(schema);
    this.validator = this.ajv.compile(schema);
  }

  validate(json) {
    return this.validator(json);
  }
}

module.exports = Schema;
