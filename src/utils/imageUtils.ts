import React from 'react';
import { LinenItem } from '../types';

export function getDefaultLinenImage(item: LinenItem): string {
  const name = (item.ten || '').toLowerCase();
  const group = (item.nhom || '').toLowerCase();
  
  if (name.includes('phòng mổ') || name.includes('ptv') || name.includes('áo choàng') || name.includes('đồng phục') || name.includes('blouse') || name.includes('đầm') || name.includes('váy') || name.includes('quần') || group.includes('trang phục')) {
    return 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('gối') || name.includes('mền') || name.includes('ruột') || group.includes('mền')) {
    return 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('khăn') || group.includes('khăn')) {
    return 'https://images.unsplash.com/photo-1546554137-f86b9593a222?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('drap') || name.includes('săng') || name.includes('sheet') || group.includes('drap') || group.includes('săng') || group.includes('sheet')) {
    return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('túi') || group.includes('túi')) {
    return 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80';
  }
  
  return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80';
}

export function sanitizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Ignore local drive paths like C:\, D:\, file://
  if (/^[a-zA-Z]:\\/.test(trimmed) || trimmed.startsWith('file://')) {
    return undefined;
  }

  // Convert Google Drive view link to direct image link
  // e.g. https://drive.google.com/file/d/FILE_ID/view... -> https://lh3.googleusercontent.com/d/FILE_ID
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  return undefined;
}

export function getLinenImage(item: LinenItem): string {
  const sanitized = sanitizeImageUrl(item.hinhAnh);
  if (sanitized) {
    return sanitized;
  }
  return getDefaultLinenImage(item);
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, item: LinenItem) {
  const target = e.currentTarget;
  const fallback = getDefaultLinenImage(item);
  if (target.src !== fallback) {
    target.src = fallback;
  }
}

/**
 * Compress image file to reasonable resolution (max 800px) and quality (0.75 JPEG)
 * to avoid large base64 strings breaking local storage or Firestore limits.
 */
export function compressImageFile(
  file: File, 
  onSuccess: (base64Url: string) => void,
  onError?: (err: string) => void,
  maxDimension = 800,
  quality = 0.75
) {
  if (!file.type.startsWith('image/')) {
    if (onError) onError('Tệp được chọn không phải là hình ảnh hợp lệ.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const rawDataUrl = event.target?.result as string;
    if (!rawDataUrl) {
      if (onError) onError('Không thể đọc tệp ảnh.');
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          onSuccess(compressedDataUrl);
        } else {
          onSuccess(rawDataUrl);
        }
      } catch (err) {
        onSuccess(rawDataUrl);
      }
    };
    img.onerror = () => {
      if (onError) onError('Tệp ảnh bị hỏng hoặc không đúng định dạng.');
    };
    img.src = rawDataUrl;
  };
  reader.onerror = () => {
    if (onError) onError('Lỗi khi đọc file ảnh.');
  };
  reader.readAsDataURL(file);
}
