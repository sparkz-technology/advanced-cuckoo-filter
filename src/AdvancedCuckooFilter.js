/**
 * Advanced Cuckoo Filter Implementation
 * Date: 2025-06-27
 * Author: GitHub Copilot for sparkz-technology
 */

class AdvancedCuckooFilter {
  /**
   * Initialize a Cuckoo Filter
   * @param {number} capacity - The initial capacity (number of buckets)
   * @param {number} bucketSize - Number of entries per bucket (default: 4)
   * @param {number} fingerprintBits - Number of bits for fingerprint (default: 8)
   * @param {number} maxNumKicks - Maximum number of kicks for insertion (default: 500)
   */
  constructor(capacity, bucketSize = 4, fingerprintBits = 8, maxNumKicks = 500) {
    if (!capacity || capacity <= 0) {
      throw new Error("Capacity must be a positive number");
    }
    
    this.capacity = this._nextPowerOf2(capacity); // Ensure capacity is power of 2 for better hashing
    this.bucketSize = bucketSize;
    this.fingerprintBits = fingerprintBits;
    this.maxNumKicks = maxNumKicks;
    this.size = 0;
    
    // Calculate fingerprint mask based on bits (e.g., 8 bits = 0xFF)
    this.fingerprintMask = (1 << fingerprintBits) - 1;
    
    // Initialize buckets as array of arrays
    this.buckets = new Array(this.capacity);
    for (let i = 0; i < this.capacity; i++) {
      this.buckets[i] = new Array(this.bucketSize).fill(null);
    }
    
    // For stats tracking
    this.insertions = 0;
    this.kicks = 0;
  }

  /**
   * Insert an item into the filter
   * @param {*} item - The item to insert
   * @returns {boolean} - True if insertion succeeded, false otherwise
   */
  insert(item) {
    if (item === null || item === undefined) {
      throw new Error("Cannot insert null or undefined items");
    }
    
    // Generate fingerprint and calculate bucket indices
    const fingerprint = this._generateFingerprint(item);
    const hash = this._hash(item);
    
    let i1 = this._getFirstBucketIndex(hash);
    let i2 = this._getSecondBucketIndex(i1, fingerprint);
    
    // Try to insert into the first bucket
    if (this._insertIntoBucket(i1, fingerprint)) {
      this.size++;
      this.insertions++;
      return true;
    }
    
    // Try to insert into the second bucket
    if (this._insertIntoBucket(i2, fingerprint)) {
      this.size++;
      this.insertions++;
      return true;
    }
    
    // Both buckets are full, perform cuckoo kicking
    let currentIndex = Math.random() < 0.5 ? i1 : i2;
    let currentFingerprint = fingerprint;
    
    // Perform cuckoo kicking
    for (let n = 0; n < this.maxNumKicks; n++) {
      this.kicks++;
      
      // Select a random entry from the bucket
      const randPosition = Math.floor(Math.random() * this.bucketSize);
      
      // Swap fingerprints
      const oldFingerprint = this.buckets[currentIndex][randPosition];
      this.buckets[currentIndex][randPosition] = currentFingerprint;
      currentFingerprint = oldFingerprint;
      
      // Calculate the alternate location for the evicted item
      currentIndex = this._getSecondBucketIndex(currentIndex, currentFingerprint);
      
      // Try to insert the evicted item
      if (this._insertIntoBucket(currentIndex, currentFingerprint)) {
        this.size++;
        this.insertions++;
        return true;
      }
    }
    
    // Exceeded max kicks - filter is too full
    // In a production system, you might resize the filter here
    return false;
  }

  /**
   * Check if an item might be in the filter
   * @param {*} item - The item to check
   * @returns {boolean} - True if the item might be in the filter, false if definitely not
   */
  lookup(item) {
    if (item === null || item === undefined) {
      return false;
    }
    
    const fingerprint = this._generateFingerprint(item);
    const hash = this._hash(item);
    
    const i1 = this._getFirstBucketIndex(hash);
    const i2 = this._getSecondBucketIndex(i1, fingerprint);
    
    return (
      this._bucketContainsFingerprint(i1, fingerprint) ||
      this._bucketContainsFingerprint(i2, fingerprint)
    );
  }

  /**
   * Remove an item from the filter
   * @param {*} item - The item to remove
   * @returns {boolean} - True if the item was removed, false otherwise
   */
  remove(item) {
    if (item === null || item === undefined) {
      return false;
    }
    
    const fingerprint = this._generateFingerprint(item);
    const hash = this._hash(item);
    
    const i1 = this._getFirstBucketIndex(hash);
    const i2 = this._getSecondBucketIndex(i1, fingerprint);
    
    if (this._removeFromBucket(i1, fingerprint)) {
      this.size--;
      return true;
    }
    
    if (this._removeFromBucket(i2, fingerprint)) {
      this.size--;
      return true;
    }
    
    return false;
  }

  /**
   * Get the current load factor of the filter
   * @returns {number} - Current load factor (0.0 - 1.0)
   */
  getLoadFactor() {
    return this.size / (this.capacity * this.bucketSize);
  }

  /**
   * Reset the filter to empty state
   */
  clear() {
    for (let i = 0; i < this.capacity; i++) {
      this.buckets[i] = new Array(this.bucketSize).fill(null);
    }
    this.size = 0;
    this.insertions = 0;
    this.kicks = 0;
  }

  /**
   * Get statistics about the filter
   * @returns {Object} - Statistics object
   */
  getStats() {
    return {
      capacity: this.capacity,
      bucketSize: this.bucketSize,
      fingerprintBits: this.fingerprintBits,
      size: this.size,
      loadFactor: this.getLoadFactor(),
      insertions: this.insertions,
      kicks: this.kicks,
      averageKicksPerInsertion: this.insertions > 0 ? this.kicks / this.insertions : 0
    };
  }

  /**
   * Try to insert a fingerprint into a bucket
   * @private
   * @param {number} index - The bucket index
   * @param {number} fingerprint - The fingerprint to insert
   * @returns {boolean} - True if insertion succeeded, false otherwise
   */
  _insertIntoBucket(index, fingerprint) {
    const bucket = this.buckets[index];
    for (let i = 0; i < this.bucketSize; i++) {
      if (bucket[i] === null) {
        bucket[i] = fingerprint;
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a bucket contains a given fingerprint
   * @private
   * @param {number} index - The bucket index
   * @param {number} fingerprint - The fingerprint to check
   * @returns {boolean} - True if the bucket contains the fingerprint
   */
  _bucketContainsFingerprint(index, fingerprint) {
    const bucket = this.buckets[index];
    for (let i = 0; i < this.bucketSize; i++) {
      if (bucket[i] === fingerprint) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove a fingerprint from a bucket
   * @private
   * @param {number} index - The bucket index
   * @param {number} fingerprint - The fingerprint to remove
   * @returns {boolean} - True if removed, false otherwise
   */
  _removeFromBucket(index, fingerprint) {
    const bucket = this.buckets[index];
    for (let i = 0; i < this.bucketSize; i++) {
      if (bucket[i] === fingerprint) {
        bucket[i] = null;
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate first bucket index from hash
   * @private
   * @param {number} hash - The hash value
   * @returns {number} - The first bucket index
   */
  _getFirstBucketIndex(hash) {
    return hash % this.capacity;
  }

  /**
   * Calculate second bucket index using the first index and fingerprint
   * @private
   * @param {number} i1 - The first bucket index
   * @param {number} fingerprint - The item's fingerprint
   * @returns {number} - The second bucket index
   */
  _getSecondBucketIndex(i1, fingerprint) {
    // Use alternative hash function for the second bucket
    // Using fingerprint to calculate second hash
    const hash2 = this._hash2(fingerprint);
    return (i1 ^ hash2) % this.capacity;
  }

  /**
   * Generate a fingerprint for an item
   * @private
   * @param {*} item - The item
   * @returns {number} - The fingerprint value
   */
  _generateFingerprint(item) {
    // Secondary hash for the fingerprint
    const hash = this._hash(item.toString() + 'fingerprint');
    let fingerprint = hash & this.fingerprintMask;
    
    // Ensure fingerprint is never 0 (we use 0 to indicate empty)
    if (fingerprint === 0) fingerprint = 1;
    
    return fingerprint;
  }

  /**
   * Hash function for items
   * @private
   * @param {*} item - The item to hash
   * @returns {number} - A hash value
   */
  _hash(item) {
    let str = item.toString();
    let hash = 0;
    
    // Simple but effective string hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    
    // Ensure positive hash value
    return Math.abs(hash);
  }
  
  /**
   * Second hash function used for the alternate bucket calculation
   * @private
   * @param {number} value - Value to hash
   * @returns {number} - A hash value
   */
  _hash2(value) {
    // FNV-1a hash variation
    const prime = 16777619;
    let hash = 2166136261;
    
    // Convert to string to hash
    const str = value.toString();
    
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash *= prime;
    }
    
    return Math.abs(hash);
  }
  
  /**
   * Find the next power of 2
   * @private
   * @param {number} n - The input number
   * @returns {number} - The next power of 2
   */
  _nextPowerOf2(n) {
    n--; // Handle case when n is already a power of 2
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
    return n;
  }
}

module.exports = AdvancedCuckooFilter;