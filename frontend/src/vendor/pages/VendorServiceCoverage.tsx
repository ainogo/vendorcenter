import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, CheckCircle2, AlertTriangle, MapPin, Save } from "lucide-react";
import VendorHeader from "@/vendor/components/VendorHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/vendor/hooks/useVendorAuth";
import { vendorApi as api } from "@/vendor/lib/vendorApi";
import { toast } from "sonner";

const VendorServiceCoverage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Pincode lookup
  const [pincodeInput, setPincodeInput] = useState("");
  const [pincodeLookup, setPincodeLookup] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Hierarchy + selection
  const [hierarchyData, setHierarchyData] = useState<any[]>([]);
  const [selectedPincodeIds, setSelectedPincodeIds] = useState<string[]>([]);
  const [currentPincodeIds, setCurrentPincodeIds] = useState<string[]>([]);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>({});
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({});
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getServiceZoneHierarchy().then(res => res.data || []),
      api.getServicePincodes().then(res => res.data || []),
    ]).then(([hierarchy, pincodes]) => {
      setHierarchyData(hierarchy as any[]);
      const ids = (pincodes as any[]).map((p: any) => p.pincodeId || p.id).filter(Boolean);
      setSelectedPincodeIds(ids);
      setCurrentPincodeIds(ids);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, [user]);

  if (authLoading || !user) return null;

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
      } else {
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

  const hasChanges = JSON.stringify([...selectedPincodeIds].sort()) !== JSON.stringify([...currentPincodeIds].sort());

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateServicePincodes(selectedPincodeIds);
      setCurrentPincodeIds([...selectedPincodeIds]);
      toast.success("Service pincodes updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update service pincodes");
    } finally {
      setSaving(false);
    }
  };

  // Build a flat pincode ID → pincode string map for display
  const pincodeMap: Record<string, string> = {};
  hierarchyData.forEach((s: any) => s.zones?.forEach((z: any) => z.areas?.forEach((a: any) => a.pincodes?.forEach((p: any) => {
    pincodeMap[p.id] = p.pincode;
  }))));

  return (
    <div className="min-h-screen bg-background">
      <VendorHeader />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold mb-2">Service Coverage</h1>
        <p className="text-muted-foreground mb-6">
          Select the pincodes where you provide services. Customers searching in these areas will be able to find you.
        </p>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pincode Lookup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="w-5 h-5 text-emerald-500" />
                  Check Pincode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter 6-digit pincode"
                    className="h-11 rounded-xl flex-1"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={e => setPincodeInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={e => e.key === "Enter" && handlePincodeLookup()}
                  />
                  <Button variant="outline" className="h-11 rounded-xl px-4" disabled={lookingUp || pincodeInput.length !== 6} onClick={handlePincodeLookup}>
                    {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

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
                          <p className="font-medium text-emerald-700 dark:text-emerald-400">Pincode {pincodeInput} is in our service zones!</p>
                          {pincodeLookup.state && <p className="text-emerald-600/80">{pincodeLookup.area} → {pincodeLookup.zone} → {pincodeLookup.state}</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-amber-700 dark:text-amber-400">This pincode is not yet in our service zones.</p>
                          <p className="text-amber-600/80 mt-0.5">We'll notify you when we expand to this area.</p>
                          {pincodeLookup.state && <p className="text-amber-600/60 text-xs mt-1">{pincodeLookup.district}, {pincodeLookup.state}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected pincodes summary */}
            {selectedPincodeIds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    Selected Pincodes ({selectedPincodeIds.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPincodeIds.map(id => (
                      <span key={id} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-xs font-medium">
                        {pincodeMap[id] || id}
                        <button type="button" onClick={() => togglePincodeId(id)} className="hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hierarchy tree */}
            {hierarchyData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Browse Service Zones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {hierarchyData.map((state: any) => (
                      <div key={state.id}>
                        <button
                          type="button"
                          className="w-full text-left text-sm font-medium py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-1"
                          onClick={() => setExpandedStates(p => ({ ...p, [state.id]: !p[state.id] }))}
                        >
                          <span className="text-xs">{expandedStates[state.id] ? "▼" : "▶"}</span> {state.name}
                        </button>
                        {expandedStates[state.id] && state.zones?.map((zone: any) => (
                          <div key={zone.id} className="ml-4">
                            <button
                              type="button"
                              className="w-full text-left text-sm py-1 px-2 hover:bg-muted/50 rounded flex items-center gap-1"
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
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No service zones configured yet. Contact admin to set up your service areas.
                </CardContent>
              </Card>
            )}

            {/* Save button */}
            <Button
              disabled={saving || !hasChanges}
              onClick={handleSave}
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 rounded-xl font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              Save Service Coverage
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorServiceCoverage;
