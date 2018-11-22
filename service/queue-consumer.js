class QueueConsumer {
  constructor() {
    if (this.constructor === QueueConsumer) {
      throw new Error('QueueConsumer cannot be instantiated');
    }
  }
}

module.exports = QueueConsumer;
