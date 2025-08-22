import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApiTest() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (url: string, name: string) => {
    console.log(`Testing ${name} endpoint: ${url}`);
    const startTime = Date.now();

    try {
      const response = await fetch(url);
      const endTime = Date.now();
      const data = await response.json();

      setResults((prev) => [
        ...prev,
        {
          name,
          url,
          status: response.status,
          success: true,
          data: JSON.stringify(data).substring(0, 100) + "...",
          time: endTime - startTime,
        },
      ]);
    } catch (error) {
      const endTime = Date.now();
      console.error(`${name} failed:`, error);

      setResults((prev) => [
        ...prev,
        {
          name,
          url,
          status: "ERROR",
          success: false,
          data: error instanceof Error ? error.message : String(error),
          time: endTime - startTime,
        },
      ]);
    }
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    const endpoints = [
      { url: "/api/ping", name: "Ping" },
      { url: "/api/dashboard/statistics", name: "Statistics" },
      { url: "/api/registrations/all?page=1&limit=1", name: "Registrations" },
      { url: "/api/products", name: "Products" },
      { url: "/api/users/dropdown", name: "Users" },
    ];

    for (const endpoint of endpoints) {
      await testEndpoint(endpoint.url, endpoint.name);
      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setLoading(false);
  };

  useEffect(() => {
    // Auto-run tests when component mounts
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card>
        <CardHeader>
          <CardTitle>API Connectivity Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={runTests} disabled={loading}>
              {loading ? "Testing..." : "Run Tests"}
            </Button>
            <Button variant="outline" onClick={() => setResults([])}>
              Clear Results
            </Button>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded border ${
                  result.success
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{result.name}</h3>
                    <p className="text-sm text-gray-600">{result.url}</p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-semibold ${result.success ? "text-green-600" : "text-red-600"}`}
                    >
                      {result.status}
                    </div>
                    <div className="text-sm text-gray-500">{result.time}ms</div>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <strong>Response:</strong> {result.data}
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && !loading && (
            <p className="text-gray-500">
              No test results yet. Click "Run Tests" to start.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
