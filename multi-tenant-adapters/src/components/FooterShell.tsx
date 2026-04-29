import type { ReactNode } from 'react';

type Props = {
  copyright: string;
  links: ReactNode;
  disclosures?: ReactNode;
};

export default function FooterShell({ copyright, links, disclosures }: Props) {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="app-footer__links">{links}</div>
      {disclosures && <div className="app-footer__disclosures">{disclosures}</div>}
      <small className="app-footer__copy">{copyright}</small>
    </footer>
  );
}
