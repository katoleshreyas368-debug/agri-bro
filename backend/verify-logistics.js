const fetch = require('node-fetch'); // You might need to install node-fetch or run with node v18+

const BASE_URL = 'http://localhost:3000/logistics';
const FARMER_TOKEN = 'demo_farmer_token';
const TRANSPORTER_TOKEN = 'demo_transporter_token';

async function runTest() {
    try {
        console.log('--- 1. Creating Request as Farmer ---');
        const createRes = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FARMER_TOKEN}` },
            body: JSON.stringify({
                cropType: 'Test Crop',
                quantity: 100,
                fromLocation: 'A',
                toLocation: 'B',
                requestedDate: '2023-01-01'
            })
        });
        const newReq = await createRes.json();
        console.log('Created:', newReq.id, newReq.status);

        if (!newReq.id) throw new Error('Failed to create request');

        console.log('\n--- 2. Accepting Request as Transporter ---');
        const acceptRes = await fetch(`${BASE_URL}/${newReq.id}/accept`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${TRANSPORTER_TOKEN}` }
        });
        const acceptData = await acceptRes.json();
        console.log('Accept Response:', acceptData);

        console.log('\n--- 3. Verify Status is Accepted ---');
        const verifyRes = await fetch(BASE_URL);
        const all = await verifyRes.json();
        const myReq = all.find(r => r.id === newReq.id);
        console.log('Current Status:', myReq.status);

        if (myReq.status !== 'accepted') throw new Error('Status failed to update to accepted');

        console.log('\n--- 4. Starting Trip ---');
        await fetch(`${BASE_URL}/${newReq.id}/start`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${TRANSPORTER_TOKEN}` }
        });

        console.log('\n--- 5. Completing Trip ---');
        await fetch(`${BASE_URL}/${newReq.id}/complete`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${TRANSPORTER_TOKEN}` }
        });

        console.log('\n✅ TEST PASSED');

    } catch (err) {
        console.error('\n❌ TEST FAILED:', err);
    }
}

runTest();
