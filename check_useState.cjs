const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.js')) results.push(file);
    }
  });
  return results;
}
walk('.').forEach(f => {
  const code = fs.readFileSync(f, 'utf8');
  if (code.match(/(?<!\.)useState\(/)) {
    if (!code.match(/import.*useState.*from/)) {
      console.log("Missing import in:", f);
    }
  }
});
