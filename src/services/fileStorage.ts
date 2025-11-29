import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MediaFile } from '../types/models';

interface LifeTalesDB extends DBSchema {
  mediaFiles: {
    key: string;
    value: MediaFile;
  };
}

const DB_NAME = 'lifetales-storage';
const DB_VERSION = 1;
const MEDIA_STORE = 'mediaFiles';

class FileStorageService {
  private dbPromise: Promise<IDBPDatabase<LifeTalesDB>>;

  constructor() {
    this.dbPromise = openDB<LifeTalesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Create media files store if it doesn't exist
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          const store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
          store.createIndex('mimeType', 'mimeType');
        }
      },
    });
  }

  /**
   * Save a file to IndexedDB storage
   * Returns the file ID for reference
   */
  async saveFile(blob: Blob, fileName?: string): Promise<string> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    const mediaFile: MediaFile = {
      id,
      blob,
      fileName: fileName || `file_${timestamp}`,
      mimeType: blob.type || 'application/octet-stream',
      size: blob.size,
      createdAt: timestamp,
    };

    const db = await this.dbPromise;
    await db.put(MEDIA_STORE, mediaFile);
    
    console.log(`✅ Saved file: ${mediaFile.fileName} (${this.formatFileSize(blob.size)})`);
    return id;
  }

  /**
   * Get file metadata and blob by ID
   */
  async getFile(id: string): Promise<MediaFile | undefined> {
    const db = await this.dbPromise;
    return await db.get(MEDIA_STORE, id);
  }

  /**
   * Get an object URL for a file (for displaying in UI)
   */
  async getFileUrl(id: string): Promise<string | undefined> {
    const file = await this.getFile(id);
    if (file?.blob) {
      return URL.createObjectURL(file.blob);
    }
    return undefined;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(MEDIA_STORE, id);
    console.log(`🗑️  Deleted file: ${id}`);
  }

  /**
   * Get all stored files (for debugging/management)
   */
  async getAllFiles(): Promise<MediaFile[]> {
    const db = await this.dbPromise;
    return await db.getAll(MEDIA_STORE);
  }

  /**
   * Get total storage size used
   */
  async getTotalStorageSize(): Promise<number> {
    const files = await this.getAllFiles();
    return files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Clear all stored files (use with caution!)
   */
  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(MEDIA_STORE);
    console.log('🧹 Cleared all media files');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export const fileStorage = new FileStorageService();

