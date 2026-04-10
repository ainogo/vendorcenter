import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Store, MapPin, Clock, LogOut, LocateFixed, AlertTriangle, Camera, ImagePlus, X as XIcon, User, Search, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/vendor/hooks/useVendorAuth";
import { vendorApi as api } from "@/vendor/lib/vendorApi";
import { isVendorProfileComplete } from "@/vendor/lib/profileCompletion";
import { toast } from "sonner";
import { MapErrorBoundary } from "@/vendor/components/MapErrorBoundary";
import LocationPicker from "@/vendor/components/LocationPicker";
import PlaceAutocompleteInput from "@/vendor/components/PlaceAutocompleteInput";
import VendorHeader from "@/vendor/components/VendorHeader";

const SERVICE_CATEGORIES = [
  "Cleaning", "Plumbing", "Electrical", "Painting",
  "Carpentry", "Pest Control", "AC Repair", "Salon",
  "Appliance Repair", "Moving", "Photography", "Catering"
];

interface ReverseGeocodeResult {
  zone: string;
  postcode: string;
  city: string;
  state: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.suburb || a.neighbourhood || a.village || a.town || "",
      a.city || a.state_district || "",
      a.state || "",
    ].filter(Boolean);
    return {
      zone: parts.join(", ") || data.display_name || "",
      postcode: a.postcode || "",
      city: a.city || a.town || a.state_district || "",
      state: a.state || "",
    };
  } catch {
    return { zone: "", postcode: "", city: "", state: "" };
  }
}

function resolveProfileImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("/api/")) return url;
  return `/api/uploads/files/${url}`;
}

const VendorEditProfile = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fetchTimedOut, setFetchTimedOut] = useState(false);
  const [isOnboardingIncomplete, setIsOnboardingIncomplete] = useState(false);
  const [profileEdited, setProfileEdited] = useState(false);
  const [noProfile, setNoProfile] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [otherCategory, setOtherCategory] = useState("");
  const [zone, setZone] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [serviceRadius, setServiceRadius] = useState("10");
  const [workingHours, setWorkingHours] = useState("");
  const [primaryPincode, setPrimaryPincode] = useState("");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [lookingUpPincode, setLookingUpPincode] = useState(false);
  const [pincodeInfo, setPincodeInfo] = useState<{ area?: string; district?: string; state?: string; serviceable?: boolean } | null>(null);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [existingPortfolio, setExistingPortfolio] = useState<string[]>([]);
  const [newPortfolioFiles, setNewPortfolioFiles] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const { t } = useTranslation("vendor");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Load existing profile
  useEffect(() => {
    if (!user) return;

    let isActive = true;
    const timeout = window.setTimeout(() => {
      if (!isActive) return;
      setFetchTimedOut(true);
      setNoProfile(true);
      setFetching(false);
    }, 12000);

    api.getVendorProfile()
      .then((res) => {
        if (!isActive) return;
        if (res.data) {
          const p = res.data;
          setBusinessName(p.businessName || "");
          setSelectedCategories(p.serviceCategories || []);
          setZone(p.zone || "");
          setLatitude(String(p.latitude || ""));
          setLongitude(String(p.longitude || ""));
          setServiceRadius(String(p.serviceRadiusKm || 10));
          setWorkingHours(p.workingHours || "");
          setPrimaryPincode(p.primaryPincode || "");
          setProfileEdited(!!p.profileEdited);
          setExistingPortfolio(p.portfolioUrls || []);
          setIsOnboardingIncomplete(!isVendorProfileComplete(p));
        } else {
          setNoProfile(true);
        }
      })
      .catch(() => {
        if (!isActive) return;
        setNoProfile(true);
      })
      .finally(() => {
        if (!isActive) return;
        window.clearTimeout(timeout);
        setFetching(false);
      });

    // Load user profile picture
    api.getProfile()
      .then((res) => {
        if (!isActive) return;
        if (res.data?.profilePictureUrl) {
          const url = res.data.profilePictureUrl;
          setProfilePicPreview(resolveProfileImageUrl(url));
          setProfilePicUrl(url);
        }
      })
      .catch(() => {});

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) return null;

  if (fetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3 px-4">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  const setLocationAndGeocode = async (lat: number, lng: number) => {
    setLatitude(String(lat));
    setLongitude(String(lng));
    const result = await reverseGeocode(lat, lng);
    if (result.zone) setZone(result.zone);
    // Auto-fill pincode from reverse geocode and validate via India Post
    if (result.postcode && result.postcode.length === 6) {
      setPrimaryPincode(result.postcode);
      await lookupPincodeInfo(result.postcode);
    }
  };

  const lookupPincodeInfo = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeInfo(null);
      return;
    }
    setLookingUpPincode(true);
    setPincodeInfo(null);
    try {
      // Try backend India Post lookup first
      const res = await api.lookupPincode(pincode);
      if (res.data?.postOffices?.length > 0) {
        const po = res.data.postOffices[0];
        setPincodeInfo({
          area: po.Name,
          district: po.District,
          state: po.State,
          serviceable: true,
        });
        // Auto-fill zone with structured address if zone is empty or was auto-filled
        const zoneStr = [po.Name, po.District, po.State].filter(Boolean).join(", ");
        setZone(zoneStr);
      } else {
        // Fallback: direct India Post API
        const fallback = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`);
        const fbData = await fallback.json();
        if (fbData?.[0]?.Status === "Success" && fbData[0]?.PostOffice?.length > 0) {
          const po = fbData[0].PostOffice[0];
          setPincodeInfo({
            area: po.Name,
            district: po.District,
            state: po.State,
            serviceable: false,
          });
          const zoneStr = [po.Name, po.District, po.State].filter(Boolean).join(", ");
          setZone(zoneStr);
        } else {
          setPincodeInfo(null);
          toast.error("Invalid pincode — not found in India Post database");
        }
      }
    } catch {
      // Fallback: direct India Post API
      try {
        const fallback = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`);
        const fbData = await fallback.json();
        if (fbData?.[0]?.Status === "Success" && fbData[0]?.PostOffice?.length > 0) {
          const po = fbData[0].PostOffice[0];
          setPincodeInfo({
            area: po.Name,
            district: po.District,
            state: po.State,
            serviceable: false,
          });
          const zoneStr = [po.Name, po.District, po.State].filter(Boolean).join(", ");
          setZone(zoneStr);
        }
      } catch {
        // ignore fallback errors
      }
    } finally {
      setLookingUpPincode(false);
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setProfilePicPreview(localPreview);
    setUploadingPic(true);
    try {
      const result = await api.uploadFile(file);
      const updated = await api.updateProfile({ profilePictureUrl: result.url });
      const savedUrl = updated.data?.profilePictureUrl || result.url;
      setProfilePicUrl(savedUrl);
      setProfilePicPreview(resolveProfileImageUrl(savedUrl));
      toast.success(t("editProfile.profilePicUpdated", { defaultValue: "Profile picture updated!" }));
    } catch {
      setProfilePicPreview(resolveProfileImageUrl(profilePicUrl));
      toast.error(t("editProfile.profilePicFailed", { defaultValue: "Failed to upload profile picture" }));
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploadingPic(false);
    }
  };

  const handlePortfolioAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCount = existingPortfolio.length + newPortfolioFiles.length;
    const remaining = 6 - totalCount;
    const toAdd = files.slice(0, remaining).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setNewPortfolioFiles(prev => [...prev, ...toAdd]);
    e.target.value = "";
  };

  const removeExistingPortfolio = (idx: number) => {
    setExistingPortfolio(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewPortfolio = (idx: number) => {
    setNewPortfolioFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const savePortfolio = async () => {
    setSavingPortfolio(true);
    try {
      let newUrls: string[] = [];
      if (newPortfolioFiles.length > 0) {
        setUploadingPortfolio(true);
        const result = await api.uploadFiles(newPortfolioFiles.map(p => p.file));
        newUrls = result.urls;
        setUploadingPortfolio(false);
      }
      const allUrls = [...existingPortfolio, ...newUrls];
      await api.updateVendorPortfolio(allUrls);
      setExistingPortfolio(allUrls);
      setNewPortfolioFiles([]);
      toast.success(t("editProfile.portfolioUpdated", { defaultValue: "Portfolio updated!" }));
    } catch {
      toast.error(t("editProfile.portfolioFailed", { defaultValue: "Failed to update portfolio" }));
    } finally {
      setSavingPortfolio(false);
      setUploadingPortfolio(false);
    }
  };

  // No profile yet — must complete onboarding first
  if (noProfile) {
    return (
      <div className="min-h-screen bg-background">
        <VendorHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t("bookings.backToDashboard")}
          </Button>
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Store className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-800 dark:text-orange-200 text-lg">{t("editProfile.completeOnboardingFirst")}</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                    {fetchTimedOut
                      ? t("editProfile.profileTimeout")
                      : t("editProfile.needOnboarding")}
                  </p>
                  <Button
                    className="mt-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0"
                    size="sm"
                    onClick={() => navigate("/onboarding")}
                  >
                    <Store className="w-4 h-4 mr-1.5" />
                    {t("editProfile.goToOnboarding")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If already edited, show locked state
  if (profileEdited) {
    return (
      <div className="min-h-screen bg-background">
        <VendorHeader />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t("bookings.backToDashboard")}
          </Button>
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 text-lg">{t("editProfile.profileLocked")}</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    {t("editProfile.profileLockedDesc")}
                  </p>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><strong>{t("editProfile.business")}</strong> {businessName}</p>
                    <p><strong>{t("editProfile.categoriesLabel")}</strong> {selectedCategories.join(", ")}</p>
                    {primaryPincode && <p><strong>Pincode:</strong> {primaryPincode}</p>}
                    <p><strong>{t("editProfile.zone")}</strong> {zone}</p>
                    <p><strong>{t("editProfile.workingHours")}</strong> {workingHours}</p>
                    <p><strong>{t("editProfile.serviceRadius")}</strong> {serviceRadius} km</p>
                    {latitude && longitude && (
                      <p className="text-xs text-muted-foreground">GPS: {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Picture — always editable */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-indigo-500" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative">
                {profilePicPreview ? (
                  <img src={profilePicPreview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-orange-200" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center cursor-pointer shadow-md hover:opacity-90">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                </label>
              </div>
              {uploadingPic && <p className="text-xs text-muted-foreground mt-2">Uploading...</p>}
            </CardContent>
          </Card>

          {/* Portfolio Photos — always editable */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ImagePlus className="w-5 h-5 text-purple-500" />
                Portfolio Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload up to 6 photos showcasing your work.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {existingPortfolio.map((url, idx) => (
                  <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                    <img src={url.startsWith("http") ? url : `/api/uploads/files/${url}`} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingPortfolio(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {newPortfolioFiles.map((pf, idx) => (
                  <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-orange-200">
                    <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewPortfolio(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {(existingPortfolio.length + newPortfolioFiles.length) < 6 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-orange-300 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Add photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioAdd} />
                  </label>
                )}
              </div>
              {uploadingPortfolio && <p className="text-sm text-orange-500">{t("editProfile.uploadingPhotos")}</p>}
              <Button
                size="sm"
                variant="outline"
                disabled={savingPortfolio}
                onClick={savePortfolio}
                className="rounded-xl"
              >
                {savingPortfolio ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {t("editProfile.savePortfolio")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    const finalCategories = selectedCategories.includes("Other") && otherCategory.trim()
      ? [...selectedCategories.filter(c => c !== "Other"), otherCategory.trim()]
      : selectedCategories.filter(c => c !== "Other");
    if (!businessName) { toast.error("Enter your business name"); return; }
    if (finalCategories.length === 0) { toast.error("Select at least one service category"); return; }
    if (!zone) { toast.error("Enter your zone/area"); return; }

    setLoading(true);
    try {
      await api.updateVendorProfile({
        businessName,
        serviceCategories: finalCategories,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        zone,
        serviceRadiusKm: parseFloat(serviceRadius) || 10,
        workingHours,
        ...(primaryPincode && /^\d{6}$/.test(primaryPincode) ? { primaryPincode } : {}),
      });
      toast.success("Profile updated! This was your one-time edit.");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Update failed");
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
            {t("bookings.backToDashboard")}
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("editProfile.title")}</h1>
          {isOnboardingIncomplete && (
            <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
              <CardContent className="pt-4">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {t("editProfile.incompleteOnboardingWarning")}
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/onboarding")}>{t("editProfile.goToOnboarding")}</Button>
              </CardContent>
            </Card>
          )}
          <div className="flex items-center gap-2 mb-8">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <p className="text-sm text-yellow-600 font-medium">
              {t("editProfile.oneTimeWarning")}
            </p>
          </div>

          <div className="space-y-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-indigo-500" />
                  {t("editProfile.profilePicture")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative">
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-orange-200" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center cursor-pointer shadow-md hover:opacity-90">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicChange} />
                  </label>
                </div>
                {uploadingPic && <p className="text-xs text-muted-foreground mt-2">{t("editProfile.uploadingPhotos")}</p>}
              </CardContent>
            </Card>

            {/* Portfolio Photos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ImagePlus className="w-5 h-5 text-purple-500" />
                  {t("editProfile.portfolioPhotos")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("editProfile.portfolioDesc")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {existingPortfolio.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                      <img src={url.startsWith("http") ? url : `/api/uploads/files/${url}`} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingPortfolio(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {newPortfolioFiles.map((pf, idx) => (
                    <div key={`new-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border-2 border-orange-200">
                      <img src={pf.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewPortfolio(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(existingPortfolio.length + newPortfolioFiles.length) < 6 && (
                    <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-orange-300 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <ImagePlus className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Add photo</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioAdd} />
                    </label>
                  )}
                </div>
                {uploadingPortfolio && <p className="text-sm text-orange-500">{t("editProfile.uploadingPhotos")}</p>}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingPortfolio || (newPortfolioFiles.length === 0 && existingPortfolio.length === (existingPortfolio.length))}
                  onClick={savePortfolio}
                  className="rounded-xl"
                >
                  {savingPortfolio ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {t("editProfile.savePortfolio")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Store className="w-5 h-5 text-orange-500" />
                  {t("editProfile.businessDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("editProfile.businessNameLabel")}</label>
                  <Input placeholder={t("editProfile.businessNamePlaceholder")} className="h-11 rounded-xl" value={businessName} onChange={e => setBusinessName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("editProfile.serviceCategoriesLabel")}</label>
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
                      {t("editProfile.other")}
                    </button>
                  </div>
                  {selectedCategories.includes("Other") && (
                    <Input
                      placeholder={t("editProfile.customCategoryPlaceholder")}
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
                  {t("editProfile.locationTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pincode with India Post lookup */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 413512"
                      className="h-11 rounded-xl flex-1"
                      value={primaryPincode}
                      maxLength={6}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setPrimaryPincode(val);
                        setPincodeInfo(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl gap-1.5 px-4"
                      disabled={lookingUpPincode || primaryPincode.length !== 6}
                      onClick={() => lookupPincodeInfo(primaryPincode)}
                    >
                      {lookingUpPincode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Lookup
                    </Button>
                  </div>
                  {pincodeInfo && (
                    <div className={`mt-2 p-3 rounded-lg text-sm flex items-start gap-2 ${
                      pincodeInfo.serviceable
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                    }`}>
                      {pincodeInfo.serviceable
                        ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      }
                      <div>
                        <p className="font-medium">{pincodeInfo.area}</p>
                        <p className="text-muted-foreground">{pincodeInfo.district}, {pincodeInfo.state}</p>
                        {!pincodeInfo.serviceable && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            This pincode is not yet in our service zones — you can still save it.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Zone / Area — auto-filled from pincode or reverse geocode */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Zone / Area *</label>
                  <PlaceAutocompleteInput
                    value={zone}
                    onChange={setZone}
                    onSelect={(suggestion) => {
                      setZone(suggestion.display);
                      setLatitude(String(suggestion.lat));
                      setLongitude(String(suggestion.lng));
                    }}
                    placeholder={t("editProfile.zonePlaceholder")}
                    className="h-11 rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Auto-filled from pincode lookup or location detection. You can also type manually.</p>
                </div>

                {/* Map */}
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

                {/* Detect My Location */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  disabled={detectingLocation}
                  onClick={async () => {
                    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
                    setDetectingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      async (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        await setLocationAndGeocode(lat, lng);
                        toast.success("Location detected! Pincode and zone auto-filled.");
                        setDetectingLocation(false);
                      },
                      () => { toast.error("Could not detect location"); setDetectingLocation(false); }
                    );
                  }}
                >
                  {detectingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
                  {detectingLocation ? "Detecting location & pincode..." : "Detect My Location"}
                </Button>

                {/* Lat/Lng display (read-only info) */}
                {latitude && longitude && (
                  <p className="text-xs text-muted-foreground text-center">
                    GPS: {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)}
                  </p>
                )}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t("editProfile.serviceRadiusKm")}</label>
                  <Input placeholder="10" className="h-11 rounded-xl" type="number" value={serviceRadius} onChange={e => setServiceRadius(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-green-500" />
                  {t("editProfile.workingHoursLabel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder={t("editProfile.workingHoursPlaceholder")} className="h-11 rounded-xl" value={workingHours} onChange={e => setWorkingHours(e.target.value)} />
              </CardContent>
            </Card>

            <Button
              disabled={loading}
              onClick={handleSave}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 rounded-xl font-semibold text-base"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {t("editProfile.saveChanges")}
              {!loading && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorEditProfile;
