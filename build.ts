await Bun.build({
  entrypoints: [
    './src/background/background.ts',
    './src/content/content.ts',
    './src/popup/index.tsx',
  ],
  outdir: './dist/src',
  target: 'browser',
  minify: true,
	external: ['@tensorflow/tfjs', 'nsfwjs'],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
	alias: {
		'react': 'preact/compat',
		'react-dom': 'preact/compat',
		'react-dom/client': 'preact/compat/client',
	},
})

await Bun.write(
	'./dist/vendor/tf.min.js',
	Bun.file('./node_modules/@tensorflow/tfjs/dist/tf.min.js'))
await Bun.write(
	'./dist/vendor/nsfwjs.min.js',
	Bun.file('./node_modules/nsfwjs/dist/browser/nsfwjs.min.js'))
await Bun.write(
	'./dist/src/popup/popup.html',
	Bun.file('./src/popup/popup.html'))
