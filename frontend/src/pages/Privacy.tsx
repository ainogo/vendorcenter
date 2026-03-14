import Layout from "@/components/layout/Layout";

const Privacy = () => {
  return (
    <Layout>
      <section className="container py-10 md:py-14 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground leading-7 mb-6">
          Your account data is personal and private. VendorCenter uses your information only to run
          core platform features such as authentication, bookings, profile management, payments, and support.
        </p>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Data We Collect</h2>
            <p className="text-muted-foreground leading-7">
              Account details (name, email, phone), profile information, booking data, and service activity.
              For vendors, this can include business profile and portfolio media uploaded by the account owner.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">How We Use Data</h2>
            <p className="text-muted-foreground leading-7">
              Data is used to authenticate users, show relevant vendors by location, process bookings,
              manage dashboards, and improve service quality. We do not sell personal data.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Account Privacy</h2>
            <p className="text-muted-foreground leading-7">
              Profile updates are performed against the currently authenticated account.
              Access tokens and refresh tokens are scoped per user role and stored in the browser for session handling.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p className="text-muted-foreground leading-7">
              For privacy-related requests, contact support@vendorcenter.in.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
