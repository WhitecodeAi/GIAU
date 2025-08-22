import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileNav from "@/components/MobileNav";
import { dashboardAPI, handleAPIError } from "@/lib/api";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [showList, setShowList] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [productRegistrations, setProductRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
      fetchDashboardData();
    } else {
      navigate("/");
    }
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dashboardStats = await dashboardAPI.getStatistics();
      setStatistics(dashboardStats);

      // Get recent activity
      const recentActivity = await dashboardAPI.getRecentActivity();
      setProductRegistrations(recentActivity);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", handleAPIError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileNav user={user} currentPage="dashboard" onLogout={handleLogout} />

      <div className="desktop-layout">
        {/* Sidebar */}
        <div className="desktop-sidebar">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-800">Indian GI</h1>
                <p className="text-sm text-gray-600">Registration App</p>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <div className="px-3 py-2 rounded-lg bg-green-50 text-green-700 font-medium">
                Dashboard
              </div>
              <button
                onClick={() => navigate("/registration")}
                className="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800"
              >
                New Registration
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800">
                View Reports
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-800">
                Settings
              </button>
            </nav>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">
                  {user.username || "9922433036"}
                </p>
                <p className="text-sm text-gray-600">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[hsl(var(--gi-secondary))] hover:text-[hsl(var(--gi-secondary))]/80 font-medium text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="desktop-main">
          {/* Header */}
          <div className="desktop-header">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {user.username || "9922433036"}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Last login: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="desktop-content">
            <div className="max-w-6xl mx-auto">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                <div className="card-container">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Button
                      onClick={() => navigate("/registration")}
                      className="btn-primary btn-desktop w-full"
                    >
                      + New Registration
                    </Button>

                    <Button
                      onClick={() => setShowList(!showList)}
                      className="btn-secondary btn-desktop w-full"
                    >
                      {showList ? "Hide List" : "Show List"}
                    </Button>
                  </div>
                </div>

                {/* Statistics */}
                <div className="card-container">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Statistics
                  </h3>
                  {loading ? (
                    <div className="space-y-3">
                      <div className="animate-pulse bg-gray-200 h-6 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-6 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-6 rounded"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          Total Registrations
                        </span>
                        <span className="font-bold text-2xl text-green-600">
                          {statistics?.totalRegistrations || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Active Products</span>
                        <span className="font-bold text-2xl text-blue-600">
                          {statistics?.activeProducts || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="card-container">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">New registration</span>
                      <span className="text-gray-500">2 hours ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Document uploaded</span>
                      <span className="text-gray-500">5 hours ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status updated</span>
                      <span className="text-gray-500">1 day ago</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Registrations List */}
              {showList && (
                <div className="card-container">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">
                    Product Registrations
                  </h3>

                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="animate-pulse bg-gray-200 h-20 rounded-lg"
                        ></div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {productRegistrations.map((product, index) => (
                        <div
                          key={index}
                          className="bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">
                              {product.name}
                            </span>
                            <span className="font-bold text-2xl text-green-600">
                              {product.count}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            registrations
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-center mt-6">
                    <button className="text-green-600 font-medium hover:text-green-700">
                      View More Products
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
