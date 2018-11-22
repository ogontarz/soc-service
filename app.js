require('log-timestamp');

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const config = require('./config.js');
const Utils = require('./utils/utils.js');
const Logger = require('./utils/logger.js');
const Schema = require('./schema/schema.js');

const ElasticClient = require('./service/elastic-client.js');
const SyslogClient = require('./service/syslog-client.js');

const logger = new Logger();
const schema = new Schema();
const services = [new ElasticClient(), new SyslogClient()];

const app = express();

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
  response.sendFile(path.join(__dirname, '/events.html'));
});


app.post('/events', (request, response) => {
  if (schema.isEmpty()) {
    response.statusCode = 200;
    response.json({ info: 'No schema file - event ingnored' });
    return;
  }

  const json = Utils.extractValue(request.body);
  const validated = schema.validate(json);
  logger.log(validated, json);

  if (validated) {
    response.statusCode = 200;
    response.send(json);
    services.forEach(service => service.post(json));
  } else {
    response.statusCode = 400;
    response.json({ error: 'Incorrect json format' });
  }
});


app.get('/schema', (request, response) => {
  response.statusCode = 200;
  response.json(schema.get());
});


app.get('/schema/update', (request, response) => {
  response.sendFile(path.join(__dirname, '/schema.html'));
});


app.post('/schema', (request, response) => {
  response.statusCode = 200;
  response.json(schema.get());

  const json = Utils.extractValue(request.body);
  schema.set(json);
});


app.get('/stats', (request, response) => {
  response.statusCode = 200;
  response.json(logger.getStats());
});


app.get('/stats/reset', (request, response) => {
  response.statusCode = 200;
  logger.resetStats();
  response.json(logger.getStats());
});


app.listen(config.app.port, (err) => {
  if (err) return console.log('Something bad happened', err);
  if (config.app.debug) console.log('Running in DEBUG mode');
  return console.log(`Server is listening on port ${config.app.port}`);
});
