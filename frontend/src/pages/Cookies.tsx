import Layout from "@/components/layout/Layout";

const Cookies = () => {
  return (
    <Layout>
      <section className="container py-10 md:py-14 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Cookie Policy</h1>
        <p className="text-muted-foreground leading-7 mb-6">
          VendorCenter currently uses minimal cookies and relies mainly on browser local storage for session tokens.
        </p>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Functional Cookie In Use</h2>
            <p className="text-muted-foreground leading-7">
              We use a functional cookie named <strong>sidebar:state</strong> to remember UI sidebar open or collapsed state.
              It is set at path <strong>/</strong> with a max age of 7 days.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">What Is Stored Outside Cookies</h2>
            <p className="text-muted-foreground leading-7">
              Authentication data is stored in browser local storage using role-specific keys such as
              customer_accessToken, customer_refreshToken, vendor_accessToken, and vendor_refreshToken.
              These are not cookie values.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Why We Use Them</h2>
            <p className="text-muted-foreground leading-7">
              This storage is used to keep users signed in, support token refresh, and preserve interface preferences.
              It helps maintain secure and consistent sessions across page navigation.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cookies;
