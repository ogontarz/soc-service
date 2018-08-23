const elasticMod = require("elasticsearch");

const { Queue, QueueConsumer } = require("./queue"); // eslint-disable-line no-unused-vars

class ElasticConsumer extends QueueConsumer {

    constructor(host, port) {
        super();
        this._indexName = "events";
        this._typeName = "_doc";
        this._elasticClient = new elasticMod.Client({
            host: host + ":" + port,
            log: "info"
        });
    }

    consume(buffer) {
        let today = new Date();
        let index = today.toISOString().substring(0, 10);

        let elasticData = [];

        for (let i = 0; i < buffer.length; i++) {
            elasticData.push({
                index: {
                    _index: index,
                    _type: this._typeName
                }
            }, buffer[i]);
        }
        return this._elasticClient.bulk({
            body: elasticData
        });
    }
}

module.exports = ElasticConsumer;