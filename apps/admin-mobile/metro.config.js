// Metro config for the admin-mobile Expo app inside a pnpm monorepo.
//
// Two non-default things this file does:
//   1. Tells Metro to watch the entire monorepo (not just this app), so
//      changes in `packages/shared` hot-reload here.
//   2. Tells Metro to resolve modules from BOTH this app's node_modules and
//      the workspace root's, so pnpm-hoisted deps are found.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// pnpm uses symlinks under node_modules/.pnpm; Metro must follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: './global.css' });
