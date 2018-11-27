const QueueConsumer = require('./queue-consumer.js');

const STANDARD_FLUSH_TIME = 5;
const START_INDEX = 0;

class Queue {
  constructor(buffersNumber, bufferMaxSize) {
    this.bufferFlushSeconds = STANDARD_FLUSH_TIME;
    this.buffersNumber = buffersNumber;
    this.bufferMaxSize = bufferMaxSize;
    this.observers = [];
    this.totalDataIngested = 0;

    setInterval(this.bufferTimeFlush.bind(this), 1000);
    this.consumers = [];

    this.flushInProgress = new Array(buffersNumber);
    this.flushLastTime = new Array(buffersNumber);
    this.buffer = new Array(buffersNumber);
    this.bufferCurrentSize = new Array(buffersNumber);

    for (let i = 0; i < buffersNumber; i++) {
      this.buffer[i] = [];
      this.flushInProgress[i] = false;
      this.bufferCurrentSize[i] = 0;
      this.flushLastTime[i] = process.hrtime()[START_INDEX];
    }
  }

  registerBufferObserver() {
    return new Promise((resolve) => {
      this.observers.push(resolve);
    });
  }

  startBufferFlush(bufferNumber) {
    this.flushInProgress[bufferNumber] = true;
    this.flushLastTime[bufferNumber] = process.hrtime()[START_INDEX];

    const promises = this.consumers.map(consumer => consumer.consume(this.buffer[bufferNumber]));

    Promise.all(promises)
      .then(() => this.endBufferFlush(bufferNumber))
      .catch((error) => {
        this.endBufferFlush(bufferNumber);
        console.log(`Consumer error: ${error}`);
      });
  }

  // executed on resolved bulk transfer promise finished transfer - so that BUFFER_LEN of awaiting
  // observers could be notified
  endBufferFlush(bufferNumber) {
    this.totalDataIngested += this.bufferCurrentSize[bufferNumber];
    // console.log("TOTAL:" + this.totalDataIngested + " buffer:" + bufferNumber);
    this.buffer[bufferNumber] = [];
    this.bufferCurrentSize[bufferNumber] = 0;
    this.flushInProgress[bufferNumber] = false;

    // buffer is empty, so that we can notify up to BUFFER_LEN observers
    // console.log(this._observers.length);
    let toNotify = Math.min(this.observers.length, this.bufferMaxSize);
    while (toNotify--) process.nextTick(this.observers.shift());
  }

  findBufferWithEmptySpace() {
    for (let i = 0; i < this.buffersNumber; i++) {
      if (!this.flushInProgress[i] && this.bufferCurrentSize[i] < this.bufferMaxSize) return i;
    }
    throw new Error('Internal error - no buffers with empty space - sth wrong with internal queue synchronization');
  }

  areAllBuffersFlushing() {
    for (let i = 0; i < this.buffersNumber; i++) {
      if (!this.flushInProgress[i]) return false;
    }
    return true;
  }

  bufferTimeFlush() {
    const maxSeconds = process.hrtime()[0] - this.bufferFlushSeconds;
    for (let i = 0; i < this.buffersNumber; i++) {
    // if buffer contains data and defined time elapsed initiate buffer flush
      if (this.bufferCurrentSize[i] > 0 && !this.flushInProgress[i] && this.flushLastTime[i] <= maxSeconds) {
        // console.log("flushing buffer:" + i);
        this.startBufferFlush(i);
      }
    }
  }

  registerConsumer(consumer) {
    if (!(consumer instanceof QueueConsumer)) throw Error('Consumer must be instance of QueueConsumer');
    this.consumers.push(consumer);
  }

  async addToQueueInternal(json) {
    try {
      // all buffers are full and flushing data -> need to wait
      if (this.areAllBuffersFlushing()) await this.registerBufferObserver();

      // finding buffer with empty space
      const bufferNumber = this.findBufferWithEmptySpace();
      this.buffer[bufferNumber].push(json);
      this.bufferCurrentSize[bufferNumber] += 1;

      // DEBUG - just check for unexpected state
      if (this.bufferCurrentSize[bufferNumber] > this.bufferMaxSize) {
        console.log('sth wrong');
        process.exit(0);
      }
      // buffer is full
      if (this.bufferCurrentSize[bufferNumber] === this.bufferMaxSize) this.startBufferFlush(bufferNumber);
    } catch (error) {
      console.log(error);
      throw Error(error);
    }
  }

  addToQueue(json) {
    if (this.consumer === null) throw new Error('Consumer not registered - use registerConsumer');
    try {
      this.addToQueueInternal(json);
    } catch (error) {
      // console.log(error);
    }
  }
}

/* this function will block if buffer is full

  dodajemy kolejnych obserwatorów, co z przypadkiem, gdy będzie ich więcej niż całkowitego miejsca
  w buforze przełączyć się na kolejny bufor ????
  logika rejestrowania obserwatorów

  po rejestracji czekają na resolvację promisy, następnie obsługa następuje według standardowych
  reguł, czyli zdarzenia dodawane są do kolejnych przełącznych buforów w momencie zakonczenia
  obsługi danego bufora - następuje notyfikacja kolejnych oczekujących
*/

module.exports = Queue;
