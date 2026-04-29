/* eslint-disable */
// Minimal webpack config showing the ONE rule that powers the whole
// architecture: rewrite the literal __TENANT_ADAPTERS__ in adapter
// service files to ~/adapters/<tenant>.
//
// Run with `BROKER=acme webpack` or `BROKER=globex webpack`.

const path = require('path');

module.exports = (env = {}) => {
  const tenant = (process.env.BROKER || env.BROKER || 'acme').toLowerCase();

  return {
    mode: 'production',
    entry: './src/index.ts',
    output: { path: path.resolve(__dirname, 'dist'), filename: '[name].js' },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      // The `~` alias is what every shared component import uses.
      // Tenants and shared code resolve through the same alias so
      // there's no asymmetric path handling.
      alias: { '~': path.resolve(__dirname, 'src') },
    },
    module: {
      rules: [
        { test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ },
        {
          // Apply the rewrite ONLY to the facade folder. This is
          // important: rewriting everywhere risks accidental hits in
          // unrelated files (test fixtures, docs blocks).
          test: /\.(t|j)sx?$/,
          include: [path.resolve(__dirname, 'src/services/adapterServices')],
          loader: 'string-replace-loader',
          options: {
            search: '__TENANT_ADAPTERS__',
            replace: `~/adapters/${tenant}`,
            flags: 'g',
          },
        },
      ],
    },
  };
};
