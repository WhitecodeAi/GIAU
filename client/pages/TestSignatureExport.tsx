import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestSignatureExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<string>("");

  const testFormGI3A = async () => {
    setIsExporting(true);
    setResult("");
    
    try {
      const response = await fetch('/api/registrations/export-product-gi3a', {
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
        const hasSignaturePath = htmlContent.includes('signature_path');
        
        if (hasSignatureImage) {
          setResult("✅ SUCCESS: Form GI 3A now includes signature image!");
        } else {
          setResult("❌ ISSUE: Form GI 3A does not include signature image");
        }
        
        // Open in new window for visual verification
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        }
      } else {
        setResult(`❌ ERROR: Export failed with status ${response.status}`);
      }
    } catch (error) {
      setResult(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const testStatement = async () => {
    setIsExporting(true);
    setResult("");
    
    try {
      const response = await fetch('/api/registrations/export-product-statement', {
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
        
        if (hasSignatureImage) {
          setResult("✅ SUCCESS: Statement of Case now includes signature image!");
        } else {
          setResult("❌ ISSUE: Statement of Case does not include signature image");
        }
        
        // Open in new window for visual verification
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
        }
      } else {
        setResult(`❌ ERROR: Export failed with status ${response.status}`);
      }
    } catch (error) {
      setResult(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Signature Export Verification Test
        </h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Signature Functionality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-gray-600 mb-4">
                Testing Registration ID 13 (Ajay Kulkarni) which has a signature document.
                This will verify that signatures are now included in Form GI 3A and Statement exports.
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={testFormGI3A}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isExporting ? "Testing..." : "Test Form GI 3A"}
              </Button>
              
              <Button
                onClick={testStatement}
                disabled={isExporting}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isExporting ? "Testing..." : "Test Statement"}
              </Button>
            </div>
            
            {result && (
              <div className={`p-4 rounded-lg ${
                result.includes('SUCCESS') 
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
