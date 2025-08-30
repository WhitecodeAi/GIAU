import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registrationsAPI, logout, handleAPIError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Eye, LogOut, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ProductionDetail {
  product_id: number;
  product_name: string;
  annual_production: string;
  unit: string;
  area_of_production: string;
  years_of_production: string;
  annual_turnover?: string;
  additional_notes?: string;
}

interface Registration {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address: string;
  age: number;
  gender: string;
  aadhar_number?: string;
  voter_id?: string;
  pan_number?: string;
  created_at: string;
  username: string;
  category_name: string;
  categories?: Array<{ id: number; name: string }>;
  category_names?: string;
  existing_products?: string;
  selected_products?: string;
  area_of_production?: string;
  annual_production?: string;
  annual_turnover?: string;
  years_of_production?: string;
  production_details?: ProductionDetail[];
  production_summary?: string;
  aadhar_card_path?: string;
  pan_card_path?: string;
  proof_of_production_path?: string;
  signature_path?: string;
  photo_path?: string;
  documentUrls?: {
    aadharCard?: string;
    panCard?: string;
    proofOfProduction?: string;
    signature?: string;
    photo?: string;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AllRegistrations() {
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);

  console.log(
    "selectedRegistration",
    selectedRegistration?.documentUrls?.aadharCard,
  );

  const loadRegistrations = async (page = 1) => {
    try {
      setLoading(true);
      const response = await registrationsAPI.getAllRegistrations(page, 10);

      // Log production details for debugging
      response.registrations.forEach((reg) => {
        if (reg.production_details && reg.production_details.length > 0) {
        }
      });

      setRegistrations(response.registrations);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error loading registrations:", error);
      toast.error(handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, []);

  const handlePageChange = (page: number) => {
    loadRegistrations(page);
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.phone.includes(searchTerm) ||
      (reg.category_names || reg.category_name)
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      reg.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.aadhar_number && reg.aadhar_number.includes(searchTerm)) ||
      (reg.voter_id &&
        reg.voter_id.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (selectedRegistration) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setSelectedRegistration(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Registration Details - #{selectedRegistration.id}
              </CardTitle>
              <CardDescription>
                Submitted by {selectedRegistration.username} on{" "}
                {formatDate(selectedRegistration.created_at)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedRegistration.name}
                    </div>
                    <div>
                      <span className="font-medium">Age:</span>{" "}
                      {selectedRegistration.age}
                    </div>
                    <div>
                      <span className="font-medium">Gender:</span>{" "}
                      {selectedRegistration.gender}
                    </div>
                    <div>
                      <span className="font-medium">Mobile Number:</span>{" "}
                      {selectedRegistration.phone}
                    </div>
                    {selectedRegistration.email && (
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {selectedRegistration.email}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Address:</span>{" "}
                      {selectedRegistration.address}
                    </div>
                    {selectedRegistration.aadhar_number && (
                      <div>
                        <span className="font-medium">Aadhar Number:</span>{" "}
                        {selectedRegistration.aadhar_number}
                      </div>
                    )}
                    {selectedRegistration.voter_id && (
                      <div>
                        <span className="font-medium">Voter ID:</span>{" "}
                        {selectedRegistration.voter_id}
                      </div>
                    )}
                    {selectedRegistration.pan_number && (
                      <div>
                        <span className="font-medium">PAN Number:</span>{" "}
                        {selectedRegistration.pan_number}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Product Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Categories:</span>{" "}
                      {selectedRegistration.categories &&
                      selectedRegistration.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedRegistration.categories.map((category) => (
                            <Badge
                              key={category.id}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {category.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-600">
                          {selectedRegistration.category_names ||
                            selectedRegistration.category_name}
                        </span>
                      )}
                    </div>
                    {selectedRegistration.existing_products && (
                      <div>
                        <span className="font-medium">Existing Products:</span>{" "}
                        {selectedRegistration.existing_products}
                      </div>
                    )}
                    {selectedRegistration.selected_products && (
                      <div>
                        <span className="font-medium">Selected Products:</span>{" "}
                        {selectedRegistration.selected_products}
                      </div>
                    )}
                    {selectedRegistration.area_of_production && (
                      <div>
                        <span className="font-medium">Area of Production:</span>{" "}
                        {selectedRegistration.area_of_production}
                      </div>
                    )}
                    {selectedRegistration.annual_production && (
                      <div>
                        <span className="font-medium">Annual Production:</span>{" "}
                        {selectedRegistration.annual_production}
                      </div>
                    )}
                    {selectedRegistration.annual_turnover && (
                      <div>
                        <span className="font-medium">Annual Turnover:</span>{" "}
                        {selectedRegistration.annual_turnover}
                      </div>
                    )}
                    {selectedRegistration.years_of_production && (
                      <div>
                        <span className="font-medium">
                          Years of Production:
                        </span>{" "}
                        {selectedRegistration.years_of_production}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Production Details Section */}
              {selectedRegistration.production_details &&
                selectedRegistration.production_details.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Detailed Production Information
                    </h3>
                    <div className="space-y-4">
                      {selectedRegistration.production_details.map(
                        (detail, index) => (
                          <div
                            key={detail.product_id || index}
                            className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                          >
                            <h4 className="font-medium text-gray-900 mb-3">
                              {detail.productName}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {detail.annualProduction && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Annual Production:
                                  </span>{" "}
                                  <span className="text-gray-900">
                                    {detail.annualProduction} {detail.unit}
                                  </span>
                                </div>
                              )}
                              {detail.areaOfProduction && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Area of Production:
                                  </span>{" "}
                                  <span className="text-gray-900">
                                    {detail.areaOfProduction}
                                  </span>
                                </div>
                              )}
                              {detail.yearsOfProduction && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Years of Production:
                                  </span>{" "}
                                  <span className="text-gray-900">
                                    {detail.yearsOfProduction}
                                  </span>
                                </div>
                              )}
                              {detail.annualTurnover && (
                                <div>
                                  <span className="font-medium text-gray-700">
                                    Annual Turnover:
                                  </span>{" "}
                                  <span className="text-gray-900">
                                    ₹{detail.annualTurnover} {detail.turnoverUnit || "lakh"}
                                  </span>
                                </div>
                              )}
                            </div>
                            {detail.additional_notes && (
                              <div className="mt-3">
                                <span className="font-medium text-gray-700">
                                  Additional Notes:
                                </span>{" "}
                                <span className="text-gray-900">
                                  {detail.additional_notes}
                                </span>
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Document Images Section */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Uploaded Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selectedRegistration.documentUrls?.aadharCard && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Aadhar Card</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selectedRegistration.documentUrls.aadharCard}
                          alt="Aadhar Card"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedRegistration.documentUrls?.panCard && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">PAN Card</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selectedRegistration.documentUrls.panCard}
                          alt="PAN Card"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedRegistration.documentUrls?.proofOfProduction && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Proof of Production
                      </h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={
                            selectedRegistration.documentUrls.proofOfProduction
                          }
                          alt="Proof of Production"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedRegistration.documentUrls?.signature && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Signature</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selectedRegistration.documentUrls.signature}
                          alt="Signature"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedRegistration.documentUrls?.photo && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Profile Photo
                      </h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selectedRegistration.documentUrls.photo}
                          alt="Profile Photo"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Fallback message if no documents */}
                {!selectedRegistration.documentUrls?.aadharCard &&
                  !selectedRegistration.documentUrls?.panCard &&
                  !selectedRegistration.documentUrls?.proofOfProduction &&
                  !selectedRegistration.documentUrls?.signature &&
                  !selectedRegistration.documentUrls?.photo && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No documents uploaded for this registration.</p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              All Registrations
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, mobile number, category, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading registrations...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {filteredRegistrations.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-gray-500">No registrations found.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredRegistrations.map((registration) => (
                  <Card
                    key={registration.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {registration.name}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">
                                Registration ID:
                              </span>{" "}
                              #{registration.id}
                            </div>
                            <div>
                              <span className="font-medium">
                                Mobile Number:
                              </span>{" "}
                              {registration.phone}
                            </div>
                            <div>
                              <span className="font-medium">Categories:</span>{" "}
                              {registration.categories &&
                              registration.categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {registration.categories.map((category) => (
                                    <Badge
                                      key={category.id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {category.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-600">
                                  {registration.category_names ||
                                    registration.category_name}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Submitted by:</span>{" "}
                              {registration.username}
                            </div>
                          </div>
                          {registration.production_summary && (
                            <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                              <span className="font-medium text-blue-800">
                                Production Details:
                              </span>{" "}
                              <span className="text-blue-700">
                                {registration.production_summary}
                              </span>
                            </div>
                          )}
                          <div className="text-sm text-gray-500">
                            Submitted on {formatDate(registration.created_at)}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRegistration(registration)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total} registrations
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
