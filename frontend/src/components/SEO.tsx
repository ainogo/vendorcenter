import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  noindex?: boolean;
}

const SITE = "https://vendorcenter.in";
const DEFAULT_TITLE = "VendorCenter — Find Trusted Local Services Near You";
const DEFAULT_DESC = "India's trusted marketplace for local services. Connect, hire, and support verified vendors near you.";

export default function SEO({ title, description, path = "/", noindex }: SEOProps) {
  const fullTitle = title ? `${title} — VendorCenter` : DEFAULT_TITLE;
  const desc = description || DEFAULT_DESC;
  const url = `${SITE}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
    </Helmet>
  );
}
