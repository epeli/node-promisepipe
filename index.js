'use strict';

class StreamError extends Error {
  constructor(err, source) {
    const message = err && err.message || err;
    super(message);
    this.source = source;
    this.originalError = err;
  }
}

const allEvents = ['error', 'end', 'close', 'finish'];
const writableEvents = ['error', 'close', 'finish'];
const readableEvents = ['error', 'end', 'close'];

function cleanupEventHandlers(stream, listener) {
  allEvents.map(e => stream.removeListener(e, listener));
}

function streamPromise(stream) {
  if (stream === process.stdout || stream === process.stderr) {
    return Promise.resolve(stream);
  }

  // see https://github.com/epeli/node-promisepipe/issues/2
  // and https://github.com/epeli/node-promisepipe/issues/15
  const events = stream.readable || typeof stream._read === 'function' ? readableEvents : writableEvents;

  function on(evt) {
    function executor(resolve, reject) {
      const fn = evt === 'error' ?
        err => reject(new StreamError(err, stream)) :
        () => {
          cleanupEventHandlers(stream, fn);
          resolve(stream);
        };
      stream.on(evt, fn);
    }

    return new Promise(executor);
  }

  return Promise.race(events.map(on));
}

function promisePipe(...streams) {
  streams.reduce((current, next) => current.pipe(next));
  return Promise.all(streams.map(streamPromise));
}

module.exports = Object.assign(promisePipe, {
  __esModule: true,
  default: promisePipe,
  justPromise: streams => Promise.all(streams.map(streamPromise)),
  StreamError,
});
