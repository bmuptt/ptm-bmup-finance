import fs from 'fs';
import path from 'path';
import { config } from '../config/environment';

const toOsPath = (parts: string[]): string => {
  return path.join(...parts);
};

export const resolvePublicUrlToDiskPath = (filePath: string): string => {
  const isHttp = /^https?:\/\//i.test(filePath);
  if (isHttp) {
    try {
      const u = new URL(filePath);
      const pathname = u.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      return toOsPath([process.cwd(), ...pathname.split('/')]);
    } catch {
      return path.resolve(filePath);
    }
  }

  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('storage/')) {
    return toOsPath([process.cwd(), ...normalized.split('/')]);
  }

  const idx = normalized.indexOf('/storage/');
  if (idx >= 0) {
    const tail = normalized.substring(idx + 1); // remove leading '/'
    return toOsPath([process.cwd(), ...tail.split('/')]);
  }

  return path.resolve(filePath);
};

export const normalizeStoragePathToPublicUrl = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;
  const isHttp = /^https?:\/\//i.test(filePath);
  if (isHttp) return filePath;
  const normalized = filePath.replace(/\\/g, '/');
  let storagePath = normalized;
  const idx = normalized.indexOf('/storage/');
  if (idx >= 0) {
    storagePath = normalized.substring(idx + 1); // remove leading '/'
  }
  if (storagePath.startsWith('/')) storagePath = storagePath.substring(1);
  if (!storagePath.startsWith('storage/')) {
    // If path doesn't include storage, return as-is to avoid wrong URLs
    return normalized;
  }
  return `${config.APP_URL}/${storagePath}`;
};

export const deleteFile = (filePath: string): void => {
  try {
    const fullPath = resolvePublicUrlToDiskPath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // skip log per project rules
  }
};
