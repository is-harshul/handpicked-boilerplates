import FooterShell from '~/components/FooterShell';

export default function Footer() {
  return (
    <FooterShell
      copyright="© Acme Invest Ltd."
      links={
        <>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/legal/terms">Terms</a>
        </>
      }
      disclosures={
        <p>
          Acme Invest is a SEBI-registered investment adviser
          (INA00000XXXX). Investments are subject to market risk.
        </p>
      }
    />
  );
}
