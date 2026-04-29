/* eslint-disable */
// Jest can't run webpack loaders. Babel needs its own equivalent of
// the string-replace step so unit tests resolve __TENANT_ADAPTERS__
// the same way the production build does.
//
// Run tests as: BROKER=acme jest   or   BROKER=globex jest
//
// Critical: keep this in sync with the webpack rule. A drift between
// the two is the #1 source of "tests pass but build is broken" bugs.

module.exports = (api) => {
  const isTest = api.env('test');

  const config = {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      ['@babel/preset-react', { runtime: 'automatic' }],
      '@babel/preset-typescript',
    ],
    plugins: [],
  };

  if (isTest) {
    const tenant = (process.env.BROKER || 'acme').toLowerCase();
    config.plugins.push([
      'search-and-replace',
      {
        rules: [
          { search: /__TENANT_ADAPTERS__/, replace: `~/adapters/${tenant}` },
        ],
      },
    ]);
  }

  return config;
};
