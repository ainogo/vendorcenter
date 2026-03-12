import { motion } from "framer-motion";
import { Search, CalendarCheck, Star, MapPin } from "lucide-react";

const steps = [
  {
    icon: <MapPin className="w-6 h-6" />,
    title: "Set Location",
    description: "Allow GPS or enter your area to find nearby vendors",
    color: "bg-vendor/10 text-vendor",
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: "Choose Service",
    description: "Browse categories and compare vendors by rating & price",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: <CalendarCheck className="w-6 h-6" />,
    title: "Book & Confirm",
    description: "Select time slot, confirm booking, and get instant updates",
    color: "bg-success/10 text-success",
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: "Rate & Review",
    description: "Share your experience and help others find great vendors",
    color: "bg-warning/10 text-warning",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Get your service done in 4 simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative text-center p-6"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
              )}

              <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-4`}>
                {step.icon}
              </div>

              <div className="text-xs font-bold text-muted-foreground mb-1">STEP {index + 1}</div>
              <h3 className="font-display font-semibold text-base mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
