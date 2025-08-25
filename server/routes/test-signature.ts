import { Request, Response } from "express";
import { dbQuery } from "../config/database";
import { simpleFileStorage } from "../utils/simpleFileStorage";

export async function testSignatureDebug(req: Request, res: Response) {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({ error: "Registration ID is required" });
    }

    console.log('🔍 Testing Signature Debug for Registration ID:', registrationId);

    // Fetch registration data
    const registrations = await dbQuery(
      `
      SELECT
        ur.id,
        ur.name,
        ur.address,
        ur.age,
        ur.phone,
        ur.email,
        ur.aadhar_number,
        ur.voter_id,
        ur.created_at,
        ur.photo_path,
        ur.signature_path
      FROM user_registrations ur
      WHERE ur.id = ?
    `,
      [registrationId],
    );

    if (registrations.length === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const registration = registrations[0];

    console.log('📋 Registration Data:', {
      id: registration.id,
      name: registration.name,
      signature_path: registration.signature_path,
      has_signature: !!registration.signature_path
    });

    let signatureUrl = null;
    let signatureHtml = null;

    if (registration.signature_path) {
      try {
        signatureUrl = simpleFileStorage.getFileUrl(registration.signature_path);
        console.log('🔗 Generated Signature URL:', signatureUrl);
        
        signatureHtml = `<img src="${signatureUrl}" alt="Signature" class="statement-signature-image" />`;
        console.log('📝 Generated Signature HTML:', signatureHtml);
      } catch (error) {
        console.error('❌ Error generating signature URL:', error);
      }
    } else {
      console.log('⚠️ No signature path found');
      signatureHtml = '<div class="signature-line"></div>';
    }

    const testResult = {
      registration: {
        id: registration.id,
        name: registration.name,
        signature_path: registration.signature_path,
        has_signature_path: !!registration.signature_path
      },
      signature: {
        url: signatureUrl,
        html: signatureHtml
      },
      test_images: {
        form_gi3a_class: `<img src="${signatureUrl}" alt="Signature" class="signature-image" />`,
        statement_class: `<img src="${signatureUrl}" alt="Signature" class="statement-signature-image" />`
      }
    };

    console.log('✅ Test Result:', JSON.stringify(testResult, null, 2));

    res.json(testResult);
  } catch (error) {
    console.error("❌ Test Signature Debug error:", error);
    res.status(500).json({ error: "Failed to test signature debug" });
  }
}
