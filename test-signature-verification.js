// Test script to verify signature functionality
const fetch = require('node-fetch');

async function testFormGI3A() {
  try {
    console.log('🔍 Testing Form GI 3A signature inclusion...');
    
    const response = await fetch('http://localhost:8080/api/registrations/export-product-gi3a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registrationId: 13,
        productId: 1,
        productName: "Bodo Gongar Dunjia"
      })
    });

    if (response.ok) {
      const htmlContent = await response.text();
      
      // Check if signature image is included
      const hasSignatureImage = htmlContent.includes('class="signature-image"');
      const hasSignatureSrc = htmlContent.includes('.signature-image');
      const hasImageTag = htmlContent.includes('<img') && htmlContent.includes('alt="Signature"');
      
      console.log('Form GI 3A Results:');
      console.log('✓ Response received:', response.status);
      console.log('✓ Has signature-image class:', hasSignatureImage);
      console.log('✓ Has signature CSS:', hasSignatureSrc);
      console.log('✓ Has image tag with Signature alt:', hasImageTag);
      
      if (hasSignatureImage && hasImageTag) {
        console.log('🎉 SUCCESS: Form GI 3A includes signature functionality!');
      } else {
        console.log('❌ ISSUE: Form GI 3A may not include signature properly');
      }
      
      // Show a snippet of the signature area
      const signatureAreaMatch = htmlContent.match(/<div class="signature-area">[\s\S]*?<\/div>/);
      if (signatureAreaMatch) {
        console.log('\n📄 Signature area HTML snippet:');
        console.log(signatureAreaMatch[0].substring(0, 300) + '...');
      }
      
    } else {
      console.log('❌ ERROR: Export failed with status', response.status);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

async function testStatement() {
  try {
    console.log('\n🔍 Testing Statement of Case signature inclusion...');
    
    const response = await fetch('http://localhost:8080/api/registrations/export-product-statement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registrationId: 13,
        productId: 1,
        productName: "Bodo Gongar Dunjia"
      })
    });

    if (response.ok) {
      const htmlContent = await response.text();
      
      // Check if signature image is included
      const hasSignatureImage = htmlContent.includes('class="statement-signature-image"');
      const hasSignatureSrc = htmlContent.includes('.statement-signature-image');
      const hasImageTag = htmlContent.includes('<img') && htmlContent.includes('alt="Signature"');
      
      console.log('Statement Results:');
      console.log('✓ Response received:', response.status);
      console.log('✓ Has statement-signature-image class:', hasSignatureImage);
      console.log('✓ Has signature CSS:', hasSignatureSrc);
      console.log('✓ Has image tag with Signature alt:', hasImageTag);
      
      if (hasSignatureImage && hasImageTag) {
        console.log('🎉 SUCCESS: Statement includes signature functionality!');
      } else {
        console.log('❌ ISSUE: Statement may not include signature properly');
      }
      
      // Show a snippet of the signature area
      const signatureAreaMatch = htmlContent.match(/<div class="signature-area">[\s\S]*?<\/div>/);
      if (signatureAreaMatch) {
        console.log('\n📄 Signature area HTML snippet:');
        console.log(signatureAreaMatch[0].substring(0, 300) + '...');
      }
      
    } else {
      console.log('❌ ERROR: Export failed with status', response.status);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

// Run tests
console.log('🚀 Starting signature verification tests...\n');

testFormGI3A().then(() => {
  return testStatement();
}).then(() => {
  console.log('\n✅ Verification tests completed!');
}).catch(console.error);
