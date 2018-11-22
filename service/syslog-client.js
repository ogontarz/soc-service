const SyslogConsumer = require('./syslog-consumer.js');
const Queue = require('./queue');
const config = require('../config.js');

class SyslogClient {
  constructor() {
    if (config.syslog.use) {
      this.syslogQueue = new Queue(config.queue.number, config.queue.size);

      this.syslogQueue.registerConsumer(new SyslogConsumer(config.syslog.host, config.syslog.port));
      console.log(`Syslog server configuraion OK on ${config.syslog.host}:${config.syslog.port}`);
    }
  }

  post(json) {
    if (config.syslog.use) {
      this.syslogQueue.addToQueue(json);
      if (config.app.debug) console.log('Adding validated event to the syslog consumer queue');
    }
  }
}

module.exports = SyslogClient;
