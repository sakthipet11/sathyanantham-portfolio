import assert from 'node:assert';
import { parseMarkdown } from '../AITwinDrawer';

console.log('Running parseMarkdown security tests...');

// Test 1: Standard markdown formatting
{
  const input = '**Bold text** and [Link](https://example.com)';
  const output = parseMarkdown(input);
  assert(output.includes('<strong class="font-bold text-primary">Bold text</strong>'), 'Bold formatting should work');
  assert(output.includes('href="https://example.com"'), 'Links should be preserved');
  assert(output.includes('target="_blank"'), 'Target attribute on links should be preserved');
}

// Test 2: XSS via <script> tag
{
  const input = 'Hello <script>alert("xss")</script> World';
  const output = parseMarkdown(input);
  assert(!output.includes('<script>'), '<script> tag should not be present as executable HTML');
  assert(output.includes('&lt;script&gt;'), '<script> tag should be HTML escaped');
}

// Test 3: XSS via inline javascript: link
{
  const input = '[Click](javascript:alert("xss"))';
  const output = parseMarkdown(input);
  assert(!output.includes('javascript:'), 'javascript: protocol should be stripped by DOMPurify');
  assert(output.includes('<a target="_blank"'), 'Link tag should remain but without dangerous href');
}

// Test 4: Sanitizes HTML tags if raw HTML was somehow injected
{
  const input = 'Raw html: <iframe src="https://evil.com"></iframe>';
  const output = parseMarkdown(input);
  assert(!output.includes('<iframe'), '<iframe tag should be HTML escaped');
  assert(output.includes('&lt;iframe'), 'HTML tags should be escaped');
}

// Test 5: Markdown table rendering
{
  const tableInput = '| Company | Role |\n|---|---|\n| Nextuple | Lead Software Engineer |';
  const output = parseMarkdown(tableInput);
  assert(output.includes('<table'), 'Should render HTML <table> tag');
  assert(output.includes('<th'), 'Should render HTML <th> tag');
  assert(output.includes('<td'), 'Should render HTML <td> tag');
  assert(output.includes('Nextuple'), 'Should contain table text');
}

console.log('All parseMarkdown security and table rendering tests passed successfully!');
