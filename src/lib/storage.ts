import { promises as fs } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { randomToken, sha256Hex } from "./crypto";
import { env } from "./env";
import { logger } from "./logger";

export type StoredFile = {
  storagePath: string;
  size: number;
  sha256: string;
  contentType: string;
};

export interface StorageAdapter {
  put(buf: Buffer, opts: { contentType: string; ext?: string; subdir?: string }): Promise<StoredFile>;
  read(storagePath: string): Promise<Buffer>;
  remove(storagePath: string): Promise<void>;
  signedUrl(storagePath: string, ttlSeconds?: number): Promise<string>;
}

class LocalStorage implements StorageAdapter {
  private root = resolve(env.STORAGE_LOCAL_DIR);

  async put(buf: Buffer, opts: { contentType: string; ext?: string; subdir?: string }): Promise<StoredFile> {
    const ext = (opts.ext ?? "bin").replace(/^\./, "");
    const sub = opts.subdir ?? "misc";
    const filename = `${Date.now()}-${randomToken(8)}.${ext}`;
    const relPath = join(sub, filename);
    const absPath = join(this.root, relPath);
    await fs.mkdir(dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buf);
    return {
      storagePath: relPath.replace(/\\/g, "/"),
      size: buf.length,
      sha256: sha256Hex(buf),
      contentType: opts.contentType,
    };
  }
  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(join(this.root, storagePath));
  }
  async remove(storagePath: string): Promise<void> {
    try { await fs.unlink(join(this.root, storagePath)); } catch {}
  }
  async signedUrl(storagePath: string): Promise<string> {
    return `/api/documents/${encodeURIComponent(storagePath)}`;
  }
}

class S3Storage implements StorageAdapter {
  async put(): Promise<StoredFile> {
    logger.warn("S3 adapter is stubbed; falling back to local.");
    return new LocalStorage().put(Buffer.from([]), { contentType: "application/octet-stream" });
  }
  async read(p: string) { return new LocalStorage().read(p); }
  async remove(p: string) { return new LocalStorage().remove(p); }
  async signedUrl(p: string) { return new LocalStorage().signedUrl(p); }
}

export const storage: StorageAdapter =
  env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
