// The literal __TENANT_ADAPTERS__ is rewritten at build time to
// `~/adapters/<tenant>` by string-replace-loader (webpack) and the
// matching babel plugin (jest). At runtime there is no token left.
//
// Why this indirection exists: app code imports `services/adapterServices/Header`
// — a stable path. Webpack swaps the inner import per build. The app
// never says `if (tenant === 'acme')` — that's the whole point.
//
// @ts-expect-error - token resolved at build time
import Header from '__TENANT_ADAPTERS__/Header';

export default Header;
