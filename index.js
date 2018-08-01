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
    console.log("Elasticsearch server configuraion ok");
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
    console.log("Syslog server configuration ok");
}


const app = express();

// get port value from command line argument
const args = process.argv.slice(2);
const port = args[0] || 3000;


let schema = require("./schema.json")
let ajv = new Ajv({ verbose: true });
let validate = ajv.compile(schema);


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


app.get("/", (request, response) => {
    var html = '<html><head><meta charset="utf-8"><title>SOC microservice</title></head><body>';
    html += '<form action="/events" method="post"><textarea style="height:600px;width:800px" name="value" value=""></textarea>';
    html += '<p><input type="submit" value="POST"></p></form></body></html>';
    response.send(html);
});


app.post("/events", (req, res) => {
    let json = req.body; 
    
    // if event comes from html form, extract textarea input
    if (json.hasOwnProperty("value")) {
        json = JSON.parse(json.value);
    }

    let isValid = validate(json);
    if (isValid) {
        res.statusCode = 200;
        res.send("OK");  
        //let hmac = signer.sign(req.body, "secret");

        if (useElastic) {
            elasticQueue.addToQueue(json);
        }
        if (useSyslog) {
            syslogQueue.addToQueue(json);
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
        return console.log("Something bad happened", err);
    }
    console.log("Server is listening on port " + port);
});
