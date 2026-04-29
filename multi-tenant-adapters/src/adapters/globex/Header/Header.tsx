import HeaderShell from '~/components/HeaderShell';

/**
 * Globex header — same shell, different brand. Globex doesn't show a
 * "Discover" tab (regulatory choice), only Portfolio and Orders.
 */
export default function Header() {
  return (
    <HeaderShell
      logo={<span style={{ fontWeight: 800, color: '#10B981' }}>GLOBEX</span>}
      links={
        <ul>
          <li><a href="/portfolio">My Holdings</a></li>
          <li><a href="/orders">Orders</a></li>
        </ul>
      }
      actions={
        <>
          <a href="/login">Sign in</a>
          <a href="/signup" className="btn-primary">Open account</a>
        </>
      }
    />
  );
}
