import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, LogOut, Plus, Wrench, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/vendor/hooks/useVendorAuth";
import { vendorApi as api } from "@/vendor/lib/vendorApi";
import { toast } from "sonner";

const VendorServices = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    api.getVendorServices()
      .then((res) => setServices(res.data || []))
      .catch(() => toast.error("Failed to load services"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Enter service name"); return; }
    if (!newPrice || parseFloat(newPrice) < 0) { toast.error("Enter a valid price"); return; }
    setAddLoading(true);
    try {
      const res = await api.createService({ name: newName.trim(), price: parseFloat(newPrice), availability: "available" });
      if (res.data) setServices(prev => [res.data!, ...prev]);
      setNewName("");
      setNewPrice("");
      setShowAdd(false);
      toast.success("Service added!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add service");
    } finally {
      setAddLoading(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-bold text-lg hidden sm:block">
              Vendor<span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">Portal</span>
            </span>
          </Link>
          <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate("/login"); }}>
            <LogOut className="w-4 h-4 mr-1.5" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Dashboard
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-orange-500" />
            Your Services
          </h1>
          <Button size="sm" className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Service
          </Button>
        </div>

        {showAdd && (
          <Card className="mb-6 border-orange-200">
            <CardHeader>
              <CardTitle className="text-base">Add New Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Service name (e.g. Deep Cleaning)" className="h-11 rounded-xl" value={newName} onChange={e => setNewName(e.target.value)} />
              <Input placeholder="Price (₹)" className="h-11 rounded-xl" type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" disabled={addLoading} onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white">
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No services yet</p>
              <p className="text-sm mt-1">Add your first service to start receiving bookings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-4 pb-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <IndianRupee className="w-3 h-3" />
                      {s.price}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.availability === "available" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                    {s.availability}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorServices;
