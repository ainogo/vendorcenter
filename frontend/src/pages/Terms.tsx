import Layout from "@/components/layout/Layout";

const Terms = () => {
  return (
    <Layout>
      <section className="container py-10 md:py-14 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground leading-7 mb-6">
          By using VendorCenter, you agree to use the platform lawfully and provide accurate account and booking details.
        </p>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Platform Usage</h2>
            <p className="text-muted-foreground leading-7">
              Users must not abuse the platform, bypass security controls, or interfere with bookings,
              payments, or service operations.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Vendor Responsibility</h2>
            <p className="text-muted-foreground leading-7">
              Vendors are responsible for accurate service information, lawful conduct, and professional service delivery.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Customer Responsibility</h2>
            <p className="text-muted-foreground leading-7">
              Customers must provide correct booking details, be available for scheduled appointments,
              and follow platform payment and cancellation rules.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Service Availability</h2>
            <p className="text-muted-foreground leading-7">
              Availability, pricing, and timelines depend on vendor coverage area, service radius,
              and real-time booking conditions.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
