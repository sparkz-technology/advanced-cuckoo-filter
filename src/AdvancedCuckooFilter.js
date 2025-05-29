import crypto from 'crypto';
import fs from 'fs/promises';
import parquet from 'parquetjs-lite';

class AdvancedCuckooFilter {
    constructor({
        bucketCount = 2 ** 16,
        bucketSize = 4,
        fingerprintSize = 1, // bytes
        maxKicks = 500,
        autoPersist = false,
        persistPath = './cuckoo-filter.parquet',
        hashAlgorithm = 'sha256' // allow different hashing algorithms
    } = {}) {
        this.bucketCount = bucketCount;
        this.bucketSize = bucketSize;
        this.fingerprintSize = fingerprintSize;
        this.maxKicks = maxKicks;
        this.autoPersist = autoPersist;
        this.persistPath = persistPath;
        this.hashAlgorithm = hashAlgorithm;
        this.buckets = Array.from({ length: bucketCount }, () => []);
        this.hooks = {};
    }

    async init() {
        try {
            await fs.access(this.persistPath);
            if (this.persistPath.endsWith('.parquet')) {
                await this.loadFromParquet(this.persistPath);
            } else if (this.persistPath.endsWith('.json')) {
                await this.loadFromJSON(this.persistPath);
            }
            console.log('Filter loaded from file.');
        } catch {
            console.log('No existing filter found. Starting fresh.');
        }
    }

    setHooks({ onInsert, onDelete, onResize } = {}) {
        this.hooks = { onInsert, onDelete, onResize };
    }

    _hash(data, seed = 0) {
        // Use a Buffer to combine seed and data for hashing
        const seedBuffer = Buffer.alloc(4);
        seedBuffer.writeUInt32BE(seed);
        return crypto
            .createHash(this.hashAlgorithm)
            .update(Buffer.concat([seedBuffer, Buffer.from(data)]))
            .digest();
    }

    _fingerprint(item) {
        return this._hash(item).slice(0, this.fingerprintSize);
    }

    _index(item) {
        return this._hash(item).readUInt32BE(0) % this.bucketCount;
    }

    _altIndex(fp, index) {
        const fpHash = this._hash(fp.toString('hex'), 1);
        const raw = index ^ fpHash.readUInt32BE(0);
        return ((raw % this.bucketCount) + this.bucketCount) % this.bucketCount;
    }


    _tryInsert(index, fp) {
        const bucket = this.buckets[index];
        if (bucket.length < this.bucketSize) {
            bucket.push(fp);
            return true;
        }
        return false;
    }

    async insert(item) {
        const fp = this._fingerprint(item);
        const i1 = this._index(item);
        const i2 = this._altIndex(fp, i1);

        if (this._tryInsert(i1, fp) || this._tryInsert(i2, fp)) {
            if (this.hooks?.onInsert) this.hooks.onInsert(item, fp);
            if (this.autoPersist) await this.save(this.persistPath);
            return true;
        }

        let index = Math.random() < 0.5 ? i1 : i2;
        let currentFp = fp;

        for (let n = 0; n < this.maxKicks; n++) {
            const bucket = this.buckets[index];
            const rand = Math.floor(Math.random() * bucket.length);
            [currentFp, bucket[rand]] = [bucket[rand], currentFp];
            index = this._altIndex(currentFp, index);
            if (this._tryInsert(index, currentFp)) {
                if (this.hooks?.onInsert) this.hooks.onInsert(item, fp);
                if (this.autoPersist) await this.save(this.persistPath);
                return true;
            }
        }

        this._resize();
        if (this.hooks?.onResize) this.hooks.onResize(this.bucketCount);
        return this.insert(item);
    }

    contains(item) {
        const fp = this._fingerprint(item);
        const i1 = this._index(item);
        const i2 = this._altIndex(fp, i1);
        return (
            this.buckets[i1].some(b => b.equals(fp)) ||
            this.buckets[i2].some(b => b.equals(fp))
        );
    }

    async delete(item) {
        const fp = this._fingerprint(item);
        const i1 = this._index(item);
        const i2 = this._altIndex(fp, i1);

        const b1 = this.buckets[i1];
        const i = b1.findIndex(b => b.equals(fp));
        if (i !== -1) {
            b1.splice(i, 1);
            if (this.hooks?.onDelete) this.hooks.onDelete(item, fp);
            if (this.autoPersist) await this.save(this.persistPath);
            return true;
        }

        const b2 = this.buckets[i2];
        const j = b2.findIndex(b => b.equals(fp));
        if (j !== -1) {
            b2.splice(j, 1);
            if (this.hooks?.onDelete) this.hooks.onDelete(item, fp);
            if (this.autoPersist) await this.save(this.persistPath);
            return true;
        }

        return false;
    }

    _resize() {
        const oldBuckets = this.buckets;
        this.bucketCount *= 2;
        this.buckets = Array.from({ length: this.bucketCount }, () => []);
        for (const bucket of oldBuckets) {
            for (const fp of bucket) {
                const i1 = this._index(fp.toString('hex'));
                const i2 = this._altIndex(fp, i1);
                if (!this._tryInsert(i1, fp) && !this._tryInsert(i2, fp)) {
                    throw new Error('Resize failed');
                }
            }
        }
    }

    stats() {
        let total = 0;
        for (const bucket of this.buckets) total += bucket.length;
        return {
            items: total,
            capacity: this.bucketCount * this.bucketSize,
            loadFactor: total / (this.bucketCount * this.bucketSize),
            bucketCount: this.bucketCount,
            bucketSize: this.bucketSize
        };
    }

    async saveToParquet(filePath) {
        const schema = new parquet.ParquetSchema({
            fingerprint: { type: 'BYTE_ARRAY' }
        });

        const writer = await parquet.ParquetWriter.openFile(schema, filePath);
        for (const bucket of this.buckets) {
            for (const fp of bucket) {
                await writer.appendRow({ fingerprint: fp });
            }
        }
        await writer.close();
    }

    async loadFromParquet(filePath) {
        const reader = await parquet.ParquetReader.openFile(filePath);
        const cursor = reader.getCursor();
        let record;
        while ((record = await cursor.next())) {
            const fp = record.fingerprint;
            const i1 = this._index(fp.toString('hex'));
            const i2 = this._altIndex(fp, i1);
            if (!this._tryInsert(i1, fp) && !this._tryInsert(i2, fp)) {
                this._resize();
                const i1_new = this._index(fp.toString('hex'));
                const i2_new = this._altIndex(fp, i1_new);
                this._tryInsert(i1_new, fp) || this._tryInsert(i2_new, fp);
            }
        }
        await reader.close();
    }

    async saveToJSON(filePath) {
        const data = this.buckets.map(bucket =>
            bucket.map(fp => fp.toString('hex'))
        );
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    async loadFromJSON(filePath) {
        const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
        this.buckets = data.map(bucket =>
            bucket.map(hex => Buffer.from(hex, 'hex'))
        );
    }

    async save(filePath) {
        if (filePath.endsWith('.parquet')) {
            await this.saveToParquet(filePath);
        } else if (filePath.endsWith('.json')) {
            await this.saveToJSON(filePath);
        } else {
            throw new Error('Unsupported file extension for saving. Use .parquet or .json');
        }
    }

    async load(filePath) {
        if (filePath.endsWith('.parquet')) {
            await this.loadFromParquet(filePath);
        } else if (filePath.endsWith('.json')) {
            await this.loadFromJSON(filePath);
        } else {
            throw new Error('Unsupported file extension for loading. Use .parquet or .json');
        }
    }
}

export default AdvancedCuckooFilter;
