const Ajv = require('ajv');
const RedisClient = require('./redis.js');

class Schema {
  constructor() {
    this.redisClient = new RedisClient();
    this.ajv = new Ajv({ verbose: true });
    this.redisClient.getSchema((result) => {
      this.schema = result;
      if (!this.isEmpty()) {
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
    console.log(JSON.stringify(schema, undefined, 2));
    this.redisClient.setSchema(schema);
    this.validator = this.ajv.compile(schema);
  }

  validate(json) {
    return this.validator(json);
  }
}

module.exports = Schema;
