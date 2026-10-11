async function testCRUD() {
  const baseUrl = 'http://localhost:5000/api/incidents';
  
  console.log('--- 1. Testing CREATE (POST) ---');
  let createRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Flash Flood on Main St',
      description: 'Water rising up to knee level near the marketplace.',
      category: 'Flood',
      urgency: 'High',
      latitude: 14.5995,
      longitude: 120.9842,
      location_name: 'Main St Market',
      reporter_email: 'test@ecosync.com'
    })
  });
  let createData = await createRes.json();
  console.log('Create Response:', createData);

  if (!createData.incident) {
    console.error('Failed to create incident. Did you create the table in Supabase?');
    return;
  }

  const incidentId = createData.incident.id;

  console.log('\n--- 2. Testing READ ALL (GET) ---');
  let listRes = await fetch(baseUrl);
  let listData = await listRes.json();
  console.log('All Incidents count:', listData.length);

  console.log('\n--- 3. Testing UPDATE (PUT) ---');
  let updateRes = await fetch(`${baseUrl}/${incidentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'In Progress',
      urgency: 'Critical'
    })
  });
  let updateData = await updateRes.json();
  console.log('Update Response:', updateData);

  console.log('\n--- 4. Testing READ SINGLE (GET) ---');
  let singleRes = await fetch(`${baseUrl}/${incidentId}`);
  let singleData = await singleRes.json();
  console.log('Single Incident:', singleData);

  console.log('\n--- 5. Testing DELETE (DELETE) ---');
  let deleteRes = await fetch(`${baseUrl}/${incidentId}`, {
    method: 'DELETE'
  });
  let deleteData = await deleteRes.json();
  console.log('Delete Response:', deleteData);

  console.log('\nCRUD Test Completed Successfully!');
}

testCRUD().catch(console.error);
