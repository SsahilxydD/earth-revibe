// react-native-worklets is installed as a direct dep so babel-preset-expo
// (SDK 53) can resolve `react-native-worklets/plugin` at bundle time. We do
// NOT want its native code linked, though — it codegens the same
// NativeWorkletsModuleSpecJSI TurboModule that react-native-reanimated@3.17
// already provides, and the C++ NDK build dies on the duplicate definition.
// Setting platforms to null disables RN's native autolinking for this
// package on both platforms; the JS / babel side is unaffected.
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
