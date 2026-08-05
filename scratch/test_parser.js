function parseMarkdown(text) {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Code blocks: ```language ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="bg-slate-950 border border-slate-800/85 rounded-lg p-3 my-2.5 overflow-x-auto font-mono text-[10px] text-cyan-100 leading-relaxed"><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // 2. Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-slate-950/70 border border-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-cyan-300">$1</code>');

  // 3. Process Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-cyan-300">$1</strong>');

  // 4. Process Headers
  html = html.replace(/^### (.*?)$/gm, '<h4 class="font-bold text-cyan-200 text-xs mt-3 mb-1">$1</h4>');
  html = html.replace(/^## (.*?)$/gm, '<h3 class="font-bold text-cyan-200 text-sm mt-4 mb-1.5">$1</h3>');
  html = html.replace(/^# (.*?)$/gm, '<h2 class="font-black text-white text-base mt-5 mb-2">$1</h2>');

  // 5. Lists (Unordered & Ordered)
  const lines = html.split('\n');
  let inUl = false;
  let inOl = false;
  let insidePre = false;
  
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('<pre') || trimmed.includes('class="language-')) {
      insidePre = true;
    }
    if (insidePre) {
      if (trimmed.endsWith('</pre>')) {
        insidePre = false;
      }
      return line;
    }

    // Unordered List Match (•, -, *)
    const ulMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    if (ulMatch) {
      let prefix = '';
      if (inOl) {
        inOl = false;
        prefix += '</ol>';
      }
      if (!inUl) {
        inUl = true;
        prefix += '<ul class="my-2 space-y-1 list-disc pl-4 text-slate-300">';
      }
      return `${prefix}<li class="pl-0.5">${ulMatch[2]}</li>`;
    }

    // Ordered List Match (1., 2.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      let prefix = '';
      if (inUl) {
        inUl = false;
        prefix += '</ul>';
      }
      if (!inOl) {
        inOl = true;
        prefix += '<ol class="my-2 space-y-1 list-decimal pl-4 text-slate-300">';
      }
      return `${prefix}<li class="pl-0.5">${olMatch[2]}</li>`;
    }

    let closeLists = '';
    if (inUl) {
      inUl = false;
      closeLists += '</ul>';
    }
    if (inOl) {
      inOl = false;
      closeLists += '</ol>';
    }

    return closeLists ? `${closeLists}${line}` : line;
  });

  if (inUl) processed.push('</ul>');
  if (inOl) processed.push('</ol>');

  html = processed.join('\n');

  // 6. Process links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 font-semibold underline hover:text-cyan-300 transition-colors">$1</a>');

  // 7. Line breaks
  const finalLines = html.split('\n');
  let currentPre = false;
  let currentList = false;
  
  html = finalLines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<pre')) currentPre = true;
    if (trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) currentList = true;
    
    let result = line;
    const isBlockTag = trimmed.startsWith('<ul') || trimmed.startsWith('</ul>') || 
                       trimmed.startsWith('<ol') || trimmed.startsWith('</ol>') || 
                       trimmed.startsWith('<li') || trimmed.startsWith('</li>') || 
                       trimmed.startsWith('<pre') || trimmed.startsWith('</pre>') ||
                       trimmed.startsWith('<h2') || trimmed.startsWith('<h3') || trimmed.startsWith('<h4');
                       
    if (!currentPre && !currentList && !isBlockTag && trimmed.length > 0) {
      result += '<br />';
    }
    
    if (trimmed.endsWith('</pre>')) currentPre = false;
    if (trimmed.endsWith('</ul>') || trimmed.endsWith('</ol>')) currentList = false;
    
    return result;
  }).join('\n');

  return html;
}

const sampleMarkdown = `
### Summary of Skills
Here is what Sathya offers:
* **Frontend**: React and Next.js
* **Backend**: Node.js and FastAPI
* **DevOps**: Docker and AWS

Let's look at code:
\`\`\`javascript
const name = "Sathya";
console.log(name);
\`\`\`

You can read my resume [here](/resume.pdf).
`;

console.log("Input markdown:");
console.log(sampleMarkdown);
console.log("\nParsed output:");
console.log(parseMarkdown(sampleMarkdown));
