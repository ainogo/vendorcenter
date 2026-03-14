import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2, ShieldCheck, CreditCard } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

const Payment = () => {
  const { bookingId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [paying, setPaying] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const amountPaise = Number(params.get("amount") || "0");
  const amountInr = Number.isFinite(amountPaise) ? (amountPaise / 100).toFixed(2) : "0.00";
  const txn = params.get("txn") || "-";

  const handleDummyPayment = async () => {
    if (!bookingId) return;
    setPaying(true);
    try {
      const res = await api.payBooking(bookingId);
      toast.success(`Payment successful. OTP sent to your email. Token: ${res.data?.paymentToken || "generated"}`);
      navigate("/account?tab=bookings");
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-16 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Layout>
        <div className="container py-10 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Login Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please login with your customer account to continue this payment securely.
              </p>
              <Button asChild>
                <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Login to Continue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="w-5 h-5 text-primary" />
              Dummy Payment Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4 bg-secondary/30 space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Booking ID:</span> {bookingId}</p>
              <p className="text-sm"><span className="text-muted-foreground">Transaction ID:</span> {txn}</p>
              <p className="text-sm"><span className="text-muted-foreground">Amount:</span> INR {amountInr}</p>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 flex gap-2 items-start">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Security: payment is accepted only for the logged-in booking owner. OTP is generated server-side and sent to your email only.
              </span>
            </div>

            <Button className="w-full" onClick={handleDummyPayment} disabled={paying || !bookingId}>
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Dummy Payment
            </Button>
            <p className="text-xs text-muted-foreground">
              After confirmation, OTP is sent to your email. Share OTP with vendor to complete booking.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Payment;
