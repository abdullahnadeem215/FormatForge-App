import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cors from "cors";
import fs from "fs";

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

app.get("/api/debug-env", (req, res) => {
  res.json({
    hasILovePdfPublicKey: !!process.env.ILOVEPDF_PUBLIC_KEY,
    hasILovePdfSecretKey: !!process.env.ILOVEPDF_SECRET_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
});

// COOP/COEP headers for ffmpeg.wasm - REQUIRED for high performance
app.use((req, res, next) => {
  res.header("Cross-Origin-Embedder-Policy", "require-corp");
  res.header("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

// iLovePDF Conversion Handler (Shared REST implementation)
async function handleILovePDFConversion(req: any, res: any) {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY?.trim();
  const secretKey = process.env.ILOVEPDF_SECRET_KEY?.trim();

  if (!publicKey || !secretKey || publicKey === "undefined" || secretKey === "undefined") {
    return res.status(500).json({ 
      error: "iLovePDF API credentials not configured. Please set ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY.",
      debug: { hasPublic: !!publicKey, hasSecret: !!secretKey }
    });
  }

  try {
    console.log(`📄 iLovePDF Processing (REST): ${req.file.originalname}`);

    // 1. Get Authentication Token
    const authResponse = await fetch("https://api.ilovepdf.com/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: publicKey })
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`iLovePDF Auth failed: ${errorText || authResponse.statusText}`);
    }
    const authData: any = await authResponse.json();
    const token = authData.token;

    // 2. Start Task (using 'pdfword')
    let startResponse = await fetch("https://api.ilovepdf.com/v1/start/pdfword", {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    // Fallback if 'pdfword' fails
    if (!startResponse.ok) {
      console.warn("iLovePDF 'pdfword' start failed, trying 'pdfoffice' fallback...");
      startResponse = await fetch("https://api.ilovepdf.com/v1/start/pdfoffice", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
    }

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      let msg = startResponse.statusText;
      try {
        if (errorText.trim()) {
          const errorData = JSON.parse(errorText);
          msg = JSON.stringify(errorData.error || errorData);
        }
      } catch (e) {}
      throw new Error(`iLovePDF Start failed: ${msg}`);
    }
    const { task, server } = (await startResponse.json()) as { task: string; server: string };
    const toolUsed = startResponse.url.includes('pdfoffice') ? 'pdfoffice' : 'pdfword';

    // 3. Upload File
    const formData = new FormData();
    formData.append("task", task);
    
    const fileBuffer = fs.readFileSync(req.file.path);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append("file", blob, req.file.originalname);

    const uploadResponse = await fetch(`https://${server}/v1/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`iLovePDF Upload failed: ${errorText || uploadResponse.statusText}`);
    }
    const { server_filename } = (await uploadResponse.json()) as { server_filename: string };

    // 4. Process Task
    const processResponse = await fetch(`https://${server}/v1/process`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        task: task,
        tool: toolUsed,
        files: [{
          server_filename: server_filename,
          filename: req.file.originalname
        }]
      })
    });

    if (!processResponse.ok) {
      const errorData: any = await processResponse.json();
      throw new Error(`iLovePDF Processing failed: ${errorData?.error?.message || processResponse.statusText}`);
    }

    // 5. Download Result
    const downloadResponse = await fetch(`https://${server}/v1/download/${task}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!downloadResponse.ok) {
      throw new Error(`iLovePDF Download failed: ${downloadResponse.statusText}`);
    }
    const finalBufferArray = await downloadResponse.arrayBuffer();
    const finalBuffer = Buffer.from(finalBufferArray);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="converted.docx"`);
    res.send(finalBuffer);

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

  } catch (err: any) {
    console.error("iLovePDF Full Error:", err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message || "iLovePDF conversion failed" });
  }
}

// Routes for both endpoints
app.post("/api/convert/ilovepdf-to-docx", upload.single("file"), handleILovePDFConversion);
app.post("/api/ilovepdf-to-word", upload.single("file"), handleILovePDFConversion);

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
