const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

const decisionCoreApiBaseUrl = process.env.VITE_FOREFIELD_API_BASE_URL
  || process.env.FOREFIELD_API_BASE_URL
  || '';
const forefieldRuntimeMode = process.env.VITE_FOREFIELD_RUNTIME_MODE
  || process.env.FOREFIELD_RUNTIME_MODE
  || '';

module.exports = defineConfig({
  plugins: [react()],
  define: {
    __FOREFIELD_API_BASE_URL__: JSON.stringify(decisionCoreApiBaseUrl),
    __FOREFIELD_RUNTIME_MODE__: JSON.stringify(forefieldRuntimeMode),
  },
  build: {
    commonjsOptions: {
      include: [
        /node_modules/,
        /src\/product\/.+\.js$/,
        /src\/ui\/flow\/.+\.js$/,
        /src\/runtime\/.+\.js$/,
      ],
    },
  },
});
