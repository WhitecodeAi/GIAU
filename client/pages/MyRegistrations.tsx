import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  LogOut, 
  ArrowLeft, 
  Search, 
  Calendar, 
  Eye, 
  Download,
  User,
  Phone,
  Mail,
  FileText,
  Building2,
  Filter
} from "lucide-react";
import { registrationsAPI, logout } from "@/lib/api";

interface RegistrationItem {
  id: number;
  name: string;
  created_at: string;
  phone?: string;
  email?: string;
  category_name?: string;
  category_names?: string;
  existing_products?: string;
  selected_products?: string;
  aadhar_number?: string;
  voter_id?: string;
  pan_number?: string;
  categories?: { id: number; name: string }[];
  documentUrls?: {
    aadharCard?: string;
    panCard?: string;
    proofOfProduction?: string;
    signature?: string;
    photo?: string;
  };
}

export default function MyRegistrations() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RegistrationItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      navigate("/");
    }
    loadMyRegistrations();
  }, [navigate]);

  const loadMyRegistrations = async () => {
    try {
      setLoading(true);
      const data = await registrationsAPI.getUserRegistrations();
      const list = Array.isArray(data) ? data : data?.registrations || [];
      setRegistrations(list as any);
    } catch (error) {
      console.error("Error loading registrations:", error);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registrations;
    return registrations.filter((r) =>
      [r.name, r.phone, r.email, r.category_name, r.category_names]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [search, registrations]);

  const formatDate = (s: string) =>
    new Date(s).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleExportServer = async () => {
    try {
      setIsExporting(true);
      const stored = localStorage.getItem("user");
      const me = stored ? JSON.parse(stored) : null;
      const userId = me?.id ?? me?.userId;
      if (!userId) {
        alert("Unable to export: missing user id.");
        return;
      }
      const token = localStorage.getItem("token");

      const res = await fetch("/api/registrations/export-by-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/csv",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        let msg = "Export failed";
        try {
          const data = await res.json();
          msg = (data as any)?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename=\"?([^\";]+)\"?/);
      const filename = m?.[1] || `registrations_by_${me?.username || "user"}_${new Date().toISOString().slice(0,10)}.csv`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const stored = localStorage.getItem("user");
      const me = stored ? JSON.parse(stored) : null;
      const username = me?.username || "";

      const headers = [
        "Reg. Date",
        "User name",
        "Reg. ID No",
        "Name of AU Applicant", 
        "Age",
        "Gender",
        "email id",
        "Phone number",
        "Aadhar Card",
        "Pan Card", 
        "Voter Id Card",
        "Categories",
        "Existing Products",
        "Annual Production Quantity",
        "Annual production type",
        "Annual Turnover",
        "Future Products",
      ];

      const escape = (val: any) => {
        const s = val == null ? "" : String(val);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };

      const rows: string[] = [];

      for (const r of filtered) {
        const regDate = new Date(r.created_at).toLocaleDateString("en-GB");
        const categories = r.categories && r.categories.length
          ? r.categories.map((c: any) => c.name).join(", ")
          : r.category_names || r.category_name || "";

        const selectedProducts = r.selected_products
          ? String(r.selected_products)
              .split(/[,\n]/)
              .map((p) => p.trim())
              .filter((p) => p)
          : [];

        const baseData = [
          regDate,
          username,
          r.id.toString(),
          r.name,
          "",
          "",
          r.email || "",
          r.phone || "",
          r.aadhar_number || "",
          r.pan_number || "",
          r.voter_id || "",
          categories,
          r.existing_products || "",
          "",
          "",
          "",
        ];

        if (selectedProducts.length === 0) {
          rows.push([...baseData, ""].map(escape).join(","));
        } else {
          for (const product of selectedProducts) {
            rows.push([...baseData, product.trim()].map(escape).join(","));
          }
        }
      }

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my_registrations_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to My Registrations
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleExportServer}
                  disabled={isExporting}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export to Excel"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  Registration Details - #{selected.id}
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <User className="w-3 h-3 mr-1" />
                  {user?.username}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Personal Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">Full Name</span>
                        <p className="font-semibold text-gray-900">{selected.name}</p>
                      </div>
                    </div>
                    {selected.phone && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-600">Mobile Number</span>
                          <p className="font-semibold text-gray-900">{selected.phone}</p>
                        </div>
                      </div>
                    )}
                    {selected.email && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-600">Email Address</span>
                          <p className="font-semibold text-gray-900">{selected.email}</p>
                        </div>
                      </div>
                    )}
                    {selected.aadhar_number && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-600">Aadhar Number</span>
                          <p className="font-semibold text-gray-900">{selected.aadhar_number}</p>
                        </div>
                      </div>
                    )}
                    {selected.voter_id && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-600">Voter ID</span>
                          <p className="font-semibold text-gray-900">{selected.voter_id}</p>
                        </div>
                      </div>
                    )}
                    {selected.pan_number && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-600">PAN Number</span>
                          <p className="font-semibold text-gray-900">{selected.pan_number}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-gray-900">Product Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Categories</span>
                      {selected.categories && selected.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selected.categories.map((c) => (
                            <Badge
                              key={c.id}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {c.name}
                            </Badge>
                          ))}
                        </div>
                      ) : selected.category_names || selected.category_name ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(selected.category_names || selected.category_name || "")
                            .split(",")
                            .map((c, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {c.trim()}
                              </Badge>
                            ))}
                        </div>
                      ) : (
                        <p className="text-gray-600 mt-1">No categories selected</p>
                      )}
                    </div>
                    {selected.existing_products && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Existing Products</span>
                        <p className="font-semibold text-gray-900 mt-1">{selected.existing_products}</p>
                      </div>
                    )}
                    {selected.selected_products && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Selected Products</span>
                        <p className="font-semibold text-gray-900 mt-1">{selected.selected_products}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-600">Registration Date</span>
                        <p className="font-semibold text-gray-900">{formatDate(selected.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documents Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-gray-900">Uploaded Documents</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selected.documentUrls?.aadharCard && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">Aadhar Card</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src={selected.documentUrls.aadharCard}
                          alt="Aadhar Card"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.panCard && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">PAN Card</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src={selected.documentUrls.panCard}
                          alt="PAN Card"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.proofOfProduction && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">Proof of Production</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src={selected.documentUrls.proofOfProduction}
                          alt="Proof of Production"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.signature && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">Digital Signature</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src={selected.documentUrls.signature}
                          alt="Signature"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.photo && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 text-sm">Profile Photo</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                        <img
                          src={selected.documentUrls.photo}
                          alt="Profile Photo"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!selected.documentUrls?.aadharCard &&
                  !selected.documentUrls?.panCard &&
                  !selected.documentUrls?.proofOfProduction &&
                  !selected.documentUrls?.signature &&
                  !selected.documentUrls?.photo && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No documents uploaded for this registration.</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-primary" />
                  <h1 className="text-2xl font-bold text-gray-800">My Registrations</h1>
                </div>
                <p className="text-gray-600 mt-1">
                  Registrations submitted by <span className="font-semibold">{user?.username ?? "you"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleExportServer}
                disabled={isExporting || filtered.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isExporting ? "Exporting..." : "Export to Excel"}
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, mobile number, or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <span>{filtered.length} of {registrations.length} registrations</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="ml-3 text-gray-600">Loading registrations...</span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Registrations List */}
            <div className="space-y-4">
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No registrations found</h3>
                      <p className="text-gray-500">
                        {search 
                          ? "Try adjusting your search criteria"
                          : "You haven't submitted any registrations yet"
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((r) => (
                  <Card
                    key={r.id}
                    className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary"
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-semibold text-gray-900">{r.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              ID #{r.id}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {r.phone && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4" />
                                <span>{r.phone}</span>
                              </div>
                            )}
                            {r.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="w-4 h-4" />
                                <span className="truncate">{r.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(r.created_at)}</span>
                            </div>
                          </div>

                          {/* Categories */}
                          <div className="space-y-2">
                            <span className="text-sm font-medium text-gray-700">Categories:</span>
                            {r.categories && r.categories.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {r.categories.map((c: any) => (
                                  <Badge
                                    key={c.id}
                                    variant="secondary"
                                    className="bg-blue-50 text-blue-700 border-blue-200"
                                  >
                                    {c.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {(r.category_names || r.category_name || "No categories")
                                  .split(",")
                                  .map((c, i) => (
                                    <Badge
                                      key={i}
                                      variant="secondary"
                                      className="bg-gray-50 text-gray-700 border-gray-200"
                                    >
                                      {c.trim()}
                                    </Badge>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setSelected(r)}
                            className="flex items-center gap-2 btn-desktop"
                          >
                            <Eye className="w-4 h-4" /> View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
