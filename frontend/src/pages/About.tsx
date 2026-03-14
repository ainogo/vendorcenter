import Layout from "@/components/layout/Layout";

const About = () => {
  return (
    <Layout>
      <section className="container py-10 md:py-14 max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">About VendorCenter</h1>
        <p className="text-muted-foreground leading-7 mb-6">
          VendorCenter is a local-services marketplace that helps customers discover verified vendors,
          compare options, and book with confidence. We are building a reliable service ecosystem for
          households and businesses across Maharashtra.
        </p>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">What We Do</h2>
            <p className="text-muted-foreground leading-7">
              We connect customers with service providers in categories like cleaning, electrical work,
              plumbing, salon, appliance repair, and more. Our platform supports vendor onboarding,
              location-aware discovery, booking management, and customer reviews.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Our Focus</h2>
            <p className="text-muted-foreground leading-7">
              We focus on trust, transparency, and quality. Vendor visibility is based on relevance,
              service location, and profile completeness so customers can make better decisions.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Company Location</h2>
            <p className="text-muted-foreground leading-7">
              VendorCenter operations are based in Ratnagiri, Maharashtra, India.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
