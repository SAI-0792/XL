
import fetch from 'node-fetch'; // If available, or use global fetch in Node 18+
// Since we don't know if node-fetch is installed and don't want to install it, we'll try to use global fetch or http.
// Actually, let's use standard http module to be safe and dependency-free for this script.

import http from 'http';

const updateSlot = (slotId: string, status: string) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            slot_id: slotId,
            status: status,
            distance: 100
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
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
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
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

const runTests = async () => {
    console.log("Starting Verification for Slot Update API...");
    const slotId = "A1";

    try {
        // Test 1: OCCUPIED
        console.log("\n[Test 1] Setting A1 to OCCUPIED...");
        const res1: any = await updateSlot(slotId, "OCCUPIED");
        console.log(`Status: ${res1.status}, Response:`, res1.body);

        // Test 2: FREE
        console.log("\n[Test 2] Setting A1 to FREE...");
        const res2: any = await updateSlot(slotId, "FREE");
        console.log(`Status: ${res2.status}, Response:`, res2.body);

        console.log("\nVerification Complete.");
    } catch (error: any) {
        if (error.code === 'ECONNREFUSED') {
            console.error("\nERROR: Connection refused. Please ensure the backend server is running on port 5000.");
        } else {
            console.error("\nERROR:", error);
        }
    }
};

runTests();
