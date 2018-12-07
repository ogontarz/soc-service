const ElasticConsumer = require('./elastic-consumer.js');
const Queue = require('./queue');
const config = require('../config.js');

class ElasticClient {
  constructor() {
    if (config.elastic.use) {
      this.elasticConsumer = new ElasticConsumer(config.elastic.host, config.elastic.port);
      this.elasticQueue = new Queue(config.queue.number, config.queue.size);
      this.elasticQueue.registerConsumer(this.elasticConsumer);
    }
  }

  post(json) {
    if (config.elastic.use) {
      this.elasticQueue.addToQueue(json);
    }
  }
}

module.exports = ElasticClient;
