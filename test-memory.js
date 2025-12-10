// Simple test to verify memory system is working
const { MemoryServiceClient } = require('./webview-ui/src/services/grpc-client');

async function testMemorySystem() {
    try {
        console.log('Testing memory system...');
        
        // Test storing a memory
        const storeRequest = {
            key: 'test-key',
            value: 'test-value',
            metadata: {
                source: 'test',
                timestamp: Date.now()
            }
        };
        
        console.log('Sending store request:', storeRequest);
        const storeResponse = await MemoryServiceClient.StoreMemory(storeRequest);
        console.log('Store response:', storeResponse);
        
        // Test retrieving the memory
        const retrieveRequest = {
            key: 'test-key'
        };
        
        console.log('Sending retrieve request:', retrieveRequest);
        const retrieveResponse = await MemoryServiceClient.RetrieveMemory(retrieveRequest);
        console.log('Retrieve response:', retrieveResponse);
        
        console.log('Memory system test completed successfully!');
    } catch (error) {
        console.error('Memory system test failed:', error);
    }
}

testMemorySystem();
