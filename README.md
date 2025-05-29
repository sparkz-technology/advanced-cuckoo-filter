# Advanced Cuckoo Filter

An advanced, persistent, and resizable Cuckoo Filter for Node.js with Parquet and JSON storage support.

## Features

- Auto persistence to Parquet or JSON
- Dynamic resizing
- Fast insert, delete, and lookup operations
- Usage statistics and hooks for custom logic

## Installation

```bash
npm install advanced-cuckoo-filter
```

## Usage

```javascript
import AdvancedCuckooFilter from 'advanced-cuckoo-filter';

const filter = new AdvancedCuckooFilter({
  autoPersist: true,
  persistPath: './filter.parquet',
});

await filter.init();

await filter.insert('hello');
console.log(filter.contains('hello')); // true
```

## API

### constructor(options)

Create a new instance of the filter.

- `options.autoPersist` (boolean): Automatically save changes.
- `options.persistPath` (string): File path for persistence (.parquet or .json).

### async init()

Initialize the filter (loads persisted data if available).

### async insert(item)

Insert an item into the filter.

### contains(item)

Check if the item exists in the filter.

### async delete(item)

Remove an item from the filter.

### async saveToParquet(filePath)

Manually save the filter state to a Parquet file.

### async loadFromParquet(filePath)

Load the filter state from a Parquet file.

### setHooks(hooks)

Set hooks for custom actions on insert, delete, etc.

### stats()

Get usage statistics.

---

## Summary

Advanced Cuckoo Filter is a Node.js library implementing a high-performance Cuckoo Filter with support for persistence and dynamic resizing. It can efficiently handle membership testing with probabilistic guarantees, while providing the ability to save and restore filter state using Parquet or JSON files.

### Key Highlights

- Persistence via Parquet/JSON for stateful filters
- Dynamic resizing to handle growing datasets
- Fast insert, delete, and contains queries
- Custom hooks for operation lifecycle events
- Usage statistics for monitoring filter health and capacity

### Use Cases

- Duplicate detection in streaming data
- Memory-efficient cache invalidation
- Approximate membership queries in large-scale applications

---

