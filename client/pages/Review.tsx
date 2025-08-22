import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, MapPin, Globe, Mountain, Check, AlertCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

interface GeographicData {
  country: string;
  state: string;
  city: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  altitude: string;
  climateType: string;
  terrainType: string;
  landUse: string;
}

export default function Review() {
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const formData = location.state?.formData as GeographicData;

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate("/");
    }

    // Redirect if no form data
    if (!formData) {
      navigate("/registration");
    }
  }, [navigate, formData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save data to localStorage for demo purposes
    const submissionData = {
      ...formData,
      submittedAt: new Date().toISOString(),
      submittedBy: user?.username,
      id: Date.now().toString()
    };
    
    localStorage.setItem("geographicSubmission", JSON.stringify(submissionData));
    
    setIsSubmitting(false);
    navigate("/success", { state: { submissionData } });
  };

  const handleEdit = () => {
    navigate("/registration", { state: { formData } });
  };

  if (!user || !formData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      <div className="desktop-content max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-6">
          <button
            onClick={() => navigate("/registration")}
            className="text-[hsl(var(--geo-secondary))] hover:text-[hsl(var(--geo-secondary))]/80"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Review Geographic Data</h1>
            <p className="text-gray-600">Please review and confirm your information</p>
          </div>
        </div>

        {/* Review Card */}
        <div className="card-container">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600">Data Collection Complete</span>
                </div>
                <div className="w-8 h-0.5 bg-green-500"></div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-xs text-white font-bold">4</span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">Review & Confirm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Review Sections */}
          <div className="space-y-8">
            {/* Basic Location Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Basic Location Details</h3>
                </div>
                <Button onClick={handleEdit} size="sm" className="btn-outline text-sm">
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Country</Label>
                  <p className="font-medium text-gray-800">{formData.country}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">State/Province</Label>
                  <p className="font-medium text-gray-800">{formData.state}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">City/Town</Label>
                  <p className="font-medium text-gray-800">{formData.city}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Postal Code</Label>
                  <p className="font-medium text-gray-800">{formData.postalCode}</p>
                </div>
              </div>
            </div>

            {/* Exact Location Data */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Exact Location Data</h3>
                </div>
                <Button onClick={handleEdit} size="sm" className="btn-outline text-sm">
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Latitude</Label>
                  <p className="font-medium text-gray-800">{formData.latitude}°</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Longitude</Label>
                  <p className="font-medium text-gray-800">{formData.longitude}°</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Altitude</Label>
                  <p className="font-medium text-gray-800">{formData.altitude} meters</p>
                </div>
              </div>

              {/* Coordinates Summary */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <Label className="text-gray-600 text-sm">Coordinates</Label>
                <p className="font-mono text-gray-800">
                  {formData.latitude}, {formData.longitude} (Alt: {formData.altitude}m)
                </p>
              </div>
            </div>

            {/* Geographic Attributes */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Mountain className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Geographic Attributes</h3>
                </div>
                <Button onClick={handleEdit} size="sm" className="btn-outline text-sm">
                  <Edit size={16} className="mr-1" />
                  Edit
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-600 text-sm">Climate Type</Label>
                  <p className="font-medium text-gray-800">{formData.climateType}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Terrain Type</Label>
                  <p className="font-medium text-gray-800">{formData.terrainType}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Land Use</Label>
                  <p className="font-medium text-gray-800">{formData.landUse}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submission Warning */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Before You Submit</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Please review all information carefully. Once submitted, this data will be processed 
                  and stored in the geographic information system. You can edit any section by clicking 
                  the "Edit" button above.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <Button onClick={handleEdit} className="btn-outline">
              <Edit size={16} className="mr-2" />
              Edit Information
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-success btn-desktop"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={16} className="mr-2" />
                  Submit Data
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for labels
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}
