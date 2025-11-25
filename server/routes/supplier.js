import express from "express";

export default function makeSupplierRouter({ supabase, randomBytes }) {
  const router = express.Router();

  router.post("/generate-supplier-link", async (req, res) => {
    const { briefingId } = req.body;

    console.log("🔗 Supplier link generation requested");
    console.log(`🆔 Briefing ID: ${briefingId}`);

    if (!briefingId)
      return res.status(400).json({ error: "Briefing ID is required" });

    try {
      const token = randomBytes(32).toString("hex");
      console.log("🎫 Generated token:", token.substring(0, 16) + "...");

      const { data, error } = await supabase
        .from("briefings")
        .update({ supplier_link_token: token })
        .eq("id", briefingId)
        .select()
        .single();

      if (error) {
        console.error("❌ Database error:", error.message);
        throw error;
      }

      const supplierLink = `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/supplier-response/${token}`;
      console.log("✅ Supplier link generated:", supplierLink);

      res.json({ token, supplierLink, briefingId });
    } catch (error) {
      console.error("❌ Error generating supplier link:", error.message);
      res.status(500).json({ error: "Failed to generate link" });
    }
  });

  router.get("/supplier-briefing/:token", async (req, res) => {
    const { token } = req.params;
    console.log("🔍 Supplier briefing lookup requested");
    console.log("🎫 Token:", token.substring(0, 16) + "...");

    try {
      const { data, error } = await supabase
        .from("briefings")
        .select("id, title, chat")
        .eq("supplier_link_token", token)
        .single();

      if (error || !data) {
        console.log("❌ Briefing not found for token");
        return res.status(404).json({ error: "Invalid or expired link" });
      }

      const userMessages =
        data.chat?.filter((msg) => msg.role === "User") || [];
      const description =
        userMessages.length > 0
          ? userMessages[0].content
          : "No description available";

      console.log("✅ Found briefing:", data.id);

      res.json({
        id: data.id,
        title: data.title || "Quote Request",
        description,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error fetching briefing:", error.message);
      res.status(500).json({ error: "Failed to load briefing" });
    }
  });

  router.post("/supplier-submit-quote", async (req, res) => {
    const { token, quoteData } = req.body;

    console.log("📥 Supplier quote submission received");
    console.log("🎫 Token:", token?.substring(0, 16) + "...");
    console.log("🏢 Supplier:", quoteData?.supplier_name);

    if (!token || !quoteData)
      return res.status(400).json({ error: "Token and quote data required" });

    try {
      console.log("🔍 Verifying token...");
      const { data: briefing, error: briefingError } = await supabase
        .from("briefings")
        .select("id")
        .eq("supplier_link_token", token)
        .single();

      if (briefingError || !briefing) {
        console.log("❌ Invalid or expired token");
        return res.status(404).json({ error: "Invalid or expired link" });
      }

      console.log("✅ Token verified, briefing ID:", briefing.id);
      console.log("💾 Inserting quote into database...");

      const parseNumber = (val) => {
        if (val === null || val === undefined || val === "") return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      };

      const parseIntSafe = (val) => {
        if (val === null || val === undefined || val === "") return null;
        const num = Number.parseInt(val);
        return isNaN(num) ? null : num;
      };

      const { data: insertedQuote, error: insertError } = await supabase
        .from("quotes")
        .insert({
          briefing_id: briefing.id,
          supplier_name: quoteData.supplier_name || null,
          contact_email: quoteData.contact_email || null,
          contact_phone: quoteData.contact_phone || null,
          total_price: parseNumber(quoteData.total_price),
          currency: quoteData.currency || "USD",
          unit_price: parseNumber(quoteData.unit_price),
          quantity: parseIntSafe(quoteData.quantity),
          lead_time_days: parseIntSafe(quoteData.lead_time_days),
          delivery_date: quoteData.delivery_date || null,
          payment_terms: quoteData.payment_terms || null,
          warranty_period: quoteData.warranty_period || null,
          warranty_months: parseIntSafe(quoteData.warranty_months),
          shipping_cost: parseNumber(quoteData.shipping_cost),
          notes: quoteData.notes || null,
          input_method: "manual_supplier",
          submitted_by: "supplier",
          analysis_json: quoteData,
        })
        .select()
        .single();

      if (insertError) {
        console.error("❌ Database insert error:", insertError);
        throw insertError;
      }

      console.log("✅ Quote submitted successfully, ID:", insertedQuote.id);

      res.json({
        success: true,
        message: "Quote submitted successfully",
        quoteId: insertedQuote.id,
      });
    } catch (error) {
      console.error("❌ Error submitting supplier quote:", error.message);
      console.error("❌ Full error:", error);
      res
        .status(500)
        .json({ error: "Failed to submit quote", details: error.message });
    }
  });

  return router;
}
