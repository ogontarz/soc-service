const config = require('../config.js');

class Stats {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalEvents = 0;
    this.validEvents = 0;
  }

  update(valid) {
    this.totalEvents += 1;
    if (valid) this.validEvents += 1;
  }

  get() {
    return {
      'Total Events': this.totalEvents,
      'Valid Events': this.validEvents,
      'Non-valid Events': this.totalEvents - this.validEvents,
    };
  }
}


class Logger {
  constructor() {
    this.stats = new Stats();
  }

  log(valid, event) {
    this.stats.update(valid);
    if (config.app.debug) {
      if (valid) {
        console.log(`Received new SUCCESSFULLY VALIDATED event, total events: ${this.stats.totalEvents}`);
      } else {
        console.log(`Received NOT VALID event, ignored, total events: ${this.stats.totalEvents} \n${JSON.stringify(event, undefined, 2)}`);
      }
    }
  }

  resetStats() {
    this.stats.reset();
  }

  getStats() {
    return this.stats.get();
  }
}

module.exports = Logger;
