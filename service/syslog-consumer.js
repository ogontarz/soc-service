const net = require('net');
const PromiseSocket = require('promise-socket');

const JsonSerializer = require('../utils/serializer.js');
const QueueConsumer = require('./queue-consumer.js');
const config = require('../config.js');

const LOG_INFO = 6;

class SyslogConsumer extends QueueConsumer {
  constructor(host, port) {
    super();
    this.processPid = `[${process.pid}]:`;
    this.host = host;
    this.port = port;
  }

  buildmsg(msg) {
    const severity = LOG_INFO;
    const facility = 1;
    const priority = facility * 8 + severity; // message priority
    return `<${priority}> ${new Date().toJSON()}, host, ${this.processPid} ${msg.trim()}\n`;
  }

  async consume(buffer) {
    let message = '';

    for (let index = 0; index < buffer.length; index += 1) {
      message += this.buildmsg(JsonSerializer.canonicalize(buffer[index]));
    }

    const socket = new net.Socket();
    const promiseSocket = new PromiseSocket(socket);
    socket.setNoDelay(true);

    if (config.app.debug) console.log('Flushing event queue to syslog service');
    try {
      await promiseSocket.connect(this.port, this.host);
      await promiseSocket.write(message);
      socket.end();
      await promiseSocket.end();
      socket.destroy();
      await promiseSocket.destroy();
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = SyslogConsumer;
