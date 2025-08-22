import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Search,
  User,
  LogOut,
  Users,
  FileText,
  Calendar,
  Filter,
  Eye,
  FileSpreadsheet,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Registration {
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
  production_summary: string;
  created_at: string;
  documentUrls: {
    aadharCard?: string;
    panCard?: string;
    proofOfProduction?: string;
    signature?: string;
    photo?: string;
  };
}

interface UserForDropdown {
  id: number;
  username: string;
  email: string;
  registration_count: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedRegistrations, setSelectedRegistrations] = useState<
    Set<number>
  >(new Set());
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({ startDate: null, endDate: null });
  const [isExporting, setIsExporting] = useState(false);
  const [users, setUsers] = useState<UserForDropdown[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isExportingByUser, setIsExportingByUser] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== "admin") {
        navigate("/");
        return;
      }
      setUser(parsedUser);
      fetchRegistrations();
      fetchStatistics();
      fetchUsers();
    } else {
      navigate("/");
    }
  }, [navigate, currentPage]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/registrations/all?page=${currentPage}&limit=10`,
      );
      const data = await response.json();

      setRegistrations(data.registrations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch("/api/dashboard/statistics");
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users/dropdown");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleSelectRegistration = (id: number) => {
    const newSelected = new Set(selectedRegistrations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRegistrations(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRegistrations.size === registrations.length) {
      setSelectedRegistrations(new Set());
    } else {
      setSelectedRegistrations(new Set(registrations.map((reg) => reg.id)));
    }
  };

  const handleExportSelected = async () => {
    if (selectedRegistrations.size === 0) {
      alert("Please select registrations to export");
      return;
    }

    try {
      const selectedIds = Array.from(selectedRegistrations);
      const response = await fetch("/api/registrations/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registrationIds: selectedIds }),
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
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export registrations");
    }
  };

  const handleDateRangeChange = (
    startDate: string | null,
    endDate: string | null,
  ) => {
    setDateRange({ startDate, endDate });
  };

  const handleExportByDateRange = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert("Please select both start and end dates");
      return;
    }

    try {
      setIsExporting(true);
      const response = await fetch("/api/users/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
      });

      if (response.ok) {
        // Get the CSV content and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `users_export_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to export users data",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportByUser = async () => {
    if (!selectedUserId) {
      alert("Please select a user");
      return;
    }

    try {
      setIsExportingByUser(true);
      const response = await fetch("/api/registrations/export-by-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
        }),
      });

      if (response.ok) {
        // Get the CSV content and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;

        // Get the filename from the Content-Disposition header if available
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `user_registrations_${selectedUserId}.csv`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }
    } catch (error) {
      console.error("Export by user error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export user registrations",
      );
    } finally {
      setIsExportingByUser(false);
    }
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.phone.includes(searchTerm) ||
      reg.aadhar_number?.includes(searchTerm) ||
      reg.voter_id?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Manage registrations and export producer cards
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/admin/users")}
              variant="outline"
              size="sm"
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              <Users size={16} className="mr-2" />
              Users
            </Button>

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

      {/* Statistics Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Registrations
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics?.totalRegistrations || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Products
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics?.activeProducts || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics?.thisMonth || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {selectedRegistrations.size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search and Selection Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full md:w-auto">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <Input
                    type="text"
                    placeholder="Search by name, phone, Aadhar number, or Voter ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/admin/users")}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                >
                  <Users size={16} className="mr-2" />
                  Manage Users
                </Button>

                <Button onClick={handleSelectAll} variant="outline" size="sm">
                  {selectedRegistrations.size === registrations.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>

                <Button
                  onClick={handleExportSelected}
                  disabled={selectedRegistrations.size === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Download size={16} className="mr-2" />
                  Export Cards ({selectedRegistrations.size})
                </Button>
              </div>
            </div>

            {/* Date Range Export Section */}
            <div className="border-t pt-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Export Users by Date Range
                  </h3>
                  <DateRangePicker
                    onDateRangeChange={handleDateRangeChange}
                    className="w-full"
                  />
                </div>

                <Button
                  onClick={handleExportByDateRange}
                  disabled={
                    !dateRange.startDate || !dateRange.endDate || isExporting
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <FileSpreadsheet size={16} className="mr-2" />
                  {isExporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </div>

            {/* Export by User Section */}
            <div className="border-t pt-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Export Registrations by User
                  </h3>
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{user.username}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {user.registration_count} registrations
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleExportByUser}
                  disabled={!selectedUserId || isExportingByUser}
                  className="bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <UserPlus size={16} className="mr-2" />
                  {isExportingByUser
                    ? "Exporting..."
                    : "Export User Registrations"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Registrations</CardTitle>
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
                {filteredRegistrations.map((registration) => (
                  <div
                    key={registration.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedRegistrations.has(registration.id)
                        ? "bg-green-50 border-green-200"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedRegistrations.has(registration.id)}
                        onChange={() =>
                          handleSelectRegistration(registration.id)
                        }
                        className="mt-1"
                      />

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
                                Age: {registration.age}, {registration.gender}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {registration.address}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm">
                            <strong>Phone:</strong> {registration.phone}
                          </p>
                          {registration.email && (
                            <p className="text-sm">
                              <strong>Email:</strong> {registration.email}
                            </p>
                          )}
                          {registration.aadhar_number && (
                            <p className="text-sm">
                              <strong>Aadhar:</strong>{" "}
                              {registration.aadhar_number}
                            </p>
                          )}
                          {registration.voter_id && (
                            <p className="text-sm">
                              <strong>Voter ID:</strong> {registration.voter_id}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm">
                            <strong>Categories:</strong>{" "}
                            {registration.category_names}
                          </p>
                          {registration.production_summary && (
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              <strong>Production:</strong>{" "}
                              {registration.production_summary}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-1">
                            Registered:{" "}
                            {format(
                              new Date(registration.created_at),
                              "MMM dd, yyyy",
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate(`/registration-details/${registration.id}`)
                          }
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRegistrations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No registrations found
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>

                <span className="px-4 py-2 text-sm">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
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
