#!/usr/bin/env node

/**
 * BrandForge - Brand Identity Generator
 * Main entry point
 */

const packageJson = require('../package.json');

console.log('🔨 Welcome to BrandForge!');
console.log('A powerful brand identity generator and management tool.');
console.log('');
console.log(`Version: ${packageJson.version}`);
console.log('');
console.log('For more information, visit:');
console.log('https://github.com/cowboybebopbebopbbop/brandforge');

module.exports = {
  version: packageJson.version,
  name: 'BrandForge'
};
