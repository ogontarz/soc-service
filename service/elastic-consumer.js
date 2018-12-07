const elasticMod = require('elasticsearch');
const QueueConsumer = require('./queue-consumer');
const config = require('../config.js');

class ElasticConsumer extends QueueConsumer {
  constructor(host, port) {
    super();
    this.indexName = 'events';
    this.typeName = '_doc';
    this.elasticClient = new elasticMod.Client({
      host: `${host}:${port}`,
      log: [{
        type: 'stdio',
        levels: ['error', 'warning'],
      }],
    });
    console.log(`${process.env.INSTANCE_ID} Elsaticsearch server configuraion OK on ${config.elastic.host}:${config.elastic.port}`);
  }

  consume(buffer) {
    const today = new Date();
    const index = today.toISOString().substring(0, 10);
    const elasticData = [];

    for (let i = 0; i < buffer.length; i += 1) {
      elasticData.push({
        index: {
          _index: index,
          _type: this.typeName,
        },
      }, buffer[i]);
    }
    return this.elasticClient.bulk({
      body: elasticData,
    });
  }
}

module.exports = ElasticConsumer;
