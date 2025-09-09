import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, ArrowLeft, Search, Calendar } from "lucide-react";
import { registrationsAPI, logout } from "@/lib/api";

interface RegistrationItem {
  id: number;
  name: string;
  created_at: string;
  category_name?: string;
  category_names?: string;
  existing_products?: string;
  selected_products?: string;
}

export default function MyRegistrations() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [search, setSearch] = useState("");

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
      const list = Array.isArray(data) ? data : (data?.registrations || []);
      setRegistrations(
        (list as any[]).map((r) => ({
          id: r.id,
          name: r.name,
          created_at: r.created_at,
          category_name: r.category_name,
          category_names: (r as any).category_names,
          existing_products: r.existing_products,
          selected_products: r.selected_products,
        })),
      );
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
      [r.name, r.category_name, r.category_names]
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">My Registrations</h1>
              <p className="text-gray-600">Registrations submitted by {user?.username ?? "you"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{registrations.length}</div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search by name or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="secondary" onClick={loadMyRegistrations}>Refresh</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 animate-pulse rounded" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No registrations found</div>
            ) : (
              <div className="space-y-3">
                {filtered.map((reg) => (
                  <div
                    key={reg.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 truncate">{reg.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(reg.created_at)}
                      </div>
                      {(reg.category_names || reg.category_name) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(reg.category_names || reg.category_name || "")
                            .split(",")
                            .map((c, idx) => (
                              <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {c.trim()}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => navigate(`/registration-details/${reg.id}`)}>
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
