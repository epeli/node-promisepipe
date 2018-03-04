'use strict';

class StreamError extends Error {
  constructor(err, source) {
    const message = err && err.message || err;
    super(message);
    this.source = source;
    this.originalError = err;
  }
}

// Returns a promise that is accepted when the pipe operation is done.
function streamPromise(streams) {
  // There only two events that interest us:
  // * A 'finish' event emitted by the last stream in the chain, which means
  // the chained pipe operations are done, and the last stream has been
  // flushed and ended.
  // * An 'error' event from any stream, when something goes wrong.
  const dest = streams[streams.length - 1];

  return new Promise((resolve, reject) => {
    // insert a PassThrough stream before dest to listen for finish instead?
    if (dest.autoClose === false || dest.fd === 1 || dest.fd === 2) {
      resolve(streams);
      return;
    }

    const onerror = function(err) {
      if (this !== dest) {
        this.unpipe();
      }

      reject(new StreamError(err, this));
    };

    for (const stream of streams) {
      stream.once('error', onerror);
    }

    dest.once('finish', () => {
      for (const stream of streams) {
        stream.removeListener('error', onerror);
      }

      resolve(streams);
    });
  });
}

/**
 * @param {...Stream} stream
 */
function promisePipe(stream) {
  let i = arguments.length;
  const streams = [];
  while ( i-- ) streams[i] = arguments[i];

  const allStreams = streams
    .reduce((current, next) => current.concat(next), []);
  const promise = streamPromise(streams);
  allStreams.reduce((current, next) => current.pipe(next));
  return promise;
}

module.exports = Object.assign(promisePipe, {
  __esModule: true,
  default: promisePipe,
  justPromise: streamPromise,
  StreamError,
});
