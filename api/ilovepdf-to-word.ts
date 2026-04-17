
import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
    maxBodySize: '50mb',
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API keys
  const publicKey = process.env.ILOVEPDF_PUBLIC_KEY?.trim();
  const secretKey = process.env.ILOVEPDF_SECRET_KEY?.trim();

  if (!publicKey || !secretKey || publicKey === 'undefined' || secretKey === 'undefined') {
    return res.status(500).json({ 
      error: 'iLovePDF credentials missing or invalid',
      debug: { hasPublic: !!publicKey, hasSecret: !!secretKey },
      fix: 'Add ILOVEPDF_PUBLIC_KEY and ILOVEPDF_SECRET_KEY to your environment variables'
    });
  }

  try {
    // Parse uploaded file
    const form = formidable({ maxFileSize: 50 * 1024 * 1024 });
    const [fields, files] = await form.parse(req as any);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📄 Processing PDF to Word: ${file.originalFilename}`);

    // 1. Get Authentication Token
    const authResponse = await fetch("https://api.ilovepdf.com/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: publicKey })
    });
    
    if (!authResponse.ok) {
        const errorText = await authResponse.text();
        throw new Error(`iLovePDF Auth failed (${authResponse.status}): ${errorText || authResponse.statusText}`);
    }
    const authData: any = await authResponse.json();
    const token = authData.token;

    // 2. Start Task (using 'pdfword')
    let startResponse = await fetch("https://api.ilovepdf.com/v1/start/pdfword", {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    // Fallback if 'pdfword' fails - some accounts might use 'pdfoffice'
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
    
    // Determine the tool used based on the start URL
    const toolUsed = startResponse.url.includes('pdfoffice') ? 'pdfoffice' : 'pdfword';

    // 3. Upload File
    const formData = new FormData();
    formData.append("task", task);
    
    const fileBuffer = fs.readFileSync(file.filepath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append("file", blob, file.originalFilename || 'document.pdf');

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
          filename: file.originalFilename
        }]
      })
    });

    if (!processResponse.ok) {
      const errorData: any = await processResponse.json().catch(() => ({}));
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename?.replace('.pdf', '')}.docx"`);
    res.send(finalBuffer);

    // Clean up temp file
    if (fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }

  } catch (error) {
    console.error('iLovePDF error:', error);
    // Ensure we always return JSON on error
    res.status(500).json({ error: error instanceof Error ? error.message : 'Conversion failed' });
  }
}
