async function testAI() {
  const url = 'http://localhost:5000/api/ai/analyze-incident';
  
  const sampleReports = [
    "Severe flash flooding in Barangay 5! Two families are trapped on their tin roofs with small kids, water is still rising fast, we desperately need a boat and evacuation!",
    "Tree branch fell on electrical wire and caught fire near the gas station. Smoke is spreading quickly.",
    "Elderly man collapsed at the evacuation center, diabetic emergency, need insulin and medical doctor urgently.",
    "We have 50 families sheltered at the gym, ran out of clean drinking water and baby formula."
  ];

  console.log('--- Testing Gemini AI Disaster Incident Analysis ---');

  for (const report of sampleReports) {
    console.log('\nCitizen Report:', report);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: report })
    });

    const data = await res.json();
    console.log('AI Structured Output:');
    console.log('  Title:            ', data.title);
    console.log('  Category:         ', data.category);
    console.log('  Urgency:          ', data.urgency);
    console.log('  Actionable Needs: ', data.actionable_needs?.join(', '));
  }

  console.log('\nAI Integration Test Complete!');
}

testAI().catch(console.error);
