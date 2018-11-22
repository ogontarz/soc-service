const forever = require('forever-monitor');

const restarts = 3;

const child = new (forever.Monitor)('app.js', {
  max: restarts,
  silent: false,
});

child.on('start', () => {
  console.log('Starting service...');
});

process.on('SIGINT', () => {
  console.log('Exiting service...');
  child.stop();
  process.exit();
});

child.on('exit', () => {
  console.log(`Service has exited after ${restarts} restarts`);
});

child.start();
