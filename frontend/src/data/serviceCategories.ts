/** Master list of service categories — matches vendor onboarding choices. */
export const SERVICE_CATEGORIES = [
  { key: "Cleaning", icon: "🏠", color: "hsl(25, 95%, 53%)" },
  { key: "Plumbing", icon: "🔧", color: "hsl(220, 70%, 50%)" },
  { key: "Electrical", icon: "⚡", color: "hsl(38, 92%, 50%)" },
  { key: "Salon", icon: "💅", color: "hsl(340, 82%, 52%)" },
  { key: "Painting", icon: "🎨", color: "hsl(262, 83%, 58%)" },
  { key: "Carpentry", icon: "🪚", color: "hsl(152, 69%, 40%)" },
  { key: "AC Repair", icon: "❄️", color: "hsl(200, 80%, 50%)" },
  { key: "Pest Control", icon: "🐛", color: "hsl(30, 60%, 45%)" },
  { key: "Appliance Repair", icon: "🔌", color: "hsl(0, 70%, 55%)" },
  { key: "Moving", icon: "📦", color: "hsl(45, 80%, 48%)" },
  { key: "Photography", icon: "📷", color: "hsl(280, 60%, 50%)" },
  { key: "Catering", icon: "🍽️", color: "hsl(120, 55%, 45%)" },
  { key: "Other", icon: "📋", color: "hsl(210, 15%, 55%)" },
] as const;

export type ServiceCategoryKey = (typeof SERVICE_CATEGORIES)[number]["key"];

/** Quick lookup by key */
export function getCategoryMeta(key: string) {
  return SERVICE_CATEGORIES.find((c) => c.key === key);
}
