import { Request, Response } from "express";
import { dbQuery } from "../config/database";
import { simpleFileStorage } from "../utils/simpleFileStorage";

export async function compareSignatureGeneration(req: Request, res: Response) {
  try {
    const { registrationId, productName } = req.body;

    if (!registrationId || !productName) {
      return res.status(400).json({ error: "Registration ID and product name required" });
    }

    // Fetch registration data (same query as both functions)
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

    // Test Form GI 3A signature generation
    const gi3aSignatureHtml = registration.signature_path
      ? `<img src="${simpleFileStorage.getFileUrl(registration.signature_path)}" alt="Signature" class="signature-image" />`
      : `<div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 10px;"></div>`;

    // Test Statement signature generation
    const statementSignatureHtml = registration.signature_path
      ? `<img src="${simpleFileStorage.getFileUrl(registration.signature_path)}" alt="Signature" class="statement-signature-image" />`
      : `<div class="signature-line"></div>`;

    let signatureUrl = null;
    let urlError = null;
    
    if (registration.signature_path) {
      try {
        signatureUrl = simpleFileStorage.getFileUrl(registration.signature_path);
      } catch (error) {
        urlError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    const comparison = {
      registration: {
        id: registration.id,
        name: registration.name,
        signature_path: registration.signature_path,
        has_signature_path: !!registration.signature_path
      },
      signature_url: {
        url: signatureUrl,
        error: urlError
      },
      generated_html: {
        form_gi3a: gi3aSignatureHtml,
        statement: statementSignatureHtml,
        are_identical: gi3aSignatureHtml === statementSignatureHtml
      },
      css_classes: {
        form_gi3a_class: "signature-image",
        statement_class: "statement-signature-image"
      },
      file_storage_test: {
        simpleFileStorage_available: !!simpleFileStorage,
        getFileUrl_function: typeof simpleFileStorage.getFileUrl
      }
    };

    res.json(comparison);
  } catch (error) {
    console.error("Compare signature error:", error);
    res.status(500).json({ 
      error: "Failed to compare signature generation",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
