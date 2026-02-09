import { Injectable } from "@nestjs/common";

export interface TokenEntry {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class TokenCache {
  private readonly cache = new Map<string, TokenEntry>();

  get(key: string): TokenEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, entry: TokenEntry): void {
    this.cache.set(key, entry);
  }
}
