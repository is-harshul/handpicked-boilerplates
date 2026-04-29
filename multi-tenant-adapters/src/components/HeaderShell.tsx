import type { ReactNode } from 'react';

/**
 * Shared chrome that EVERY tenant header reuses. Tenants only supply
 * what differs (logo, links, action buttons) — they don't re-implement
 * scroll behavior, layout, or accessibility primitives.
 *
 * This is the contract: shared = layout/behavior, adapter = brand/copy.
 */
type Props = {
  logo: ReactNode;
  links: ReactNode;
  actions: ReactNode;
};

export default function HeaderShell({ logo, links, actions }: Props) {
  return (
    <header className="app-header" role="banner">
      <div className="app-header__logo">{logo}</div>
      <nav className="app-header__links" aria-label="Primary">
        {links}
      </nav>
      <div className="app-header__actions">{actions}</div>
    </header>
  );
}
