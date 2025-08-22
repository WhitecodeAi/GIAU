import { Request, Response } from "express";
import { dbQuery } from "../config/database";
import { VerificationRequest, VerificationResponse } from "@shared/api";

export async function checkUserRegistration(req: Request, res: Response) {
  try {
    const { identityType, identityNumber }: VerificationRequest = req.body;

    // Validate input
    if (!identityType || !identityNumber) {
      return res.status(400).json({
        error: "Identity type and number are required",
      });
    }

    if (!["aadhar", "voter"].includes(identityType)) {
      return res.status(400).json({
        error: "Identity type must be 'aadhar' or 'voter'",
      });
    }

    // Validate Aadhar number format (12 digits)
    if (identityType === "aadhar" && !/^\d{12}$/.test(identityNumber)) {
      return res.status(400).json({
        error: "Aadhar number must be exactly 12 digits",
      });
    }

    // Validate Voter ID format (basic format check - alphanumeric, 10 characters)
    if (
      identityType === "voter" &&
      !/^[A-Z]{3}\d{7}$/.test(identityNumber.toUpperCase())
    ) {
      return res.status(400).json({
        error:
          "Voter ID must be in format: 3 letters followed by 7 digits (e.g., ABC1234567)",
      });
    }

    let registration = null;

    if (identityType === "aadhar") {
      // Check by Aadhar number
      const registrations = await dbQuery(
        `
        SELECT 
          ur.id, ur.name, ur.phone, ur.email, ur.created_at,
          GROUP_CONCAT(DISTINCT pc.name) as categories
        FROM user_registrations ur
        LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
        LEFT JOIN product_categories pc ON urc.category_id = pc.id
        WHERE ur.aadhar_number = ?
        GROUP BY ur.id
        ORDER BY ur.created_at DESC
        LIMIT 1
        `,
        [identityNumber],
      );

      if (registrations.length > 0) {
        registration = registrations[0];
      }
    } else if (identityType === "voter") {
      // Check by Voter ID (when we add this field to the database)
      const registrations = await dbQuery(
        `
        SELECT 
          ur.id, ur.name, ur.phone, ur.email, ur.created_at,
          GROUP_CONCAT(DISTINCT pc.name) as categories
        FROM user_registrations ur
        LEFT JOIN user_registration_categories urc ON ur.id = urc.registration_id
        LEFT JOIN product_categories pc ON urc.category_id = pc.id
        WHERE ur.voter_id = ?
        GROUP BY ur.id
        ORDER BY ur.created_at DESC
        LIMIT 1
        `,
        [identityNumber.toUpperCase()],
      );

      if (registrations.length > 0) {
        registration = registrations[0];
      }
    }

    const response: VerificationResponse = {
      isRegistered: !!registration,
      message: registration
        ? `User is already registered with this ${identityType === "aadhar" ? "Aadhar number" : "Voter ID"}`
        : `No registration found for this ${identityType === "aadhar" ? "Aadhar number" : "Voter ID"}`,
    };

    if (registration) {
      response.registrationDetails = {
        id: registration.id,
        name: registration.name,
        phone: registration.phone,
        email: registration.email,
        registeredAt: registration.created_at,
        categories: registration.categories
          ? registration.categories.split(",")
          : [],
      };
    }

    res.json(response);
  } catch (error) {
    console.error("User verification error:", error);
    res.status(500).json({ error: "Failed to verify user registration" });
  }
}
