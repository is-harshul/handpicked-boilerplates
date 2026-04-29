import type { ReactNode } from 'react';
import Header from '~/services/adapterServices/Header';
import Footer from '~/services/adapterServices/Footer';
import constants from '~/services/adapterServices/constants';
import featureFlags from '~/services/adapterServices/featureFlags';

/**
 * App-shell layout. Note what's NOT here:
 *   - no `if (tenant === ...)` branches
 *   - no `import` from a specific adapter folder
 *   - no flag for which build this is
 *
 * App code talks to stable facade paths. The Header/Footer/constants
 * resolve to a different tenant per build via the token rewrite.
 */
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div data-brand={constants.brandName}>
      <Header />
      <main>
        {children}
        {featureFlags.enableAutoSip() && <AutoSipPromo />}
      </main>
      <Footer />
    </div>
  );
}

function AutoSipPromo() {
  return <aside>New: Auto-SIP available.</aside>;
}
