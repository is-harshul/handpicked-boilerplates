import FooterShell from '~/components/FooterShell';

export default function Footer() {
  return (
    <FooterShell
      copyright="© Globex Securities Pvt Ltd."
      links={
        <>
          <a href="/help">Help center</a>
          <a href="/legal/privacy">Privacy</a>
        </>
      }
      // Globex doesn't show advisory disclosures because they're a
      // pure broker, not an adviser. Tenant-specific compliance copy
      // is the most common reason a shared component isn't truly shared.
    />
  );
}
