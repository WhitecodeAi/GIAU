import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  LogOut,
  ArrowLeft,
  Eye,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login?: string;
  total_registrations: number;
  latest_registration_date?: string;
}

interface UserRegistration {
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
  category_names: string;
  production_summary?: string;
  created_at: string;
  documentUrls: {
    aadharCard?: string;
    panCard?: string;
    proofOfProduction?: string;
    signature?: string;
    photo?: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UserRegistrations() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [selectedRegistration, setSelectedRegistration] =
    useState<UserRegistration | null>(null);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const userDataStored = localStorage.getItem("user");
    if (userDataStored) {
      const parsedUser = JSON.parse(userDataStored);
      if (parsedUser.role !== "admin") {
        navigate("/");
        return;
      }
      setCurrentUser(parsedUser);
      if (userId) {
        fetchUserData();
        fetchUserRegistrations();
      }
    } else {
      navigate("/");
    }
  }, [navigate, userId, currentPage]);

  const fetchUserData = async () => {
    try {
      const userData = localStorage.getItem("user");
      const token = userData ? JSON.parse(userData).token : null;
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const fetchUserRegistrations = async () => {
    try {
      setLoading(true);
      const userData = localStorage.getItem("user");
      const token = userData ? JSON.parse(userData).token : null;
      const response = await fetch(
        `/api/users/${userId}/registrations?page=${currentPage}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.registrations || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch user registrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.phone.includes(searchTerm) ||
      reg.category_names.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy 'at' HH:mm");
  };

  // Detailed view for a specific registration
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
              Back to User Registrations
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
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
                <Badge variant="outline">User: {userData?.username}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      <span className="font-medium">Name:</span>{" "}
                      {selectedRegistration.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-500" />
                      <span className="font-medium">Age:</span>{" "}
                      {selectedRegistration.age}, {selectedRegistration.gender}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-500" />
                      <span className="font-medium">Phone:</span>{" "}
                      {selectedRegistration.phone}
                    </div>
                    {selectedRegistration.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-500" />
                        <span className="font-medium">Email:</span>{" "}
                        {selectedRegistration.email}
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-gray-500 mt-1" />
                      <div>
                        <span className="font-medium">Address:</span>
                        <p className="text-gray-700">
                          {selectedRegistration.address}
                        </p>
                      </div>
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
                      <span className="font-medium">Categories:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedRegistration.category_names
                          .split(",")
                          .map((category, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {category.trim()}
                            </Badge>
                          ))}
                      </div>
                    </div>
                    {selectedRegistration.production_summary && (
                      <div>
                        <span className="font-medium">Production Summary:</span>
                        <p className="text-gray-700 mt-1 p-3 bg-gray-50 rounded-lg">
                          {selectedRegistration.production_summary}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Registration Date:</span>
                      <p className="text-gray-600">
                        {formatDate(selectedRegistration.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

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

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/users")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Users
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                User Registrations
              </h1>
              {userData && (
                <p className="text-gray-600">
                  Registrations by {userData.username} (Total:{" "}
                  {userData.total_registrations})
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <User size={16} className="text-green-600" />
              <span className="text-green-700 font-medium">
                {currentUser.username}
              </span>
              <Badge variant="outline" className="bg-green-100 text-green-700">
                Admin
              </Badge>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* User Info Card */}
      {userData && (
        <div className="p-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Username</div>
                  <div className="font-medium">{userData.username}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Email</div>
                  <div className="font-medium">
                    {userData.email || "Not provided"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Role</div>
                  <Badge
                    variant={
                      userData.role === "admin" ? "destructive" : "secondary"
                    }
                  >
                    {userData.role}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Joined</div>
                  <div className="font-medium">
                    {format(new Date(userData.created_at), "MMM dd, yyyy")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <Input
                      type="text"
                      placeholder="Search registrations by name, phone, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registrations List */}
          <Card>
            <CardHeader>
              <CardTitle>Registrations ({pagination.total})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse bg-gray-200 h-20 rounded"
                    ></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRegistrations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No registrations found for this user
                    </div>
                  ) : (
                    filteredRegistrations.map((registration) => (
                      <div
                        key={registration.id}
                        className="border rounded-lg p-4 bg-white border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {registration.documentUrls.photo && (
                                  <img
                                    src={registration.documentUrls.photo}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                )}
                                <div>
                                  <h3 className="font-semibold text-gray-900">
                                    {registration.name}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    ID: #{registration.id}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm">
                                <strong>Phone:</strong> {registration.phone}
                              </p>
                              <p className="text-sm">
                                <strong>Categories:</strong>{" "}
                                {registration.category_names}
                              </p>
                            </div>

                            <div>
                              {registration.production_summary && (
                                <p className="text-sm text-gray-600 mb-2">
                                  <strong>Production:</strong>{" "}
                                  {registration.production_summary}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                {formatDate(registration.created_at)}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setSelectedRegistration(registration)
                            }
                            className="flex items-center gap-2"
                          >
                            <Eye size={14} />
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>

                  <span className="px-4 py-2 text-sm">
                    Page {currentPage} of {pagination.totalPages}
                  </span>

                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
