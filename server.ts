import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";
import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFParams,
  ExportPDFTargetFormat,
  ExportPDFJob,
  ExportPDFResult,
  SDKError,
  ServiceApiError,
} from "@adobe/pdfservices-node-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const upload = multer({ dest: "/tmp" });

app.use(cors());
app.use(express.json());

// Adobe Credentials Test Endpoint
app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", message: "API is reachable", environment: process.env.NODE_ENV });
});

app.get("/api/test-adobe-credentials", async (req, res) => {
  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;

  console.log("Testing Adobe Credentials...");
  console.log("Client ID Present:", !!clientId);
  console.log("Client Secret Present:", !!clientSecret);

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      status: "Error",
      message: "Credentials missing in environment variables.",
      clientIdPresent: !!clientId,
      clientSecretPresent: !!clientSecret
    });
  }

  try {
    // Direct fetch test for raw authentication
    const tokenResponse = await fetch('https://pdf-services.adobe.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    const tokenData: any = await tokenResponse.json();

    if (tokenResponse.ok) {
      res.json({
        status: "Success",
        message: "Authentication successful.",
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in
      });
    } else {
      res.status(401).json({
        status: "Failed",
        message: "Adobe rejected the credentials.",
        details: tokenData
      });
    }
  } catch (error: any) {
    console.error("Test Credential Error:", error);
    res.status(500).json({
      status: "Error",
      message: error.message
    });
  }
});

// COOP/COEP headers for ffmpeg.wasm - REQUIRED for high performance
app.use((req, res, next) => {
  res.header("Cross-Origin-Embedder-Policy", "require-corp");
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

// Adobe PDF to DOCX API
app.post("/api/convert/pdf-to-docx", upload.single("file"), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const clientId = process.env.ADOBE_CLIENT_ID;
  const clientSecret = process.env.ADOBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ 
      error: "Adobe API credentials not configured. Please set ADOBE_CLIENT_ID and ADOBE_CLIENT_SECRET in secrets." 
    });
  }

  let readStream;
  try {
    console.log("Adobe Conversion Start:", req.file.originalname);
    
    if (!clientId || !clientSecret) {
       console.error("Critical: Adobe Credentials Missing");
       return res.status(500).json({ error: "Adobe API credentials not configured. Please set ADOBE_CLIENT_ID and ADOBE_CLIENT_SECRET in Vercel Environment Variables." });
    }

    const credentials = new ServicePrincipalCredentials({
      clientId,
      clientSecret,
    });

    const pdfServices = new PDFServices({ credentials });

    console.log("Adobe ID Check:", clientId.substring(0, 4) + "...");

    readStream = fs.createReadStream(req.file.path);
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.PDF,
    });

    const params = new ExportPDFParams({
      targetFormat: ExportPDFTargetFormat.DOCX,
    });

    const job = new ExportPDFJob({ inputAsset, params });

    const pollingURL = await pdfServices.submit({ job });

    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: ExportPDFResult,
    });

    const resultAsset = (pdfServicesResponse.result as any).asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="converted.docx"`);
    
    streamAsset.readStream.pipe(res);

    streamAsset.readStream.on("end", () => {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    });

  } catch (err) {
    console.error("Adobe Conversion Error:", err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    
    let message = "Adobe conversion failed";
    if (err instanceof SDKError || err instanceof ServiceApiError) {
      message = err.message;
    }
    res.status(500).json({ error: message });
  }
});

// Vite middleware setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

setupVite();

export default app;

const isVercel = process.env.VERCEL === "1" || !!process.env.NOW_REGION;

if (!isVercel) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Environment:", process.env.NODE_ENV);
  });
}
