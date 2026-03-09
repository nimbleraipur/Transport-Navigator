const fetch = globalThis.fetch || require('node-fetch');

async function testLogin() {
    try {
        const res = await fetch('http://127.0.0.1:5000/api/auth/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: '9999999999', password: 'admin123' })
        });

        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log('Response Body:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', json);
        } catch (e) {
            console.log('Not valid JSON');
        }
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

testLogin();
