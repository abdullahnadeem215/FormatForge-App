import heic2any from 'heic2any';

export async function convertImage(file: File, outputFormat: string, quality: number = 0.9): Promise<Blob> {
  let sourceBlob: Blob | File = file;

  // Handle HEIC
  if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: quality
    });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        const mimeType = `image/${outputFormat === 'jpg' ? 'jpeg' : outputFormat}`;
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas toBlob failed'));
        }, mimeType, quality);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(sourceBlob);
  });
}
