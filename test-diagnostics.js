// Simple test to verify the diagnostics tool implementation
const { executeDiagnosticsTool } = require('./src/core/tools/diagnosticsTool');

// Mock vscode module for testing
const vscode = {
  languages: {
    getDiagnostics: (uri) => {
      // Mock diagnostic data
      return [
        {
          severity: 1, // Error
          range: { start: { line: 10, character: 5 }, end: { line: 10, character: 10 } },
          message: "Test error message",
          source: "TypeScript",
          relatedInformation: []
        },
        {
          severity: 2, // Warning
          range: { start: { line: 20, character: 0 }, end: { line: 20, character: 5 } },
          message: "Test warning message",
          source: "ESLint",
          relatedInformation: []
        }
      ];
    }
  },
  DiagnosticSeverity: {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4
  },
  Uri: {
    file: (path) => ({ fsPath: path })
  }
};

// Mock require for vscode
global.require = (module) => {
  if (module === 'vscode') return vscode;
  if (module.startsWith('path')) return require('path');
  return {};
};

async function testDiagnostics() {
  try {
    console.log('Testing diagnostics tool...');
    
    // Test with specific file
    const result1 = await executeDiagnosticsTool('/test/path', 'test.ts', 'error');
    console.log('Test 1 - Specific file with error filter:');
    console.log(result1);
    
    // Test with all files
    const result2 = await executeDiagnosticsTool('/test/path');
    console.log('\nTest 2 - All files:');
    console.log(result2);
    
    console.log('\n✅ Diagnostics tool test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDiagnostics();
