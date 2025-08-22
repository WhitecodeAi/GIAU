import { useState, useEffect } from "react";
import { registrationsAPI } from "@/lib/api";

export default function ApiTest() {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [migrationResponse, setMigrationResponse] = useState<any>(null);
  const [uniquenessTestResponse, setUniquenessTestResponse] =
    useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [uniquenessLoading, setUniquenessLoading] = useState(false);

  const testApi = async () => {
    try {
      setLoading(true);
      const response = await registrationsAPI.getAllRegistrations(1, 1);

      setApiResponse(response);
    } catch (error) {
      console.error("API Error:", error);
      setApiResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setMigrationLoading(true);
      const response = await fetch("/api/migrate/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();

      setMigrationResponse(result);
    } catch (error) {
      console.error("Migration Error:", error);
      setMigrationResponse({ error: error.message });
    } finally {
      setMigrationLoading(false);
    }
  };

  const testUniquenessConstraints = async () => {
    try {
      setUniquenessLoading(true);
      const testAadhar = "123456789012";
      const testVoterId = "ABC1234567";

      // Test data for registration
      const testRegistration = {
        name: "Test User",
        address: "Test Address",
        age: 25,
        gender: "male",
        phone: "9876543210",
        aadharNumber: testAadhar,
        voterId: testVoterId,
        productCategoryIds: [1],
        areaOfProduction: "Test Area",
        annualProduction: "100",
        annualTurnover: "50000",
        yearsOfProduction: "5",
      };

      // Try to register twice with same Aadhar
      const results = [];

      try {
        const response1 = await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(testRegistration),
        });
        const result1 = await response1.json();
        results.push({ attempt: 1, success: response1.ok, data: result1 });
      } catch (err) {
        results.push({ attempt: 1, success: false, error: err.message });
      }

      try {
        const response2 = await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...testRegistration, name: "Test User 2" }),
        });
        const result2 = await response2.json();
        results.push({ attempt: 2, success: response2.ok, data: result2 });
      } catch (err) {
        results.push({ attempt: 2, success: false, error: err.message });
      }

      setUniquenessTestResponse(results);
    } catch (error) {
      console.error("Uniqueness Test Error:", error);
      setUniquenessTestResponse({ error: error.message });
    } finally {
      setUniquenessLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Test - Categories Debug</h1>

      <div className="mb-4 space-x-2">
        <button
          onClick={testApi}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? "Loading..." : "Test API"}
        </button>

        <button
          onClick={runMigration}
          disabled={migrationLoading}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          {migrationLoading ? "Migrating..." : "Run Migration"}
        </button>

        <button
          onClick={testUniquenessConstraints}
          disabled={uniquenessLoading}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          {uniquenessLoading ? "Testing..." : "Test Uniqueness"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Migration Response:</h2>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(migrationResponse, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">API Response:</h2>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </div>

        {uniquenessTestResponse && (
          <div className="bg-red-50 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">
              Uniqueness Test Results:
            </h2>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(uniquenessTestResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {apiResponse?.registrations?.[0] && (
        <div className="mt-4 bg-blue-50 p-4 rounded">
          <h3 className="font-semibold">First Registration Categories:</h3>
          <p>
            <strong>category_name:</strong>{" "}
            {apiResponse.registrations[0].category_name}
          </p>
          <p>
            <strong>category_names:</strong>{" "}
            {apiResponse.registrations[0].category_names}
          </p>
          <p>
            <strong>categories:</strong>{" "}
            {JSON.stringify(apiResponse.registrations[0].categories)}
          </p>
        </div>
      )}
    </div>
  );
}
