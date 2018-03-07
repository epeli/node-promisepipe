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
  return new Promise((resolve, reject) => {
    const onerror = function(err) {
      if (this !== dest) {
        this.unpipe();
      }

      reject(new StreamError(err, this));
    };
    const ondone = () => {
      for (const stream of streams) {
        stream.removeListener('error', onerror);
      }

      resolve(streams);
    };

    for (const stream of streams) {
      stream.on('error', onerror);
    }

    let i = streams.length - 1;

    // iterate back to front to find the last stream that is not stdio
    while (i > -1 && (streams[i] === process.stdout || streams[i] === process.stderr)) {
      i--;
    }

    if (i < 0) {
      // this will only happen if every stream is stdio, which users should not do anyway
      ondone();
      return;
    }

    const dest = streams[i];

    dest.once('end', ondone);
    dest.once('finish', ondone);
    dest.once('close', ondone);
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
