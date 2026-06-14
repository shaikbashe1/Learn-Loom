const http = require('http');

const runtimes = [
  {
    language: 'python',
    code: 'print("Hello Python")'
  },
  {
    language: 'c',
    code: '#include <stdio.h>\nint main() {\n    printf("Hello C\\n");\n    return 0;\n}'
  },
  {
    language: 'c++',
    code: '#include <iostream>\nint main() {\n    std::cout << "Hello C++" << std::endl;\n    return 0;\n}'
  },
  {
    language: 'java',
    code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java");\n    }\n}'
  }
];

function testRuntime(runtime) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      language: runtime.language,
      version: '*',
      files: [{ content: runtime.code }]
    });

    const req = http.request('http://20.193.241.97:2000/api/v2/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.run && parsed.run.code === 0) {
            console.log(`[PASS] ${runtime.language}: ${parsed.run.stdout.trim()}`);
          } else {
            console.error(`[FAIL] ${runtime.language}:`, parsed.compile || parsed.run?.stderr || body);
          }
        } catch (e) {
          console.error(`[ERROR] ${runtime.language} parsing error:`, e.message, 'Raw response:', body);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.error(`[ERROR] ${runtime.language} connection failed:`, err.message);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function runAll() {
  console.log('Starting self-hosted Piston runtime verification...\n');
  for (const rt of runtimes) {
    await testRuntime(rt);
  }
  console.log('\nVerification complete.');
}

runAll();
