const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      include: [
        /node_modules/,
        /src\/product\/.+\.js$/,
      ],
    },
  },
});
