require('log-timestamp');

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const config = require('./config.js');
const Utils = require('./utils/utils.js');
const Schema = require('./schema/schema.js');

const ElasticClient = require('./service/elastic-client.js');
const SyslogClient = require('./service/syslog-client.js');

const services = [new ElasticClient(), new SyslogClient()];
const schema = new Schema();

const INSTANCE = process.env.INSTANCE_ID;
const app = express();

morgan.format('format', `[:date[iso]] ${INSTANCE} ":method :url" :status - :response-time ms - :res[content-length] - :remote-addr`);
app.use(morgan('format', { stream: process.stdout }));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json({ limit: '200000' }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') res.status(400).send('body of request is not a JSON');
  else if (err instanceof Error && err.type === 'entity.too.large') res.status(400).send('body too large');
  else res.status(500).send();
  next();
});


app.get('/', (request, response) => {
  response.statusCode = 200;
  response.sendFile(path.join(__dirname, '/public/events.html'));
});


app.post('/events', (request, response) => {
  if (schema.isEmpty()) {
    response.statusCode = 200;
    response.json({});
    console.log(`${INSTANCE} No schema file posted - event ignored`);
  } else {
    const json = Utils.extractValue(request.body);
    const validated = schema.validate(json);
    if (validated) {
      response.statusCode = 200;
      response.send(json);
      services.forEach(service => service.post(json));
    } else {
      response.statusCode = 400;
      response.json({ error: 'Incorrect json event format' });
      console.log(JSON.stringify(json, undefined, 2));
    }
  }
});


app.get('/schema', (request, response) => {
  response.statusCode = 200;
  response.json(schema.get());
});


app.get('/schema/update', (request, response) => {
  response.statusCode = 200;
  response.sendFile(path.join(__dirname, '/public/schema.html'));
});


app.post('/schema', (request, response) => {
  const json = Utils.extractValue(request.body);
  schema.set(json);

  response.statusCode = 200;
  response.json(json);
});


app.listen(config.app.port, (err) => {
  if (err) return console.log(`${INSTANCE} Something bad happened`, err);
  return console.log(`${INSTANCE} Server is listening on port ${config.app.port}`);
});
