const STANDARD_FLUSH_TIME = 5; // standard flushing time 5 seconds

class QueueConsumer {
    constructor() {
        if (this.constructor === QueueConsumer)
            throw new Error("QueueBufferConsumer cannot be instantiated");
    }

    consume(buffer) {
        return Promise.resolve();
    }
}

class Queue {
    constructor(buffersNumber, bufferMaxSize, bufferFlushSeconds) {
        this._bufferFlushSeconds = STANDARD_FLUSH_TIME;
        if (bufferFlushSeconds !== undefined)
            this._bufferFlushSeconds = bufferFlushSeconds;

        setInterval(this._bufferTimeFlush.bind(this), 1000);

        this._consumers = [];

        this._buffersNumber = buffersNumber;
        this._bufferMaxSize = bufferMaxSize;
        this._observers = [];
        this._totalDataIngested = 0;

        this._flushInProgress = new Array(buffersNumber);
        this._flushLastTime = new Array(buffersNumber);
        this._buffer = new Array(buffersNumber);
        this._bufferCurrentSize = new Array(buffersNumber);

        for (let index = 0; index < buffersNumber; index++) {
            this._buffer[index] = [];
            this._flushInProgress[index] = false;
            this._bufferCurrentSize[index] = 0;
            this._flushLastTime[index] = process.hrtime()[0];
        }
    }

    _registerBufferObserver() {
        return new Promise(resolve => {
            this._observers.push(resolve);
        });
    }

    _startBufferFlush(bufferNumber) {
        this._flushInProgress[bufferNumber] = true;
        this._flushLastTime[bufferNumber] = process.hrtime()[0];

        let promises = this._consumers.map(consumer =>
            consumer.consume(this._buffer[bufferNumber])
        );

        Promise.all(promises)
            .then(() => {
                this._endBufferFlush(bufferNumber);
            })
            .catch(error => {
                this._endBufferFlush(bufferNumber);
                console.log("consumer error:" + error);
            });
    }

    _endBufferFlush(bufferNumber) {
        // executed on resolved bulk transfer promise
        // finished transfer - so that BUFFER_LEN of awaiting observers could be notified
        this._totalDataIngested += this._bufferCurrentSize[bufferNumber];
        //console.log("TOTAL:" + this._totalDataIngested + " buffer:" + bufferNumber);
        this._buffer[bufferNumber] = [];
        this._bufferCurrentSize[bufferNumber] = 0;
        this._flushInProgress[bufferNumber] = false;

        // complete buffer is empty, so that we can notify up to BUFFER_LEN observers
        //console.log(this._observers.length);
        let toNotify = Math.min(this._observers.length, this._bufferMaxSize);
        while (toNotify--) process.nextTick(this._observers.shift());
    }

    _findBufferWithEmptySpace() {
        for (let index = 0; index < this._buffersNumber; index++)
            if (!this._flushInProgress[index]) return index;
        throw new Error(
            "internal error - no buffers with empty space - sth wrong with internal queue synchronization"
        );
    }

    _areAllBuffersFlushing() {
        for (let index = 0; index < this._buffersNumber; index++)
            if (!this._flushInProgress[index]) return false;
        return true;
    }

    _bufferTimeFlush() {
        let maxSeconds = process.hrtime()[0] - this._bufferFlushSeconds;
        for (let index = 0; index < this._buffersNumber; index++) {
            // if buffer contains data and defined time elapsed initiate buffer flush
            if (
                this._bufferCurrentSize[index] > 0 &&
                !this._flushInProgress[index] &&
                this._flushLastTime[index] <= maxSeconds
            ) {
                //console.log("flushing buffer:" + index);
                this._startBufferFlush(index);
            }
        }
    }

    registerConsumer(consumer) {
        if (!(consumer instanceof QueueConsumer))
            throw Error("consumer must be instance of QueueBufferConsumer");
        this._consumers.push(consumer);
    }

    async _addToQueueInternal(json) {
        try {
            // all buffers are full and flushing data -> need to wait
            if (this._areAllBuffersFlushing()) await this._registerBufferObserver();

            // finding buffer with empty space
            let bufferNumber = this._findBufferWithEmptySpace();
            this._buffer[bufferNumber].push(json);
            this._bufferCurrentSize[bufferNumber]++;

            // DEBUG - just check for unexpected state
            if (this._bufferCurrentSize[bufferNumber] > this._bufferMaxSize) {
                console.log("sth wrong");
                process.exit(0);
            }

            // buffer is full
            if (this._bufferCurrentSize[bufferNumber] === this._bufferMaxSize)
                this._startBufferFlush(bufferNumber);
        } catch (error) {
            console.log(error);
            // throw Error(error);
        }
    }

    addToQueue(json) {
        if (this._consumer === null)
            throw new Error("consumer not registered - use registerConsumer");

        try {
            this._addToQueueInternal(json);
        } catch (error) {
            //    console.log(error);
        }
    }
}

/* this function will block if buffer is full */

// dodajemy kolejnych obserwatorów, co z przypadkiem,
// gdy będzie ich więcej niż całkowitego miejsca w buforze ?
// przełączyć się na kolejny bufor ????

// logika rejestrowania obserwatorów

/*
  po rejestracji czekają na resolvację promisy,
  następnie obsługa następuje według standardowych reguł,
  czyli zdarzenia dodawane są do kolejnych przełącznych buforów

  w momencie zakonczenia obsługi danego bufora - następuje notyfikacja kolejnych oczekujących

*/

module.exports = {
    Queue,
    QueueConsumer
};