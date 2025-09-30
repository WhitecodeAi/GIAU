import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, registrationsAPI, logout } from "@/lib/api";

export default function DashboardFixed() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalRegistrations: 0,
    totalApplications: 0,
    myRegistrations: 0,
    myApplications: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch {}
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsData, activityData] = await Promise.all([
        dashboardAPI.getStatistics(),
        dashboardAPI.getRecentActivity(),
      ]);

      // Compute user-specific counts if user is logged in
      let myRegistrationsCount = 0;
      let myApplicationsCount = 0;
      const userDataRaw = localStorage.getItem("user");
      if (userDataRaw) {
        try {
          const userRegsResp: any = await registrationsAPI.getUserRegistrations();
          let regs: any[] = [];
          if (Array.isArray(userRegsResp)) regs = userRegsResp;
          else if (userRegsResp && userRegsResp.registrations) regs = userRegsResp.registrations;
          myRegistrationsCount = regs.length;
          myApplicationsCount = regs.filter((r) => {
            const sel = r.selected_products || r.selectedProducts || r.existing_products || r.existingProducts;
            if (!sel) return false;
            if (typeof sel === "string") {
              const trimmed = sel.trim();
              return trimmed !== "" && trimmed !== "[]";
            }
            if (Array.isArray(sel)) return sel.length > 0;
            return false;
          }).length;
        } catch (err) {
          // ignore per-user fetch errors
        }
      }

      setStats({
        ...statsData,
        myRegistrations: myRegistrationsCount,
        myApplications: myApplicationsCount,
      } as any);

      setRecentActivity(activityData);
    } catch (_error) {
      // Silent fallback: UI will show zeros/empty lists
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleNewRegistration = () => {
    navigate("/registration");
  };

  const handleViewRegistrations = () => {
    navigate("/registrations");
  };

  const handleViewRegistrationsByUser = () => {
    navigate("/my-registrations");
  };

  const handleGenerateReports = () => {
    navigate("/reports");
  };

  const handleCompressionTest = () => {
    navigate("/compression-test");
  };

  const handleTestUpload = () => {
    navigate("/test-upload");
  };

  const handleSimpleTest = () => {
    navigate("/test-simple");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            GI Registration Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Total AU Applicant Registrations
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalRegistrations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 16V8a2 2 0 00-1-1.73l-8-4.62a2 2 0 00-2 0l-8 4.62A2 2 0 003 8v8a2 2 0 001 1.73l8 4.62a2 2 0 002 0l8-4.62A2 2 0 0021 16z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7l10 5-10 5V7z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof stats.totalApplications === "number"
                    ? stats.totalApplications
                    : stats.totalProducts || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.myRegistrations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.myApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleNewRegistration}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                New AU Applicant Registration
              </button>
              <button
                onClick={handleViewRegistrations}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Registrations
              </button>
              <button
                onClick={handleViewRegistrationsByUser}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View Registrations by User
              </button>
              {/* <button
                onClick={handleCompressionTest}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                File Compression Test
              </button> */}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className="w-2 h-2 rounded-full mr-3 bg-blue-500"></div>
                    <span className="text-gray-600">{activity.message}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No recent activity</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              System Statistics
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Total Data Collectors
                </span>
                <span className="text-sm text-blue-600 font-medium">
                  {stats.totalUsers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Product Categories
                </span>
                <span className="text-sm text-blue-600 font-medium">
                  {stats.totalCategories}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Products</span>
                <span className="text-sm text-blue-600 font-medium">
                  {stats.totalProducts}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
