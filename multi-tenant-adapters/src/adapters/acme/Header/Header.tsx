import HeaderShell from '~/components/HeaderShell';

/**
 * Acme's header. Provides ONLY brand-specific bits.
 * Layout/scroll/a11y come from the shared HeaderShell.
 */
export default function Header() {
  return (
    <HeaderShell
      logo={<img src="/acme-logo.svg" alt="Acme Invest" height={28} />}
      links={
        <ul>
          <li><a href="/discover">Discover</a></li>
          <li><a href="/portfolio">Portfolio</a></li>
          <li><a href="/orders">Orders</a></li>
        </ul>
      }
      actions={<button type="button">Profile</button>}
    />
  );
}
