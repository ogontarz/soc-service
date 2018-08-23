/* jshint esversion: 6*/

const express = require("express");
const Ajv = require("ajv");
const bodyParser = require("body-parser");
require('log-timestamp');


const signer = require("./signer.js");
const {Queue, QueueConsumer} = require("./queue");
const ElasticConsumer = require("./elastic-consumer");
const SyslogConsumer = require("./syslog-consumer");

let elasticQueue = new Queue(20, 2000);
let syslogQueue = new Queue(20, 2000);

let useElastic = process.env.elastic == "true";
let useSyslog = process.env.syslog == "true";


if (useElastic) {
    let elasticConsumer = new ElasticConsumer(process.env.elastic_ip, process.env.elastic_port); 
    elasticQueue.registerConsumer(elasticConsumer);
    console.log("Elasticsearch server configuraion OK on " + process.env.elastic_ip + ":" + process.env.elastic_port);
} 
if (useSyslog) {
    let syslogConsumer = new SyslogConsumer(process.env.syslog_ip, process.env.syslog_port);
    syslogQueue.registerConsumer(syslogConsumer);
    console.log("Syslog server configuration OK on " + process.env.syslog_ip + ":" + process.env.syslog_port);
}


const debug = process.env.env == "debug";
const port = process.env.port || 3000;

const app = express();


let totalRequests = 0;
let validatedRequests = 0;

let schema = require("./schema.json")
let ajv = new Ajv({ verbose: true });
let validate = ajv.compile(schema);


function jsonParseError(err, req, res, next) {
    if (err instanceof SyntaxError && err.type == 'entity.parse.failed') {
        res.status(400).send("body of request is not a JSON");
    } else if (err instanceof Error && err.type === 'entity.too.large') {
        res.status(400).send("body too large");
    } else {
        res.status(500).send();
    }
}


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json({ limit: "200000"}));
app.use(jsonParseError);


app.get("/", (request, response) => {
    var html = '<html><head><meta charset="utf-8"><title>SOC microservice</title></head><body>';
    html += '<form action="/events" method="post"><textarea style="height:600px;width:800px" name="value" value=""></textarea>';
    html += '<p><input type="submit" value="POST"></p></form></body></html>';
    response.send(html);
});


app.post("/events", (request, response) => {
    let json = request.body; 
    totalRequests++;

    if (debug) {
        console.log("Received new event, total events: " + totalRequests);
    }

    // if event comes from html form, extract textarea input
    if (json.hasOwnProperty("value")) {
        json = JSON.parse(json.value);
    }

    if (validate(json)) {
        response.statusCode = 200;
        response.send("OK");  
        
        if (debug) {
            console.log("Event validated correctly");
        }
        
        if (useElastic) {
            elasticQueue.addToQueue(json);
            if (debug) {
                console.log("Adding event to the elastic consumer queue");
            }
        }
        if (useSyslog) {
            syslogQueue.addToQueue(json);
            if (debug) {
                console.log("Adding event to the syslog consumer queue");
            }
        }

        let hmac = signer.sign(request.body, "secret");
        validatedRequests++;

    } else {
        response.statusCode = 400;
        response.json({ error: "Invalid json format"});
        
        if (debug) {
            console.log("Wrong event format, event ignored");
        }
    }
});


app.get("/schema", (request, response) => {
    response.statusCode = 200;
    response.json(schema);
});


app.post("/schema", (request, response) => {
    response.statusCode = 200;
    response.send("OK");
    schema = request.body;
    validate = ajv.compile(schema);
});


app.get("/stats", (request, response) => {
    response.statusCode = 200;
    response.json({ "Received events" : totalRequests, "Valid events" : validatedRequests });
});


app.listen(port, (err) => {
    if (err) {
        return console.log("Something bad happened", err);
    }
    console.log("Server is listening on port " + port);
});
