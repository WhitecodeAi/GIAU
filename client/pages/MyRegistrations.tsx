import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, ArrowLeft, Search, Calendar, Eye } from "lucide-react";
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
    } catch {}
    loadMyRegistrations();
  }, [navigate]);

  const loadMyRegistrations = async () => {
    try {
      setLoading(true);
      const data = await registrationsAPI.getUserRegistrations();
      const list = Array.isArray(data) ? data : data?.registrations || [];
      setRegistrations(list as any);
    } catch (_err) {
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

  const handleExport = async () => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      navigate("/");
      return;
    }
    const me = JSON.parse(stored);
    const userId = me?.id;
    if (!userId) return;

    setIsExporting(true);

    // Use server-side export which properly handles individual products and production details
    const bases = [
      (import.meta as any).env?.VITE_API_URL || "/api",
      "/.netlify/functions/api",
    ];

    let success = false;
    for (const base of bases) {
      try {
        const res = await fetch(`${base}/registrations/export-by-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            // Pass filtered registration IDs to only export current view
            registrationIds: filtered.map(r => r.id)
          }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          // rely on server filename when possible
          const cd = res.headers.get("Content-Disposition") || "";
          const m = cd.match(/filename="?([^";]+)"?/i);
          a.download =
            m?.[1] ||
            `my_registrations_detailed_${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          success = true;
          break;
        }
      } catch {
        // try next base
      }
    }
    setIsExporting(false);
    if (!success) {
      alert("Export failed. Please try again later.");
    }
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to My Registrations
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-primary"
              >
                {isExporting ? "Exporting..." : "Export to Excel"}
              </Button>
              <Button
                variant="outline"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Registration Details - #{selected.id}
                <Badge variant="outline">User: {user?.username}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Name:</span> {selected.name}
                    </div>
                    <div>
                      <span className="font-medium">Mobile Number:</span>{" "}
                      {selected.phone}
                    </div>
                    {selected.email && (
                      <div>
                        <span className="font-medium">Email:</span>{" "}
                        {selected.email}
                      </div>
                    )}
                    {selected.aadhar_number && (
                      <div>
                        <span className="font-medium">Aadhar Number:</span>{" "}
                        {selected.aadhar_number}
                      </div>
                    )}
                    {selected.voter_id && (
                      <div>
                        <span className="font-medium">Voter ID:</span>{" "}
                        {selected.voter_id}
                      </div>
                    )}
                    {selected.pan_number && (
                      <div>
                        <span className="font-medium">PAN Number:</span>{" "}
                        {selected.pan_number}
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
                      {selected.category_names || selected.category_name ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(
                            selected.category_names ||
                            selected.category_name ||
                            ""
                          )
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
                        <span className="text-gray-600">-</span>
                      )}
                    </div>
                    {selected.existing_products && (
                      <div>
                        <span className="font-medium">Existing Products:</span>{" "}
                        {selected.existing_products}
                      </div>
                    )}
                    {selected.selected_products && (
                      <div>
                        <span className="font-medium">Selected Products:</span>{" "}
                        {selected.selected_products}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Registration Date:</span>
                      <p className="text-gray-600">
                        {formatDate(selected.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Uploaded Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {selected.documentUrls?.aadharCard && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Aadhar Card</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selected.documentUrls.aadharCard}
                          alt="Aadhar Card"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.panCard && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">PAN Card</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selected.documentUrls.panCard}
                          alt="PAN Card"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.proofOfProduction && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Proof of Production
                      </h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selected.documentUrls.proofOfProduction}
                          alt="Proof of Production"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.signature && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Signature</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selected.documentUrls.signature}
                          alt="Signature"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {selected.documentUrls?.photo && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">
                        Profile Photo
                      </h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <img
                          src={selected.documentUrls.photo}
                          alt="Profile Photo"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "/placeholder.svg";
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
                    <div className="text-center py-8 text-gray-500">
                      No documents uploaded for this registration.
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
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                My Registrations
              </h1>
              <p className="text-gray-600">
                Registrations submitted by {user?.username ?? "you"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary"
            >
              {isExporting ? "Exporting..." : "Export to Excel"}
            </Button>
            <Button
              variant="outline"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
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
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="ml-2 text-gray-600">Loading registrations...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-6">
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-gray-500">No registrations found.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((r) => (
                  <Card
                    key={r.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {r.name}
                            </h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">
                                Registration ID:
                              </span>{" "}
                              #{r.id}
                            </div>
                            {r.phone && (
                              <div>
                                <span className="font-medium">
                                  Mobile Number:
                                </span>{" "}
                                {r.phone}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Categories:</span>{" "}
                              {r.categories &&
                              (r as any).categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(r as any).categories.map((c: any) => (
                                    <Badge
                                      key={c.id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {c.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-600">
                                  {r.category_names || r.category_name}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Submitted on {formatDate(r.created_at)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(r)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> View Details
                        </Button>
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
