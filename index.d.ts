/// <reference types="node" />

declare module 'advanced-cuckoo-filter' {
  import { Buffer } from 'node:buffer';

  export interface CuckooFilterOptions {
    bucketCount?: number;
    bucketSize?: number;
    fingerprintSize?: number; // in bytes
    maxKicks?: number;
    autoPersist?: boolean;
    persistPath?: string;
    hashAlgorithm?: string;
  }

  export interface CuckooFilterHooks {
    onInsert?: (item: string, fingerprint: Buffer) => void;
    onDelete?: (item: string, fingerprint: Buffer) => void;
    onResize?: (newBucketCount: number) => void;
  }

  export interface CuckooStats {
    items: number;
    capacity: number;
    loadFactor: number;
    bucketCount: number;
    bucketSize: number;
  }

  export default class AdvancedCuckooFilter {
    constructor(options?: CuckooFilterOptions);

    init(): Promise<void>;

    setHooks(hooks?: CuckooFilterHooks): void;

    insert(item: string): Promise<boolean>;

    contains(item: string): boolean;

    delete(item: string): Promise<boolean>;

    stats(): CuckooStats;

    save(filePath: string): Promise<void>;

    load(filePath: string): Promise<void>;

    saveToParquet(filePath: string): Promise<void>;

    loadFromParquet(filePath: string): Promise<void>;

    saveToJSON(filePath: string): Promise<void>;

    loadFromJSON(filePath: string): Promise<void>;
  }
}
