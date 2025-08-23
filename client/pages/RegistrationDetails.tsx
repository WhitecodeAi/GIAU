import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Package,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RegistrationDetails {
  id: number;
  name: string;
  address: string;
  age: number;
  gender: string;
  phone: string;
  email?: string;
  aadhar_number?: string;
  voter_id?: string;
  pan_number?: string;
  area_of_production?: string;
  annual_production?: string;
  annual_turnover?: number;
  turnover_unit?: string;
  years_of_production?: number;
  created_at: string;
  updated_at: string;
  username: string;
  category_name: string;
  category_names: string;
  categories: Array<{ id: number; name: string }>;
  existing_products: Array<{ id: number; name: string; description?: string }>;
  selected_products: Array<{ id: number; name: string; description?: string }>;
  production_details: Array<{
    id: number;
    productId?: number;
    productName: string;
    annualProduction?: string;
    unit?: string;
    areaOfProduction?: string;
    yearsOfProduction?: number;
    annualTurnover?: number;
    turnoverUnit?: string;
    additionalNotes?: string;
    createdAt: string;
  }>;
  documentUrls: {
    aadharCard?: string;
    panCard?: string;
    proofOfProduction?: string;
    signature?: string;
    photo?: string;
  };
}

export default function RegistrationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registration, setRegistration] = useState<RegistrationDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingStates, setExportingStates] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const fetchRegistrationDetails = async () => {
      if (!id) {
        setError("No registration ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/registrations/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Registration not found");
          } else {
            setError("Failed to fetch registration details");
          }
          return;
        }

        const data = await response.json();
        setRegistration(data);
      } catch (err) {
        console.error("Error fetching registration details:", err);
        setError("Failed to fetch registration details");
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrationDetails();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTurnover = (amount?: number, unit?: string) => {
    if (!amount) return "Not specified";
    return `₹${amount.toLocaleString("en-IN")} ${unit || "Lakh"}`;
  };

  const handleExportProduct = async (
    productId: number,
    productName: string,
    exportType: "gi3a" | "noc" | "statement" | "card",
  ) => {
    const exportKey = `${productId}-${exportType}`;

    try {
      setExportingStates((prev) => ({ ...prev, [exportKey]: true }));

      // Handle card export differently - use the general export endpoint
      let endpoint: string;
      let body: any;

      if (exportType === "card") {
        endpoint = "/api/registrations/export";
        body = JSON.stringify({ registrationIds: [registration!.id] });
      } else {
        endpoint = `/api/registrations/export-product-${exportType}`;
        body = JSON.stringify({
          registrationId: registration!.id,
          productId: productId,
          productName: productName,
        });
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body,
      });

      if (response.ok) {
        // Get the HTML content and open in new window for printing
        const htmlContent = await response.text();
        const newWindow = window.open("", "_blank");
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();

          // Auto-trigger print dialog after page loads
          newWindow.onload = () => {
            setTimeout(() => {
              newWindow.print();
            }, 500);
          };
        }
      } else {
        // Read response as text first to avoid "body stream already read" error
        let errorMessage = `Export failed with status: ${response.status}`;
        try {
          const errorText = await response.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // If it's not JSON, use the text as error message
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(`Export ${exportType} error:`, error);
      alert(
        error instanceof Error
          ? error.message
          : `Failed to export ${exportType.toUpperCase()} for ${productName}`,
      );
    } finally {
      setExportingStates((prev) => ({ ...prev, [exportKey]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
        <div className="desktop-content max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--geo-primary))] mx-auto mb-4"></div>
              <p className="text-gray-600">Loading registration details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
        <div className="desktop-content max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8 pt-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-[hsl(var(--geo-secondary))] hover:text-[hsl(var(--geo-secondary))]/80"
            >
              <ArrowLeft size={24} />
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">
              Registration Details
            </h1>
          </div>

          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!registration) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white">
      <div className="desktop-content max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-[hsl(var(--geo-secondary))] hover:text-[hsl(var(--geo-secondary))]/80"
          >
            <ArrowLeft size={24} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Registration Details
            </h1>
            <p className="text-gray-600">Registration ID: {registration.id}</p>
          </div>
        </div>

        {/* Registration Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Personal Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[hsl(var(--geo-primary))]" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Full Name
                    </label>
                    <p className="text-gray-900 font-medium">
                      {registration.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Age
                    </label>
                    <p className="text-gray-900">{registration.age} years</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Gender
                    </label>
                    <p className="text-gray-900 capitalize">
                      {registration.gender}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p className="text-gray-900 flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {registration.phone}
                    </p>
                  </div>
                  {registration.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-gray-900 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {registration.email}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">
                      Address
                    </label>
                    <p className="text-gray-900 flex items-start gap-1">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      {registration.address}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {registration.aadhar_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Aadhar Number
                      </label>
                      <p className="text-gray-900 font-mono">
                        {registration.aadhar_number}
                      </p>
                    </div>
                  )}
                  {registration.voter_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Voter ID
                      </label>
                      <p className="text-gray-900 font-mono">
                        {registration.voter_id}
                      </p>
                    </div>
                  )}
                  {registration.pan_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        PAN Number
                      </label>
                      <p className="text-gray-900 font-mono">
                        {registration.pan_number}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Categories & Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[hsl(var(--geo-primary))]" />
                  Categories & Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categories */}
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">
                    Product Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {registration.categories.map((category) => (
                      <Badge
                        key={category.id}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                      >
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Existing Products */}
                {registration.existing_products.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Existing Products
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {registration.existing_products.map((product) => (
                        <div
                          key={product.id}
                          className="bg-green-50 border border-green-200 rounded-lg p-3"
                        >
                          <p className="font-medium text-green-800">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-sm text-green-600">
                              {product.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Products */}
                {registration.selected_products.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Selected Products for Future
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {registration.selected_products.map((product) => (
                        <div
                          key={product.id}
                          className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                        >
                          <p className="font-medium text-purple-800">
                            {product.name}
                          </p>
                          {product.description && (
                            <p className="text-sm text-purple-600">
                              {product.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Details */}
            {registration.production_details.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[hsl(var(--geo-primary))]" />
                    Production Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {registration.production_details.map((detail) => (
                      <div
                        key={detail.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">
                            {detail.productName}
                          </h4>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleExportProduct(
                                  detail.productId || detail.id,
                                  detail.productName,
                                  "gi3a",
                                )
                              }
                              disabled={
                                exportingStates[
                                  `${detail.productId || detail.id}-gi3a`
                                ]
                              }
                              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                            >
                              <Download size={12} className="mr-1" />
                              {exportingStates[
                                `${detail.productId || detail.id}-gi3a`
                              ]
                                ? "..."
                                : "Form GI 3A"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleExportProduct(
                                  detail.productId || detail.id,
                                  detail.productName,
                                  "noc",
                                )
                              }
                              disabled={
                                exportingStates[
                                  `${detail.productId || detail.id}-noc`
                                ]
                              }
                              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                            >
                              <Download size={12} className="mr-1" />
                              {exportingStates[
                                `${detail.productId || detail.id}-noc`
                              ]
                                ? "..."
                                : "NOC"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleExportProduct(
                                  detail.productId || detail.id,
                                  detail.productName,
                                  "statement",
                                )
                              }
                              disabled={
                                exportingStates[
                                  `${detail.productId || detail.id}-statement`
                                ]
                              }
                              className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                            >
                              <Download size={12} className="mr-1" />
                              {exportingStates[
                                `${detail.productId || detail.id}-statement`
                              ]
                                ? "..."
                                : "Statement"}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          {detail.annualProduction && (
                            <div>
                              <label className="text-gray-500">
                                Annual Production
                              </label>
                              <p className="font-medium">
                                {detail.annualProduction} {detail.unit || ""}
                              </p>
                            </div>
                          )}
                          {detail.areaOfProduction && (
                            <div>
                              <label className="text-gray-500">
                                Area of Production
                              </label>
                              <p className="font-medium">
                                {detail.areaOfProduction}
                              </p>
                            </div>
                          )}
                          {detail.yearsOfProduction && (
                            <div>
                              <label className="text-gray-500">
                                Years of Production
                              </label>
                              <p className="font-medium">
                                {detail.yearsOfProduction} years
                              </p>
                            </div>
                          )}
                          {detail.annualTurnover && (
                            <div>
                              <label className="text-gray-500">
                                Annual Turnover
                              </label>
                              <p className="font-medium">
                                {formatTurnover(
                                  detail.annualTurnover,
                                  detail.turnoverUnit,
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                        {detail.additionalNotes && (
                          <div className="mt-3">
                            <label className="text-gray-500 text-sm">
                              Additional Notes
                            </label>
                            <p className="text-gray-700">
                              {detail.additionalNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[hsl(var(--geo-primary))]" />
                  Registration Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Registered By
                  </label>
                  <p className="text-gray-900 font-medium">
                    {registration.username}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Registration Date
                  </label>
                  <p className="text-gray-900">
                    {formatDate(registration.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Last Updated
                  </label>
                  <p className="text-gray-900">
                    {formatDate(registration.updated_at)}
                  </p>
                </div>
                {registration.area_of_production && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Area of Production
                    </label>
                    <p className="text-gray-900">
                      {registration.area_of_production}
                    </p>
                  </div>
                )}
                {registration.annual_turnover && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Annual Turnover
                    </label>
                    <p className="text-gray-900">
                      {formatTurnover(
                        registration.annual_turnover,
                        registration.turnover_unit,
                      )}
                    </p>
                  </div>
                )}
                {registration.years_of_production && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Years of Production
                    </label>
                    <p className="text-gray-900">
                      {registration.years_of_production} years
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[hsl(var(--geo-primary))]" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(registration.documentUrls).map(
                    ([key, url]) => {
                      const documentNames: { [key: string]: string } = {
                        aadharCard: "Aadhar Card",
                        panCard: "PAN Card",
                        proofOfProduction: "Proof of Production",
                        signature: "Signature",
                        photo: "Photo",
                      };

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-700">
                            {documentNames[key]}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(url, "_blank")}
                            className="text-xs"
                          >
                            <Eye size={12} className="mr-1" />
                            View
                          </Button>
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
