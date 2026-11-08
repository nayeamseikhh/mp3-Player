// React logs this informational prompt on every development renderer startup.
// Keep other console.info output visible while silencing only that one message.
(() => {
  const originalInfo = console.info.bind(console);
  console.info = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Download the React DevTools for a better development experience')
    ) {
      return;
    }
    originalInfo(...args);
  };
})();
