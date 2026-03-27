import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import crypto from "crypto";

const ALLOWED_PARAM_KEYS = ["data_form", "data_receipt", "intake_receipt"] as const;
const LINK_TTL_DAYS = 30;
const CODE_LENGTH = 8;
const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const MAX_RETRIES = 5;

function generateAlphanumericCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHANUMERIC[b % ALPHANUMERIC.length]).join("");
}

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
      const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
      let lastErr: unknown;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const code = generateAlphanumericCode(CODE_LENGTH);
        try {
          await storage.createShortLink(code, paramKey, payload, expiresAt);
          return res.json({ code, url: `/s/${code}` });
        } catch (err: any) {
          if (err?.code === "23505") {
            lastErr = err;
            continue;
          }
          throw err;
        }
      }
      console.error("Failed to generate unique code after retries:", lastErr);
      res.status(500).json({ error: "Internal server error" });
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
