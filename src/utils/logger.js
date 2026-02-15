const isDevelopment = import.meta.env.DEV;

const logger = {
  debug: (...args) => { if (isDevelopment) console.log(...args); },
  info: (...args) => { if (isDevelopment) console.info(...args); },
  warn: (...args) => { console.warn(...args); },
  error: (...args) => { console.error(...args); },
  critical: (...args) => { console.error('[CRITICAL]', ...args); }
};

export default logger;
