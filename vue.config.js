const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  // outputDir: 'E:/MyProgram/typescript/project1/res/dist',
  configureWebpack: {
    devtool: 'source-map',
    resolve: {
      fallback: {
        fs: false,
        path: false,
        stream: false,
        crypto: false
      }
    }
  }
})
