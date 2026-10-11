async function testRegister() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@ecosync.com', password: 'SuperSecretPassword123!' })
    });
    const data = await res.json();
    console.log("=== API RESPONSE ===");
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
testRegister();
