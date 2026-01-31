import { Router } from "express";

const router = Router();

router.get("/meta", (req, res) => {
  const mode = process.env.CURPIFY_MODE ?? "full";
  const dailyLimit = Number(process.env.LITE_DAILY_LIMIT ?? "10");

  res.json({
    name: "curpify",
    mode,
    daily_limit: mode === "lite" ? dailyLimit : null,
    allowed_endpoints: mode === "lite" ? ["/api/curp/validate", "/api/meta"] : null,
    upgrade_url: "https://curpify.com/pricing",
  });
});

export default router;
