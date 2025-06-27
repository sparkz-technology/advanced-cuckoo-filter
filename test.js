const AdvancedCuckooFilter = require('./src/AdvancedCuckooFilter');

// Create a new cuckoo filter with initial capacity of 1000 items
const filter = new AdvancedCuckooFilter(1000, 4, 8);

// Test basic insertion and lookup
console.log('\n----- Basic Operations Test -----');
filter.insert('apple');
filter.insert('banana');
filter.insert('cherry');

console.log(`Contains 'apple'? ${filter.lookup('apple')}`);
console.log(`Contains 'banana'? ${filter.lookup('banana')}`);
console.log(`Contains 'cherry'? ${filter.lookup('cherry')}`);
console.log(`Contains 'grape'? ${filter.lookup('grape')}`);

// Test removal
console.log('\n----- Removal Test -----');
console.log(`Removed 'banana': ${filter.remove('banana')}`);
console.log(`Contains 'banana' after removal? ${filter.lookup('banana')}`);
console.log(`Contains 'apple' after removal? ${filter.lookup('apple')}`);

// Test false positive rate
console.log('\n----- False Positive Test -----');
// Insert many items
for (let i = 0; i < 10000; i++) {
  filter.insert(`item-${i}`);
}

// Check false positives
let falsePositives = 0;
const testSize = 10000;
for (let i = 0; i < testSize; i++) {
  if (filter.lookup(`non-existent-${i}`)) {
    falsePositives++;
  }
}

console.log(`Inserted 10,000 items`);
console.log(`False positive count: ${falsePositives} out of ${testSize} lookups`);
console.log(`False positive rate: ${(falsePositives / testSize * 100).toFixed(4)}%`);

// Performance test
console.log('\n----- Performance Test -----');
const largeFilter = new AdvancedCuckooFilter(100000, 4, 12);
const largeInsertCount = 50000;

console.time('Insert performance');
for (let i = 0; i < largeInsertCount; i++) {
  largeFilter.insert(`perf-item-${i}`);
}
console.timeEnd('Insert performance');

console.time('Lookup performance');
for (let i = 0; i < largeInsertCount; i++) {
  largeFilter.lookup(`perf-item-${i}`);
}
console.timeEnd('Lookup performance');

// Print stats
console.log('\n----- Filter Statistics -----');
console.log(filter.getStats());

// Test high load factor
console.log('\n----- High Load Factor Test -----');
const smallFilter = new AdvancedCuckooFilter(32, 4, 8);
let insertedCount = 0;

// Try to fill it up
for (let i = 0; i < 200; i++) {
  const success = smallFilter.insert(`highload-${i}`);
  if (success) {
    insertedCount++;
  } else {
    console.log(`Failed to insert after ${insertedCount} items`);
    break;
  }
}

console.log(`Successfully inserted ${insertedCount} items`);
console.log(`Final load factor: ${smallFilter.getLoadFactor().toFixed(2)}`);
console.log(`Kicks performed: ${smallFilter.getStats().kicks}`);