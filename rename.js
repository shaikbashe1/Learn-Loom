const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace case variants
    const newContent = content
      .replace(/Quovexi/g, 'Quovexi')
      .replace(/Quovexi/g, 'Quovexi')
      .replace(/quovexi/g, 'quovexi');
      
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .git, dist
      if (['node_modules', '.git', 'dist', 'supabase'].includes(file)) continue;
      walkDir(fullPath);
    } else {
      // Only process text files
      if (['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.json', '.md'].some(ext => file.endsWith(ext))) {
        replaceInFile(fullPath);
      }
    }
  }
}

const rootDir = 'C:\\Users\\dell\\Learn-Loom';
walkDir(rootDir);
console.log('Renaming complete.');
