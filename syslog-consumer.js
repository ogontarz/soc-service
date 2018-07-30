var net = require("net");
var JsonSerializer = require("./json-serializer");

const PromiseSocket = require("promise-socket");
const LOG_INFO = 6;

const { Queue, QueueConsumer } = require("./queue"); // eslint-disable-line no-unused-vars

class SyslogConsumer extends QueueConsumer {

    constructor(host, port) {
        super();
        this._processPid = "[" + process.pid + "]:";
        this._host = host;
        this._port = port;
    }

    buildmsg(msg) {
        msg = msg.trim();
        const severity = LOG_INFO;
        const facility = 1;

        var pri = "<" + (facility * 8 + severity) + ">"; // Message priority
        var entry = pri + [new Date().toJSON(), "myhost " + this._processPid].join(" ");
        return entry + " " + msg + "\n";
    }

    async consume(buffer) {
        let message = "";

        for (let index = 0; index < buffer.length; index++) {
            message += this.buildmsg(JsonSerializer.serialize(buffer[index]));
        }

        let socket = new net.Socket();
        let promiseSocket = new PromiseSocket(this._socket);
        socket.setNoDelay(true);
        try {
            await promiseSocket.connect(this._port, this._host);
            await promiseSocket.write(message);
            socket.end();
        } catch (e) {
            console.log(e);
        }
    }
}

module.exports = SyslogConsumer;