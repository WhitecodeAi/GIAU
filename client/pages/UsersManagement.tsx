import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  LogOut,
  Users,
  Calendar,
  Eye,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { apiRequest } from "@/lib/api";

interface UserWithStats {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login?: string;
  total_registrations: number;
  latest_registration_date?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UsersManagement() {
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchUsers();
    } else {
      navigate("/");
    }
  }, [navigate, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(10),
      });
      if (searchTerm) params.set("search", searchTerm);
      const data = await apiRequest<{ users: UserWithStats[]; pagination: Pagination }>(`/users?${params.toString()}`);
      setUsers((data as any).users || []);
      setPagination((data as any).pagination);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Users Management
              </h1>
              <p className="text-gray-600">
                Manage users and view their registrations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <User size={16} className="text-green-600" />
              <span className="text-green-700 font-medium">
                {user.username}
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

      {/* Main Content */}
      <div className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Users
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.total_registrations > 0).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "admin").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Regular Users
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "user").length}
              </div>
            </CardContent>
          </Card>
        </div>

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
                    placeholder="Search by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                onClick={handleSearch}
                className="bg-green-600 hover:bg-green-700"
              >
                <Search size={16} className="mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-gray-200 h-20 rounded"
                  ></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No users found
                  </div>
                ) : (
                  filteredUsers.map((userData) => (
                    <div
                      key={userData.id}
                      className="border rounded-lg p-4 bg-white border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User size={16} className="text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {userData.username}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  ID: #{userData.id}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm">
                              <strong>Email:</strong>{" "}
                              {userData.email || "Not provided"}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <strong className="text-sm">Role:</strong>
                              <Badge
                                variant={getRoleBadgeVariant(userData.role)}
                              >
                                {userData.role}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm">
                              <strong>Registrations:</strong>{" "}
                              {userData.total_registrations}
                            </p>
                            {userData.latest_registration_date && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Latest:</strong>{" "}
                                {formatDate(userData.latest_registration_date)}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-sm">
                              <strong>Joined:</strong>{" "}
                              {formatDate(userData.created_at)}
                            </p>
                            {userData.last_login && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Last login:</strong>{" "}
                                {formatDate(userData.last_login)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/admin/users/${userData.id}/registrations`,
                              )
                            }
                            disabled={userData.total_registrations === 0}
                            className="flex items-center gap-2"
                          >
                            <FileText size={14} />
                            View Registrations ({userData.total_registrations})
                          </Button>
                        </div>
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
    </div>
  );
}
