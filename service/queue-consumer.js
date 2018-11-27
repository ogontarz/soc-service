/* eslint no-unused-vars: "off" */

class QueueConsumer {
  constructor() {
    if (this.constructor === QueueConsumer) {
      throw new Error('QueueConsumer cannot be instantiated');
    }
  }

  consume(buffer) {
    return Promise.resolve();
  }
}

module.exports = QueueConsumer;
