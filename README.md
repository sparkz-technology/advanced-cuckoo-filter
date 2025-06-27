# Advanced Cuckoo Filter

A high-performance JavaScript implementation of a Cuckoo Filter, a probabilistic data structure that supports approximate membership queries with better space efficiency and performance characteristics compared to Bloom Filters.

## Features

- **Efficient Membership Testing**: Fast approximate membership testing with controllable false positive rate
- **Element Deletion Support**: Unlike Bloom filters, Cuckoo filters support element deletion
- **Configurable Parameters**: Adjust bucket size, fingerprint length, and other parameters
- **High Load Factor**: Works efficiently even at high occupancy rates
- **Performance Monitoring**: Built-in statistics tracking

## Usage

```javascript
const AdvancedCuckooFilter = require('./AdvancedCuckooFilter');

// Create a new filter with initial capacity of 1000 items
// bucketSize = 4, fingerprintBits = 8
const filter = new AdvancedCuckooFilter(1000, 4, 8);

// Insert items
filter.insert('apple');
filter.insert('banana');

// Check membership
console.log(filter.lookup('apple'));  // true
console.log(filter.lookup('grape'));  // false (true would be a false positive)

// Remove items
filter.remove('apple');
console.log(filter.lookup('apple'));  // false

// Get statistics
console.log(filter.getStats());
```

## API

### Constructor

```javascript
const filter = new AdvancedCuckooFilter(capacity, bucketSize, fingerprintBits, maxNumKicks);
```

- `capacity`: Initial number of buckets (will be rounded to next power of 2)
- `bucketSize`: Number of entries per bucket (default: 4)
- `fingerprintBits`: Number of bits for fingerprint (default: 8)
- `maxNumKicks`: Maximum number of kicks for insertion (default: 500)

### Methods

- `insert(item)`: Insert an item into the filter. Returns `true` if successful.
- `lookup(item)`: Check if an item might be in the filter. Returns `true` if the item might be present.
- `remove(item)`: Remove an item from the filter. Returns `true` if successful.
- `clear()`: Remove all items from the filter.
- `getLoadFactor()`: Returns the current load factor (between 0 and 1).
- `getStats()`: Returns detailed statistics about the filter.

## Implementation Details

This cuckoo filter implementation uses:

1. **Two Hash Functions**: To determine the two possible bucket locations for each item
2. **Fingerprinting**: Instead of storing the full items, we store small fingerprints
3. **Cuckoo Hashing**: Items that cannot be placed directly are inserted using the cuckoo displacement strategy
4. **Power-of-2 Sizing**: Bucket count is always a power of 2 for efficient modulo operations

## Performance Considerations

- **Fingerprint Size**: Larger fingerprints reduce false positives but increase memory usage
- **Bucket Size**: Larger bucket sizes increase the load factor threshold but may slow down lookups
- **Load Factor**: Performance degrades as the filter approaches its capacity