import AdvancedCuckooFilter from './src/AdvancedCuckooFilter.js';

(async () => {
  const filter = new AdvancedCuckooFilter({
    autoPersist: false,
    bucketCount: 2 ** 12,
    persistPath: './filter-data.parquet'
  });

  await filter.init();

  filter.setHooks({
    onInsert: (item) => console.log(`Inserted: ${item}`),
    onDelete: (item) => console.log(`Deleted: ${item}`),
    onResize: (newSize) => console.log(`Resized to: ${newSize} buckets`)
  });

  console.log('Inserting...');
  await filter.insert('apple');
  await filter.insert('banana');
  await filter.insert('orange');

  console.log('Checking contains...');
  console.log('apple:', filter.contains('apple'));   // true
  console.log('banana:', filter.contains('banana')); // true
  console.log('grape:', filter.contains('grape'));   // false (probably)

  console.log('Deleting apple...');
  await filter.delete('apple');
  console.log('apple:', filter.contains('apple'));   // false

  console.log('Saving to Parquet...');
  await filter.saveToParquet('./filter-data.parquet');

  console.log('Loading from Parquet...');
  await filter.loadFromParquet('./filter-data.parquet');
  console.log('banana:', filter.contains('banana')); // true

  console.log('Stats:', filter.stats());
})();
