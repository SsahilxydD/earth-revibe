// Keep react-native-worklets installed so babel-preset-expo's auto-loaded
// `react-native-worklets/plugin` resolves at bundle time, but disable RN
// native autolinking for it. With reanimated 3.16 (no NativeWorkletsModuleSpecJSI
// codegen) the previous duplicate-symbol NDK conflict is gone, but we still
// don't want the worklets TurboModule registering at runtime since we don't
// actually use any worklet bodies anywhere.
module.exports = {
  dependencies: {
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
