import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Search, User, Calendar } from "lucide-react";
import { VerificationRequest, VerificationResponse } from "@shared/api";

export default function UserVerification() {
  const [identityType, setIdentityType] = useState<"aadhar" | "voter">(
    "aadhar",
  );
  const [identityNumber, setIdentityNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResponse | null>(null);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identityNumber.trim()) {
      setError(
        `Please enter your ${identityType === "aadhar" ? "Aadhar number" : "Voter ID"}`,
      );
      return;
    }

    // Basic format validation
    if (identityType === "aadhar" && !/^\d{12}$/.test(identityNumber)) {
      setError("Aadhar number must be exactly 12 digits");
      return;
    }

    if (identityType === "voter" && !/^[A-Z]{3}\d{7}$/i.test(identityNumber)) {
      setError(
        "Voter ID must be in format: 3 letters followed by 7 digits (e.g., ABC1234567)",
      );
      return;
    }

    setIsLoading(true);
    setError("");
    setVerificationResult(null);

    try {
      const requestData: VerificationRequest = {
        identityType,
        identityNumber: identityNumber.trim().toUpperCase(),
      };

      const response = await fetch("/api/verify-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      const result: VerificationResponse = await response.json();
      setVerificationResult(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during verification",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIdentityNumber("");
    setError("");
    setVerificationResult(null);
  };

  return (
    <div className="desktop-container">
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              User Registration Verification
            </h1>
            <p className="text-gray-600">
              Check if a user is already registered in the GI system
            </p>
          </div>

          {/* Verification Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Verify Registration Status
              </CardTitle>
              <CardDescription>
                Enter an Aadhar number or Voter ID to check registration status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerification} className="space-y-6">
                {/* Identity Type Selection */}
                <div>
                  <Label className="text-gray-700 font-medium text-sm mb-3 block">
                    Select Identity Type
                  </Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={
                        identityType === "aadhar" ? "default" : "outline"
                      }
                      onClick={() => {
                        setIdentityType("aadhar");
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Aadhar Number
                    </Button>
                    <Button
                      type="button"
                      variant={identityType === "voter" ? "default" : "outline"}
                      onClick={() => {
                        setIdentityType("voter");
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Voter ID
                    </Button>
                  </div>
                </div>

                {/* Identity Number Input */}
                <div>
                  <Label
                    htmlFor="identityNumber"
                    className="text-gray-700 font-medium text-sm"
                  >
                    {identityType === "aadhar" ? "Aadhar Number" : "Voter ID"}
                  </Label>
                  <Input
                    id="identityNumber"
                    type="text"
                    value={identityNumber}
                    onChange={(e) => setIdentityNumber(e.target.value)}
                    placeholder={
                      identityType === "aadhar"
                        ? "Enter 12-digit Aadhar number"
                        : "Enter Voter ID (e.g., ABC1234567)"
                    }
                    className="mt-2 input-desktop text-gray-700 bg-gray-50 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500"
                    maxLength={identityType === "aadhar" ? 12 : 10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {identityType === "aadhar"
                      ? "Must be exactly 12 digits"
                      : "Format: 3 letters followed by 7 digits"}
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary btn-desktop w-full text-lg font-semibold shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Check Registration
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Verification Result */}
          {verificationResult && (
            <Card
              className={`${verificationResult.isRegistered ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {verificationResult.isRegistered ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700">
                        User Already Registered
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      <span className="text-blue-700">
                        No Registration Found
                      </span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-sm mb-4 ${verificationResult.isRegistered ? "text-green-700" : "text-blue-700"}`}
                >
                  {verificationResult.message}
                </p>

                {verificationResult.isRegistered &&
                  verificationResult.registrationDetails && (
                    <div className="space-y-4 p-4 bg-white rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-3">
                        Registration Details:
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Name</p>
                          <p className="font-medium text-gray-800">
                            {verificationResult.registrationDetails.name}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-600">Phone</p>
                          <p className="font-medium text-gray-800">
                            {verificationResult.registrationDetails.phone}
                          </p>
                        </div>

                        {verificationResult.registrationDetails.email && (
                          <div>
                            <p className="text-sm text-gray-600">Email</p>
                            <p className="font-medium text-gray-800">
                              {verificationResult.registrationDetails.email}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-sm text-gray-600">
                            Registration Date
                          </p>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <p className="font-medium text-gray-800">
                              {new Date(
                                verificationResult.registrationDetails.registeredAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {verificationResult.registrationDetails.categories
                        .length > 0 && (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Product Categories
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {verificationResult.registrationDetails.categories.map(
                              (category, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="bg-green-100 text-green-800"
                                >
                                  {category}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                <div className="mt-4">
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="w-full"
                  >
                    Check Another Registration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
