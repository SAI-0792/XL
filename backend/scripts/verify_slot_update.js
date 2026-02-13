const http = require('http');

const updateSlot = (slotId, status) => {
    return new Promise((resolve, reject) => {
        // Use the requested JSON structure: { "slot_id": 1, "status": "FREE", "distance": 120 }
        // We will pass slot_id as number if it looks like a number in the test, 
        // but here the helper function takes slotId. We'll parse it.
        const numericId = parseInt(slotId.replace('A', '')) || slotId;

        const data = JSON.stringify({
            slot_id: numericId, // Send as number: 1, 2, 3...
            status: status,
            distance: status === 'FREE' ? 120 : 10 // Mock distance
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/slots/slot-update',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsedBody = JSON.parse(body);
                    resolve({ status: res.statusCode, body: parsedBody });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
};

const getSlots = () => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/slots',
            method: 'GET'
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.end();
    });
};

const runTests = async () => {
    console.log("Starting Verification for Slot Update API (Numeric ID)...");

    // We want to test that sending "slot_id": 1 maps to "A1" (or "1" if using strict mapping)
    // The controller logic now supports 1 -> A1. 
    // And also we want to test "A3" if A1 doesn't exist.
    // Let's assume A3 exists (from previous test). So we'll send "3".
    const testSlotNumeric = 1;
    const expectedSlotNumber = "A1";

    try {
        console.log("Triggering DB seed via GET /api/slots...");
        const slotsRes = await getSlots();
        // console.log("Slots response:", JSON.stringify(slotsRes).substring(0, 200) + "...");

        console.log(`\n[Test 1] Setting ID ${testSlotNumeric} to OCCUPIED...`);
        const res1 = await updateSlot(String(testSlotNumeric), "OCCUPIED");
        console.log(`Status: ${res1.status}`);
        console.log('Response:', res1.body);

        console.log(`\n[Test 2] Setting ID ${testSlotNumeric} to FREE...`);
        const res2 = await updateSlot(String(testSlotNumeric), "FREE");
        console.log(`Status: ${res2.status}`);
        console.log('Response:', res2.body);

        console.log("\nVerification Complete.");
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error("\nERROR: Connection refused. Please ensure the backend server is running on port 5000.");
        } else {
            console.error("\nERROR:", error);
        }
    }
};

runTests();
