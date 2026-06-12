const assert = require('assert');
const commerceRouter = require('../src/routes/commerce');
const { getCategoryDepth, getSubtreeHeight, hasCycle, generateSlug } = commerceRouter.helpers;

console.log("Running commerce helpers unit tests...");

// Test generateSlug
assert.strictEqual(generateSlug("Привет Мир!"), "privet-mir");
assert.strictEqual(generateSlug("Ноутбук Apple MacBook Pro 16"), "noutbuk-apple-macbook-pro-16");
console.log("✓ generateSlug tests passed");

// Mock categories structure
const mockCategories = [
    { id: 'cat_1', name: 'Одежда', parentId: null },
    { id: 'cat_2', name: 'Обувь', parentId: null },
    { id: 'cat_1_1', name: 'Мужская одежда', parentId: 'cat_1' },
    { id: 'cat_1_2', name: 'Женская одежда', parentId: 'cat_1' },
    { id: 'cat_1_1_1', name: 'Куртки мужские', parentId: 'cat_1_1' },
    { id: 'cat_1_1_2', name: 'Джинсы мужские', parentId: 'cat_1_1' }
];

// Test getCategoryDepth
assert.strictEqual(getCategoryDepth(mockCategories, 'cat_1'), 1);
assert.strictEqual(getCategoryDepth(mockCategories, 'cat_1_1'), 2);
assert.strictEqual(getCategoryDepth(mockCategories, 'cat_1_1_1'), 3);
console.log("✓ getCategoryDepth tests passed");

// Test getSubtreeHeight
assert.strictEqual(getSubtreeHeight(mockCategories, 'cat_1_1_1'), 1); // no children
assert.strictEqual(getSubtreeHeight(mockCategories, 'cat_1_1'), 2); // cat_1_1 -> cat_1_1_1
assert.strictEqual(getSubtreeHeight(mockCategories, 'cat_1'), 3); // cat_1 -> cat_1_1 -> cat_1_1_1
console.log("✓ getSubtreeHeight tests passed");

// Test hasCycle
assert.strictEqual(hasCycle(mockCategories, 'cat_1', 'cat_2'), false);
assert.strictEqual(hasCycle(mockCategories, 'cat_1_1', 'cat_1_1_1'), true); // parent is child
assert.strictEqual(hasCycle(mockCategories, 'cat_1', 'cat_1_1_1'), true); // target parent is grandchild
assert.strictEqual(hasCycle(mockCategories, 'cat_1_1', 'cat_1_1'), true); // self loop
console.log("✓ hasCycle tests passed");

console.log("All commerce helper tests passed successfully!");
