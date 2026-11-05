// Opens Razorpay checkout for a pending order. Returns the verified order id, or throws with a readable message.
const RZ = () => (window as any).Razorpay;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (RZ()) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment window."));
    document.body.appendChild(s);
  });
}

export async function payOrder(kind: "ticket" | "shop", orderId: string, buyer: { name: string; email: string; phone?: string }, label: string): Promise<string> {
  const start = await fetch("/api/pay/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, order_id: orderId }) });
  const s = await start.json();
  if (!start.ok) throw new Error(s.error ?? "Could not start payment.");
  await loadScript();
  return new Promise((resolve, reject) => {
    const rz = new (RZ())({
      key: s.key_id, amount: s.amount, currency: "INR", order_id: s.razorpay_order_id, name: "Cats Can Dance", description: label,
      prefill: { name: buyer.name, email: buyer.email, contact: buyer.phone ?? "" }, theme: { color: "#dc2626" },
      handler: async (resp: any) => {
        const v = await fetch("/api/pay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...resp }) });
        const j = await v.json();
        v.ok ? resolve(j.order_id) : reject(new Error(j.error ?? "Payment could not be verified."));
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rz.open();
  });
}
