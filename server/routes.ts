import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const ALLOWED_PARAM_KEYS = ["data_form", "data_receipt", "intake_receipt", "intake_form"] as const;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/shorten", async (req, res) => {
    try {
      const { paramKey, payload } = req.body;
      if (!paramKey || typeof paramKey !== "string" || !(ALLOWED_PARAM_KEYS as readonly string[]).includes(paramKey)) {
        return res.status(400).json({ error: "Invalid paramKey" });
      }
      if (!payload || typeof payload !== "string") {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const { code } = await storage.createShortLink(paramKey, payload);
      res.json({ code, url: `/s/${code}` });
    } catch (err) {
      console.error("Failed to create short link:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/s/:code", async (req, res) => {
    try {
      const link = await storage.getShortLink(req.params.code);
      if (!link) {
        return res.status(404).send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link Expired</title>
<style>body{font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FAFAF9;color:#333}
.card{text-align:center;padding:3rem 2rem;max-width:400px}.card h1{font-size:1.5rem;margin-bottom:.75rem;color:#1a1a1a}
.card p{color:#666;line-height:1.6;margin:0}</style></head>
<body><div class="card"><h1>Link Expired or Not Found</h1><p>This link is no longer available. Please request a new one from your Abridge contact.</p></div></body></html>`);
      }
      res.redirect(302, `/?${link.paramKey}=${link.payload}`);
    } catch (err) {
      console.error("Failed to resolve short link:", err);
      res.status(500).send("Internal server error");
    }
  });

  return httpServer;
}
