// Two-second segments keep starts small and quality switches seamless. A short
// forward buffer bounds downloads while several paintings share a connection.
export const adaptiveVideoConfig = {
  autoStartLoad: false,
  startLevel: 0,
  testBandwidth: false,
  maxBufferLength: 4,
  maxMaxBufferLength: 6,
  maxBufferSize: 2 * 1024 * 1024,
  backBufferLength: 4,
  capLevelToPlayerSize: true,
  maxDevicePixelRatio: 1.75,
  abrEwmaDefaultEstimate: 500_000,
  enableWorker: true,
};
