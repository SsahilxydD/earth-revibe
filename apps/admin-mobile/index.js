// Custom JS entry. The only reason this exists is to install a Hermes
// polyfill before expo-router/entry runs anything else.
//
// Hermes doesn't expose `SharedArrayBuffer` by default. react-native-worklets
// (and a few transitive Expo deps) reference SharedArrayBuffer at module-load
// time. Without a polyfill the JS runtime crashes with
//   ReferenceError: Property 'SharedArrayBuffer' doesn't exist
// before any React tree is even mounted.
//
// We don't use cross-thread SharedArrayBuffer features ourselves (no
// worklet bodies in this app), so falling back to plain ArrayBuffer is
// safe — code paths that exist purely to construct one work fine; code
// paths that try to share memory across threads silently degrade to
// per-thread copies, which we never hit.
if (typeof globalThis.SharedArrayBuffer === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.SharedArrayBuffer = ArrayBuffer;
}

// Hand off to expo-router's standard entry, which loads app/_layout.tsx.
require('expo-router/entry');
