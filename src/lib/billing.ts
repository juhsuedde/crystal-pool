import { supabase } from "@/integrations/supabase/client";

export const createProCheckout = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tier: "pro" }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Checkout failed");
  }

  const { url } = await res.json();
  return url;
};

export const openUpgradeModal = async (onSuccess?: () => void) => {
  try {
    const url = await createProCheckout();
    window.location.href = url;
  } catch (err) {
    console.error("Upgrade error:", err);
  }
};