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
  Package,
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
import { Checkbox } from "@/components/ui/checkbox";

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

interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
}

export default function AdminDashboard() {
  // Debug environment
  console.log("AdminDashboard component mounted");
  console.log("Location:", window.location.href);
  console.log("Fetch available:", typeof fetch !== "undefined");
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
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isExportingByProducts, setIsExportingByProducts] = useState(false);
  // Removed: Export Cards, Form GI 3A, NOC, and Statement functionality
  // These are now available in individual registration details pages
  // const [isExportingGI3A, setIsExportingGI3A] = useState(false);
  // const [isExportingNOC, setIsExportingNOC] = useState(false);
  // const [isExportingStatement, setIsExportingStatement] = useState(false);
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

      // Test basic connectivity first
      const testConnectivity = async () => {
        try {
          console.log("Testing basic API connectivity...");
          const response = await fetch("/api/ping");
          if (!response.ok) {
            throw new Error(`Ping failed: ${response.status}`);
          }
          const data = await response.json();
          console.log("Ping successful:", data);
          return true;
        } catch (error) {
          console.error("Basic connectivity test failed:", error);
          return false;
        }
      };

      // Add a small delay to ensure server is ready
      const initializeData = async () => {
        const isConnected = await testConnectivity();
        if (!isConnected) {
          console.warn(
            "Connectivity check failed, proceeding to fetch data anyway",
          );
        }

        await Promise.all([
          fetchRegistrations(),
          fetchStatistics(),
          fetchUsers(),
          fetchProducts(),
        ]);
      };

      // Add retry logic with delay
      setTimeout(() => {
        initializeData().catch((error) => {
          console.error("Failed to initialize dashboard data:", error);
        });
      }, 100);
    } else {
      navigate("/");
    }
  }, [navigate, currentPage]);

  const fetchRegistrations = async (retryCount = 0) => {
    try {
      setLoading(true);
      console.log("Fetching registrations...");
      const response = await fetch(
        `/api/registrations/all?page=${currentPage}&limit=10`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Registrations data:", data);

      setRegistrations(data.registrations || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch registrations:", error);
      // Retry once after 1 second delay
      if (retryCount < 1) {
        console.log("Retrying registrations fetch...");
        setTimeout(() => fetchRegistrations(retryCount + 1), 1000);
        return;
      }
      // Show user-friendly error
      setRegistrations([]);
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
    }
  };

  const fetchStatistics = async (retryCount = 0) => {
    try {
      console.log("Fetching statistics...");
      const response = await fetch("/api/dashboard/statistics");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Statistics data:", data);
      setStatistics(data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
      // Retry once after 1 second delay
      if (retryCount < 1) {
        console.log("Retrying statistics fetch...");
        setTimeout(() => fetchStatistics(retryCount + 1), 1000);
        return;
      }
      // Set default statistics to prevent UI issues
      setStatistics({
        totalRegistrations: 0,
        activeProducts: 0,
        thisMonth: 0,
      });
    }
  };

  const fetchUsers = async () => {
    try {
      console.log("Fetching users...");
      const response = await fetch("/api/users/dropdown");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Users data:", data);
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      // Set empty users array to prevent UI issues
      setUsers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log("Fetching products...");
      const response = await fetch("/api/products");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Products data:", data);
      setProducts(data.products || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      // Set empty products array to prevent UI issues
      setProducts([]);
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

  // Removed: Export Cards functionality - now available in registration details
  // const handleExportSelected = async () => {
  //   if (selectedRegistrations.size === 0) {
  //     alert("Please select registrations to export");
  //     return;
  //   }
  //   ...
  // };

  // Removed: Form GI 3A export functionality - now available in registration details
  // const handleExportFormGI3A = async () => {
  //   ...
  // };

  // Removed: NOC export functionality - now available in registration details
  // const handleExportNOC = async () => {
  //   ...
  // };

  // Removed: Statement of Case export functionality - now available in registration details
  // const handleExportStatement = async () => {
  //   ...
  // };

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
        let errorMessage = `HTTP ${response.status}`;
        try {
          if (!response.bodyUsed) {
            const errResp =
              typeof response.clone === "function"
                ? response.clone()
                : response;
            const contentType = errResp.headers.get("Content-Type") || "";
            if (contentType.includes("application/json")) {
              const errorData = await errResp.json();
              if (
                errorData &&
                typeof errorData === "object" &&
                "error" in errorData
              ) {
                errorMessage = (errorData as any).error || errorMessage;
              }
            } else {
              const text = await errResp.text();
              if (text) errorMessage = text;
            }
          }
        } catch (parseError) {
          console.error("Failed to read error response", parseError);
        }
        throw new Error(errorMessage);
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
      console.log("Exporting user:", selectedUserId);

      const response = await fetch("/api/registrations/export-by-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
        }),
      });

      console.log("Export response status:", response.status);

      if (response.ok) {
        // Get the filename from the Content-Disposition header BEFORE consuming the body
        const contentDisposition = response.headers.get("Content-Disposition");
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .split("T")[0];
        let filename = `user_registrations_${selectedUserId}_${timestamp}.csv`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Get the CSV content and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          if (!response.bodyUsed) {
            const errResp =
              typeof response.clone === "function"
                ? response.clone()
                : response;
            const contentType = errResp.headers.get("Content-Type") || "";
            if (contentType.includes("application/json")) {
              const errorData = await errResp.json();
              if (
                errorData &&
                typeof errorData === "object" &&
                "error" in errorData
              ) {
                errorMessage = (errorData as any).error || errorMessage;
              }
            } else {
              const text = await errResp.text();
              if (text) errorMessage = text;
            }
          }
        } catch (parseError) {
          console.error("Failed to read error response", parseError);
        }
        throw new Error(errorMessage);
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

  const handleExportByProducts = async () => {
    if (selectedProductIds.length === 0) {
      alert("Please select at least one product");
      return;
    }

    try {
      setIsExportingByProducts(true);
      console.log("Exporting products:", selectedProductIds);

      const response = await fetch("/api/users/export-by-products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productIds: selectedProductIds.map((id) => parseInt(id)),
        }),
      });

      console.log("Export response status:", response.status);

      if (response.ok) {
        // Get the filename from the Content-Disposition header BEFORE consuming the body
        const contentDisposition = response.headers.get("Content-Disposition");
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .split("T")[0];
        let filename = `users_by_products_${timestamp}.csv`;

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        // Get the CSV content and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        let errorMessage = `HTTP ${response.status}`;
        try {
          if (!response.bodyUsed) {
            const errResp =
              typeof response.clone === "function"
                ? response.clone()
                : response;
            const contentType = errResp.headers.get("Content-Type") || "";
            if (contentType.includes("application/json")) {
              const errorData = await errResp.json();
              if (
                errorData &&
                typeof errorData === "object" &&
                "error" in errorData
              ) {
                errorMessage = (errorData as any).error || errorMessage;
              }
            } else {
              const text = await errResp.text();
              if (text) errorMessage = text;
            }
          }
        } catch (parseError) {
          console.error("Failed to read error response", parseError);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Export by products error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to export users by products",
      );
    } finally {
      setIsExportingByProducts(false);
    }
  };

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.phone.includes(searchTerm) ||
      reg.aadhar_number?.includes(searchTerm) ||
      reg.voter_id?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!user) {
    console.log("No user found, should redirect");
    return null;
  }

  console.log("Rendering AdminDashboard for user:", user);

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
            {/* <Button
              onClick={() => navigate("/api-test")}
              variant="outline"
              size="sm"
              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
            >
              Debug API
            </Button> */}

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

                {/* Removed: Export Cards, Form GI 3A, NOC, and Statement buttons */}
                {/* These functionalities are now available in individual registration details pages */}
                {/*
                <Button
                  onClick={handleExportSelected}
                  disabled={selectedRegistrations.size === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Download size={16} className="mr-2" />
                  Export Cards ({selectedRegistrations.size})
                </Button>

                <Button
                  onClick={handleExportFormGI3A}
                  disabled={selectedRegistrations.size === 0 || isExportingGI3A}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  <FileText size={16} className="mr-2" />
                  {isExportingGI3A
                    ? "Exporting..."
                    : `Form GI 3A (${selectedRegistrations.size})`}
                </Button>

                <Button
                  onClick={handleExportNOC}
                  disabled={selectedRegistrations.size === 0 || isExportingNOC}
                  className="bg-amber-600 hover:bg-amber-700"
                  size="sm"
                >
                  <FileText size={16} className="mr-2" />
                  {isExportingNOC
                    ? "Exporting..."
                    : `NOC (${selectedRegistrations.size})`}
                </Button>

                <Button
                  onClick={handleExportStatement}
                  disabled={
                    selectedRegistrations.size === 0 || isExportingStatement
                  }
                  className="bg-teal-600 hover:bg-teal-700"
                  size="sm"
                >
                  <FileText size={16} className="mr-2" />
                  {isExportingStatement
                    ? "Exporting..."
                    : `Statement (${selectedRegistrations.size})`}
                </Button>
                */}
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

            {/* Export by Products Section */}
            <div className="border-t pt-4">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Export Users by Products
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Select products to export all users who produce them
                  </p>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {products.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Loading products...
                        </p>
                      ) : (
                        products.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`product-${product.id}`}
                              checked={selectedProductIds.includes(
                                product.id.toString(),
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProductIds([
                                    ...selectedProductIds,
                                    product.id.toString(),
                                  ]);
                                } else {
                                  setSelectedProductIds(
                                    selectedProductIds.filter(
                                      (id) => id !== product.id.toString(),
                                    ),
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`product-${product.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {product.name}
                              <span className="text-xs text-gray-500 ml-1">
                                ({product.category_name})
                              </span>
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  {selectedProductIds.length > 0 && (
                    <p className="text-xs text-green-600 mt-2">
                      {selectedProductIds.length} product(s) selected
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleExportByProducts}
                  disabled={
                    selectedProductIds.length === 0 || isExportingByProducts
                  }
                  className="bg-orange-600 hover:bg-orange-700"
                  size="sm"
                >
                  <Package size={16} className="mr-2" />
                  {isExportingByProducts
                    ? "Exporting..."
                    : "Export Users by Products"}
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
