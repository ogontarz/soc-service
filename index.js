/* jshint esversion: 6*/

const express = require("express");
const Ajv = require("ajv");
const bodyParser = require("body-parser");
//const signer = require("./signer.js");

const {Queue, QueueConsumer} = require("./queue");
const ElasticConsumer = require("./elastic-consumer");
const SyslogConsumer = require("./syslog-consumer");


let elasticQueue = new Queue(10, 200);
let syslogQueue = new Queue(30, 500);


let config = require("./config.json");

let useElastic = config.elastic.enable;
if (useElastic == undefined) {
    console.log("enable/disable connection to elasticsearch service");
    process.exit(1);
} 
if (useElastic == true) {
    if (config.elastic.ip == undefined || config.elastic.port == undefined) {
        console.log("set proper values for elastic ip and port");
        process.exit(1);
    }
    let elasticConsumer = new ElasticConsumer(config.elastic.ip, config.elastic.port); 
    elasticQueue.registerConsumer(elasticConsumer);
    console.log("elastic ok");
} 

let useSyslog = config.syslog.enable;
if (useSyslog == undefined) {
    console.log("enable/disable connection to syslog server");
    process.exit(1);
}
if (useSyslog == true) {
    if (config.syslog.ip == undefined || config.syslog.port == undefined) {
        console.log("set proper values for syslog server ip and TCP port");
        process.exit(1);
    }
    let syslogConsumer = new SyslogConsumer(config.syslog.ip, config.syslog.port);
    syslogQueue.registerConsumer(syslogConsumer);
    console.log("syslog ok");
}


const app = express();
const port = 81;


let schema = require("./schema.json")
let ajv = new Ajv({ verbose: true });
let validate = ajv.compile(schema);


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


app.get("/", (request, response) => {
    response.send("Hello from Express!");
});


app.post("/events", (req, res) => {
    let isValid = validate(req.body);
    if (isValid) {
        res.statusCode = 200;
        res.send("OK");  
        //let hmac = signer.sign(req.body, "secret");

        if (useElastic) {
            elasticQueue.addToQueue(req.body);
        }
        if (useSyslog) {
            syslogQueue.addToQueue(req.body);
        }
    } else {
        res.statusCode = 400;
        res.json({ error: "Invalid json format"});
    }
});


// app.get("/events", (request, response) => {
//     if (request.query.start) {
//         elastic.searchAfter(request.query.start).then((results) => {
//             let obj = formatResponse(results);            
//             response.json(obj);
//             //console.log(JSON.stringify(obj));
//         });
//     } else {
//         // no parameters get
//         elastic.search().then((results) => {
//             let obj = formatResponse(results);
//             response.json(obj);
//             //console.log(JSON.stringify(obj));
//         });
//     }
// });

// function formatResponse(results) {
//     let r = results.hits.hits.map((hit) => {
//         return hit._source;
//     });
//     let obj = {};
//     let key = "events";
//     obj[key] = r;
//     return obj;
// }


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


app.listen(port, (err) => {
    if (err) {
        return console.log("something bad happened", err);
    }
    console.log("server is listening on port " + port);
});
