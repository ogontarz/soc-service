const Ajv = require('ajv');
const RedisClient = require('./redis.js');
const config = require('../config.js');

class Schema {
  constructor() {
    this.redisClient = new RedisClient();
    this.ajv = new Ajv({ verbose: true });
    this.redisClient.getSchema((result) => {
      this.schema = result;
      if (!this.isEmpty()) {
        if (config.app.debug) console.log(JSON.stringify(result, undefined, 2));
        this.validator = this.ajv.compile(result);
      }
    });
  }

  isEmpty() {
    return this.schema === undefined;
  }

  get() {
    return this.schema;
  }

  set(schema) {
    this.schema = schema;
    if (config.app.debug) console.log(JSON.stringify(schema, undefined, 2));
    this.redisClient.setSchema(schema);
    this.validator = this.ajv.compile(schema);
  }

  validate(json) {
    return this.validator(json);
  }
}

module.exports = Schema;
