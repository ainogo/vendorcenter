import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Store, MapPin, Clock, LocateFixed, ImagePlus, X as XIcon, Search, CheckCircle2, AlertTriangle } from "lucide-react";
import VendorHeader from "@/vendor/components/VendorHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/vendor/hooks/useVendorAuth";
import { vendorApi as api } from "@/vendor/lib/vendorApi";
import { toast } from "sonner";
import { MapErrorBoundary } from "@/vendor/components/MapErrorBoundary";
import LocationPicker from "@/vendor/components/LocationPicker";
import PlaceAutocompleteInput from "@/vendor/components/PlaceAutocompleteInput";

const SERVICE_CATEGORIES = [
  "Cleaning", "Plumbing", "Electrical", "Painting",
  "Carpentry", "Pest Control", "AC Repair", "Salon",
  "Appliance Repair", "Moving", "Photography", "Catering"
];
const VENDOR_SIGNUP_PREFILL_KEY = "vendor_signup_prefill";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address || {};
    // Build a readable area string: suburb/neighbourhood, city, state
    const parts = [
      a.suburb || a.neighbourhood || a.village || a.town || "",
      a.city || a.state_district || "",
      a.state || "",
    ].filter(Boolean);
    return parts.join(", ") || data.display_name || "";
  } catch {
    return "";
  }
}

const VendorOnboarding = () => {
  const { t } = useTranslation("vendor");
  const { user, logout, loading: authLoading, setOnboardingStatus } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [otherCategory, setOtherCategory] = useState("");
  const [zone, setZone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [serviceRadius, setServiceRadius] = useState("10");
  const [workingHours, setWorkingHours] = useState("9:00 AM - 6:00 PM");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [portfolioFiles, setPortfolioFiles] = useState<{ file: File; preview: string }[]>([]);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [businessNameLocked, setBusinessNameLocked] = useState(false);

  // Service Coverage state
  const [primaryPincode, setPrimaryPincode] = useState("");
  const [pincodeInput, setPincodeInput] = useState("");
  const [pincodeLookup, setPincodeLookup] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [hierarchyData, setHierarchyData] = useState<any[]>([]);
  const [selectedPincodeIds, setSelectedPincodeIds] = useState<string[]>([]);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});

  // Pre-fill from signed-up account details and local signup draft.
  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (!user) return;

    let isMounted = true;

    const hydratePrefill = async () => {
      let nextBusinessName = (user.businessName || "").trim();
      let nextName = (user.name || "").trim();
      let nextPhone = (user.phone || "").trim();
      const nextEmail = (user.email || "").trim();

      try {
        const profileRes = await api.getProfile();
        const profile = profileRes.data;
        if (profile) {
          nextName = (profile.name || "").trim() || nextName;
          nextPhone = (profile.phone || "").trim() || nextPhone;
          nextBusinessName = (profile.businessName || "").trim() || nextBusinessName;
        }
      } catch {
        // Ignore profile fetch failures; user session data still gives fallback values.
      }

      try {
        const raw = localStorage.getItem(VENDOR_SIGNUP_PREFILL_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as {
            email?: string;
            name?: string;
            phone?: string;
            businessName?: string;
            serviceCategories?: string[];
            otherCategory?: string;
          };
          const draftEmail = (draft.email || "").trim().toLowerCase();
          const currentEmail = nextEmail.trim().toLowerCase();

          if (draftEmail && currentEmail && draftEmail === currentEmail) {
            nextName = nextName || (draft.name || "").trim();
            nextPhone = nextPhone || (draft.phone || "").trim();
            nextBusinessName = nextBusinessName || (draft.businessName || "").trim();

            if (Array.isArray(draft.serviceCategories)) {
              const categories = draft.serviceCategories
                .map((cat) => cat.trim())
                .filter((cat) => cat.length > 0);

              if ((draft.otherCategory || "").trim()) {
                categories.push("Other");
                setOtherCategory((draft.otherCategory || "").trim());
              }

              const unique = Array.from(new Set(categories));
              if (unique.length > 0) {
                setSelectedCategories((prev) => (prev.length > 0 ? prev : unique));
              }
            }
          }
        }
      } catch {
        // Ignore malformed local data.
      }

      if (!isMounted) return;
      setAccountName(nextName);
      setAccountPhone(nextPhone);
      setAccountEmail(nextEmail);
      setBusinessName(nextBusinessName);
      setBusinessNameLocked(!!nextBusinessName);
    };

    void hydratePrefill();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, navigate]);

  if (authLoading || !user) return null;

  const businessNameFromSignup = businessNameLocked;

  // Load hierarchy for pincode selection
  useEffect(() => {
    api.getServiceZoneHierarchy().then(res => {
      if (res.data) setHierarchyData(res.data as any[]);
    }).catch(() => {});
  }, []);

  const handlePincodeLookup = async () => {
    if (!/^\d{6}$/.test(pincodeInput)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setLookingUp(true);
    setPincodeLookup(null);
    try {
      const res = await api.checkServiceability(pincodeInput);
      if (res.data?.serviceable) {
        setPincodeLookup({ ...res.data, status: "serviceable" });
        setPrimaryPincode(pincodeInput);
      } else {
        // Try India Post to show info even if not in our zones
        try {
          const lookupRes = await api.lookupPincode(pincodeInput);
          setPincodeLookup({ ...(lookupRes.data || {}), status: "not_serviceable" });
        } catch {
          setPincodeLookup({ status: "not_serviceable", pincode: pincodeInput });
        }
      }
    } catch {
      setPincodeLookup({ status: "error" });
    } finally {
      setLookingUp(false);
    }
  };

  const togglePincodeId = (id: string) => {
    setSelectedPincodeIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : prev.length < 100 ? [...prev, id] : prev
    );
  };

  const setLocationAndGeocode = async (lat: number, lng: number) => {
    setLatitude(String(lat));
    setLongitude(String(lng));
    const address = await reverseGeocode(lat, lng);
    if (address) setZone(address);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handlePortfolioAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 6 - portfolioFiles.length;
    const toAdd = files.slice(0, remaining).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPortfolioFiles(prev => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const removePortfolioFile = (idx: number) => {
    setPortfolioFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const handleSubmit = async () => {
    const finalCategories = selectedCategories.includes("Other") && otherCategory.trim()
      ? [...selectedCategories.filter(c => c !== "Other"), otherCategory.trim()]
      : selectedCategories.filter(c => c !== "Other");
    if (!businessName) { toast.error(t("onboarding.enterBusinessName", { defaultValue: "Enter your business name" })); return; }
    if (finalCategories.length === 0) { toast.error(t("onboarding.selectCategory", { defaultValue: "Select at least one service category" })); return; }
    if (!zone) { toast.error(t("onboarding.enterZone", { defaultValue: "Enter your zone/area" })); return; }

    setLoading(true);
    try {
      // Upload portfolio photos first
      let uploadedUrls: string[] = [];
      if (portfolioFiles.length > 0) {
        setUploadingPhotos(true);
        try {
          const result = await api.uploadFiles(portfolioFiles.map(p => p.file));
          uploadedUrls = result.urls;
        } catch {
          toast.error(t("onboarding.uploadFailed", { defaultValue: "Failed to upload portfolio photos" }));
          setLoading(false);
          setUploadingPhotos(false);
          return;
        }
        setUploadingPhotos(false);
      }

      await api.submitOnboarding({
        businessName,
        serviceCategories: finalCategories,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        zone,
        serviceRadiusKm: parseFloat(serviceRadius) || 10,
        workingHours,
        portfolioUrls: uploadedUrls,
        primaryPincode: primaryPincode || undefined,
        servicePincodeIds: selectedPincodeIds.length > 0 ? selectedPincodeIds : undefined,
      });
      localStorage.removeItem(VENDOR_SIGNUP_PREFILL_KEY);
      setOnboardingStatus("complete");
      toast.success(t("onboarding.submitted", { defaultValue: "Onboarding submitted! Your profile is under review." }));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || t("onboarding.failed", { defaultValue: "Onboarding failed" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <VendorHeader />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t("onboarding.backToDashboard")}
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("onboarding.title")}</h1>
          <p className="text-muted-foreground mb-8">
            {t("onboarding.subtitle")}
          </p>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("onboarding.signupDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("onboarding.name")}</p>
                  <p className="text-sm font-medium">{accountName || t("onboarding.notProvided")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("onboarding.email", { defaultValue: "Email" })}</p>
                  <p className="text-sm font-medium break-all">{accountEmail || user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("onboarding.phone", { defaultValue: "Phone" })}</p>
                  <p className="text-sm font-medium">{accountPhone || t("onboarding.notProvided")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("onboarding.businessNameLabel", { defaultValue: "Business Name" })}</p>
                  <p className="text-sm font-medium">{businessName || t("onboarding.notProvided")}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Store className="w-5 h-5 text-orange-500" />
                  {businessNameFromSignup ? t("onboarding.serviceCategories", { defaultValue: "Service Categories" }) : t("onboarding.businessDetails", { defaultValue: "Business Details" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!businessNameFromSignup && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t("onboarding.businessNameRequired", { defaultValue: "Business Name *" })}</label>
                    <Input placeholder={t("onboarding.businessNamePlaceholder", { defaultValue: "e.g. SparkClean Services" })} className="h-11 rounded-xl" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("onboarding.serviceCategoriesRequired", { defaultValue: "Service Categories *" })}</label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          selectedCategories.includes(cat)
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-background border-border hover:border-orange-300"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => toggleCategory("Other")}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedCategories.includes("Other")
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-background border-border hover:border-orange-300"
                      }`}
                    >
                      Other
                    </button>
                  </div>
                  {selectedCategories.includes("Other") && (
                    <Input
                      placeholder={t("onboarding.customCategoryPlaceholder", { defaultValue: "Enter your custom category name" })}
                      className="h-11 rounded-xl mt-2"
                      value={otherCategory}
                      onChange={e => setOtherCategory(e.target.value)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  {t("onboarding.location", { defaultValue: "Location" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("onboarding.zoneRequired", { defaultValue: "Zone / Area *" })}</label>
                  <PlaceAutocompleteInput
                    value={zone}
                    onChange={setZone}
                    onSelect={(suggestion) => {
                      setZone(suggestion.display);
                      setLatitude(String(suggestion.lat));
                      setLongitude(String(suggestion.lng));
                    }}
                    placeholder={t("onboarding.zonePlaceholder", { defaultValue: "Type 3+ chars (e.g. South Delhi)" })}
                    className="h-11 rounded-xl"
                  />
                </div>

                {/* Map Picker */}
                <MapErrorBoundary>
                    <LocationPicker
                      latitude={parseFloat(latitude) || 0}
                      longitude={parseFloat(longitude) || 0}
                      serviceRadiusKm={parseFloat(serviceRadius) || 10}
                      onLocationChange={(lat, lng) => {
                        setLocationAndGeocode(lat, lng);
                      }}
                    />
                </MapErrorBoundary>

                {/* Detect my location button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  disabled={detectingLocation}
                  onClick={async () => {
                    if (!navigator.geolocation) { toast.error(t("onboarding.geolocationNotSupported", { defaultValue: "Geolocation not supported" })); return; }
                    setDetectingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        await setLocationAndGeocode(lat, lng);
                        toast.success(t("onboarding.locationDetected", { defaultValue: "Location detected!" }));
                        setDetectingLocation(false);
                      },
                      () => { toast.error(t("onboarding.locationFailed", { defaultValue: "Could not detect location" })); setDetectingLocation(false); }
                    );
                  }}
                >
                  {detectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                  {detectingLocation ? t("onboarding.detecting", { defaultValue: "Detecting..." }) : t("onboarding.detectMyLocation", { defaultValue: "Detect My Location" })}
                </Button>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("onboarding.serviceRadiusKm", { defaultValue: "Service Radius (km)" })}</label>
                  <Input placeholder="10" className="h-11 rounded-xl" type="number" value={serviceRadius} onChange={e => setServiceRadius(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Service Coverage — Pincode Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5 text-emerald-500" />
                  {t("onboarding.serviceCoverage", { defaultValue: "Service Coverage (Pincodes)" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.serviceCoverageDesc", { defaultValue: "Enter your primary pincode and select service areas. This helps customers find you." })}
                </p>

                {/* Pincode lookup */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-digit pincode"
                    className="h-11 rounded-xl flex-1"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={e => setPincodeInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && handlePincodeLookup()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl px-4"
                    disabled={lookingUp || pincodeInput.length !== 6}
                    onClick={handlePincodeLookup}
                  >
                    {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Lookup result */}
                {pincodeLookup && (
                  <div className={`rounded-xl border p-3 text-sm ${
                    pincodeLookup.status === "serviceable"
                      ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                      : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                  }`}>
                    {pincodeLookup.status === "serviceable" ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">Pincode {pincodeInput} is serviceable!</p>
                          {pincodeLookup.state && <p className="text-emerald-600/80 dark:text-emerald-500/80">{pincodeLookup.area} → {pincodeLookup.zone} → {pincodeLookup.state}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-amber-700 dark:text-amber-400">This pincode is not yet in our service zones.</p>
                          <p className="text-amber-600/80 dark:text-amber-500/80 mt-0.5">You can still register. We'll notify you when we expand to this area.</p>
                          {pincodeLookup.state && <p className="text-amber-600/60 text-xs mt-1">{pincodeLookup.district}, {pincodeLookup.state}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {primaryPincode && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Primary pincode:</span>
                    <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{primaryPincode}</span>
                  </div>
                )}

                {/* Hierarchy tree for selecting service pincodes */}
                {hierarchyData.length > 0 && (
                  <div className="border rounded-xl p-3 max-h-64 overflow-y-auto space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Select pincodes you serve ({selectedPincodeIds.length} selected):</p>
                    {hierarchyData.map((state: any) => (
                      <div key={state.id}>
                        <button
                          type="button"
                          className="w-full text-left text-sm font-medium py-1 px-2 hover:bg-muted/50 rounded flex items-center gap-1"
                          onClick={() => setExpandedStates(p => ({ ...p, [state.id]: !p[state.id] }))}
                        >
                          <span className="text-xs">{expandedStates[state.id] ? "▼" : "▶"}</span> {state.name}
                        </button>
                        {expandedStates[state.id] && state.zones?.map((zone: any) => (
                          <div key={zone.id} className="ml-4">
                            <button
                              type="button"
                              className="w-full text-left text-sm py-0.5 px-2 hover:bg-muted/50 rounded flex items-center gap-1"
                              onClick={() => setExpandedZones(p => ({ ...p, [zone.id]: !p[zone.id] }))}
                            >
                              <span className="text-xs">{expandedZones[zone.id] ? "▼" : "▶"}</span> {zone.name}
                            </button>
                            {expandedZones[zone.id] && zone.areas?.map((area: any) => (
                              <div key={area.id} className="ml-4">
                                <button
                                  type="button"
                                  className="w-full text-left text-xs py-0.5 px-2 hover:bg-muted/50 rounded flex items-center gap-1"
                                  onClick={() => setExpandedAreas(p => ({ ...p, [area.id]: !p[area.id] }))}
                                >
                                  <span className="text-[10px]">{expandedAreas[area.id] ? "▼" : "▶"}</span> {area.name}
                                </button>
                                {expandedAreas[area.id] && area.pincodes?.map((pin: any) => (
                                  <label key={pin.id} className="ml-4 flex items-center gap-2 py-0.5 px-2 text-xs cursor-pointer hover:bg-muted/50 rounded">
                                    <input
                                      type="checkbox"
                                      checked={selectedPincodeIds.includes(pin.id)}
                                      onChange={() => togglePincodeId(pin.id)}
                                      className="rounded border-border"
                                    />
                                    <span>{pin.pincode}</span>
                                    {!pin.is_active && <span className="text-muted-foreground">(inactive)</span>}
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-green-500" />
                  {t("onboarding.workingHours", { defaultValue: "Working Hours" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder={t("onboarding.workingHoursPlaceholder", { defaultValue: "e.g. 9:00 AM - 6:00 PM" })} className="h-11 rounded-xl" value={workingHours} onChange={e => setWorkingHours(e.target.value)} />
              </CardContent>
            </Card>

            {/* Portfolio Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImagePlus className="w-5 h-5 text-purple-500" />
                  {t("onboarding.portfolioPhotos", { defaultValue: "Portfolio Photos (optional)" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.portfolioDesc", { defaultValue: "Upload up to 6 photos showcasing your work. These will be shown on your profile." })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {portfolioFiles.map((pf, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                      <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePortfolioFile(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {portfolioFiles.length < 6 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-orange-300 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">{t("onboarding.addPhoto", { defaultValue: "Add photo" })}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioAdd} />
                    </label>
                  )}
                </div>
                {uploadingPhotos && <p className="text-sm text-orange-500">{t("onboarding.uploadingPhotos", { defaultValue: "Uploading photos..." })}</p>}
              </CardContent>
            </Card>

            <Button
              disabled={loading}
              onClick={handleSubmit}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 rounded-xl font-semibold text-base"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {t("onboarding.submitForReview", { defaultValue: "Submit for Review" })}
              {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorOnboarding;
