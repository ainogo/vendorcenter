import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Plus, Trash2, Star, Loader2, ArrowLeft, Search, CheckCircle2, AlertTriangle, Home, Briefcase, MoreHorizontal } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const LABELS = ["Home", "Work", "Other"] as const;
const LABEL_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4" />,
  Work: <Briefcase className="w-4 h-4" />,
  Other: <MoreHorizontal className="w-4 h-4" />,
};

const CustomerAddresses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [label, setLabel] = useState<string>("Home");
  const [fullAddress, setFullAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Pincode lookup
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "checking" | "serviceable" | "not_serviceable">("idle");
  const [pincodeInfo, setPincodeInfo] = useState<string>("");

  const loadAddresses = async () => {
    try {
      const res = await api.getAddresses();
      setAddresses(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  // Auto-lookup pincode when 6 digits entered
  useEffect(() => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeStatus("idle");
      setPincodeInfo("");
      return;
    }
    setPincodeStatus("checking");
    api.checkServiceability(pincode)
      .then(res => {
        if (res.data?.serviceable) {
          setPincodeStatus("serviceable");
          const zoneName = res.data.zone?.name || "";
          const stateName = res.data.state?.name || "";
          setPincodeInfo(zoneName && stateName ? `${zoneName}, ${stateName}` : "");
          if (!state && stateName) setState(stateName);
          if (!city && zoneName) setCity(zoneName);
        } else {
          setPincodeStatus("not_serviceable");
          setPincodeInfo("This area is not yet serviceable. You can save the address but services may not be available here.");
          // Fallback: try India Post API to at least fill city/state
          fetch(`https://api.postalpincode.in/pincode/${pincode}`)
            .then(r => r.json())
            .then(data => {
              const po = data?.[0]?.PostOffice?.[0];
              if (po) {
                if (!state && po.State) setState(po.State);
                if (!city && (po.District || po.Division)) setCity(po.District || po.Division);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        setPincodeStatus("not_serviceable");
        setPincodeInfo("");
        // Fallback to India Post API
        fetch(`https://api.postalpincode.in/pincode/${pincode}`)
          .then(r => r.json())
          .then(data => {
            const po = data?.[0]?.PostOffice?.[0];
            if (po) {
              if (!state && po.State) setState(po.State);
              if (!city && (po.District || po.Division)) setCity(po.District || po.Division);
            }
          })
          .catch(() => {});
      });
  }, [pincode]);

  const resetForm = () => {
    setLabel("Home");
    setFullAddress("");
    setPincode("");
    setCity("");
    setState("");
    setPincodeStatus("idle");
    setPincodeInfo("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!fullAddress.trim()) { toast.error("Enter your full address"); return; }
    if (!/^\d{6}$/.test(pincode)) { toast.error("Enter a valid 6-digit pincode"); return; }

    setSaving(true);
    try {
      await api.createAddress({ label, fullAddress: fullAddress.trim(), pincode, city: city || undefined, state: state || undefined });
      toast.success("Address added!");
      resetForm();
      loadAddresses();
    } catch (err: any) {
      toast.error(err.message || "Failed to add address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAddress(id);
      toast.success("Address removed");
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.setDefaultAddress(id);
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })));
      toast.success("Default address updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  // Detect location for auto-fill
  const handleDetectLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const a = data.address || {};
          const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.state].filter(Boolean);
          setFullAddress(parts.join(", ") || data.display_name || "");
          if (a.postcode) setPincode(a.postcode);
          if (a.state) setState(a.state);
          if (a.city || a.town) setCity(a.city || a.town || "");
          toast.success("Location detected!");
        } catch {
          toast.error("Could not fetch address from location");
        }
      },
      () => toast.error("Could not detect location")
    );
  };

  if (!user) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Please log in to manage your addresses.</p>
          <Button className="mt-4" onClick={() => navigate("/login")}>Log In</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Addresses</h1>
            <p className="text-sm text-muted-foreground">Manage your saved addresses for bookings</p>
          </div>
          {!showForm && addresses.length < 10 && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Address
            </Button>
          )}
        </div>

        {/* Add Address Form */}
        {showForm && (
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">New Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Label selector */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Label</label>
                <div className="flex gap-2">
                  {LABELS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        label === l ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {LABEL_ICONS[l]} {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-detect */}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleDetectLocation}>
                <MapPin className="w-3.5 h-3.5" /> Detect My Location
              </Button>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Full Address *</label>
                <textarea
                  value={fullAddress}
                  onChange={e => setFullAddress(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="House no, street, area, landmark..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Pincode *</label>
                  <Input
                    placeholder="6-digit pincode"
                    maxLength={6}
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">City</label>
                  <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="rounded-xl" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">State</label>
                <Input placeholder="State" value={state} onChange={e => setState(e.target.value)} className="rounded-xl" />
              </div>

              {/* Serviceability indicator */}
              {pincodeStatus === "checking" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking serviceability...
                </div>
              )}
              {pincodeStatus === "serviceable" && (
                <div className="flex items-start gap-2 text-sm bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">This area is serviceable!</p>
                    {pincodeInfo && <p className="text-emerald-600/80 text-xs">{pincodeInfo}</p>}
                  </div>
                </div>
              )}
              {pincodeStatus === "not_serviceable" && (
                <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-400">Not yet serviceable</p>
                    <p className="text-amber-600/80 text-xs">You can save this address, but services may not be available at this location yet.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleAdd} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Save Address
                </Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : addresses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No saved addresses</p>
              <p className="text-sm text-muted-foreground mt-1">Add an address to quickly select it when booking services.</p>
              {!showForm && (
                <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Address
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr: any) => (
              <Card key={addr.id} className={addr.isDefault ? "border-primary/30" : ""}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${addr.isDefault ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {LABEL_ICONS[addr.label] || <MapPin className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>
                        )}
                        <span className="text-xs text-muted-foreground">{addr.pincode}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{addr.fullAddress}</p>
                      {addr.city && <p className="text-xs text-muted-foreground">{[addr.city, addr.state].filter(Boolean).join(", ")}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!addr.isDefault && (
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleSetDefault(addr.id)}>
                          <Star className="w-3.5 h-3.5 mr-1" /> Set Default
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => handleDelete(addr.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomerAddresses;
