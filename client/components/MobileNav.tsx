import { useState } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobileNavProps {
  user: any;
  currentPage?: "dashboard" | "registration";
  currentStep?: number;
  onLogout: () => void;
}

export default function MobileNav({
  user,
  currentPage,
  currentStep,
  onLogout,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsOpen(true)}
          className="text-gray-600 hover:text-gray-800"
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <span className="font-bold text-gray-800">Indian GI</span>
        </div>

        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User size={16} className="text-blue-600" />
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-64 bg-white shadow-lg flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
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
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4">
              {currentPage === "registration" && currentStep ? (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">
                    Registration Steps
                  </h3>
                  <div className="space-y-2">
                    {[
                      { step: 1, title: "Personal Info" },
                      { step: 2, title: "Documents" },
                      { step: 3, title: "Category" },
                      { step: 4, title: "Existing Products" },
                      { step: 5, title: "Production Details" },
                    ].map(({ step, title }) => (
                      <div
                        key={step}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          currentStep === step
                            ? "bg-blue-50 text-blue-700"
                            : currentStep > step
                              ? "bg-teal-50 text-teal-700"
                              : "text-gray-500"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            currentStep === step
                              ? "bg-blue-500 text-white"
                              : currentStep > step
                                ? "bg-teal-500 text-white"
                                : "bg-gray-300 text-gray-600"
                          }`}
                        >
                          {currentStep > step ? "✓" : step}
                        </div>
                        <span className="text-sm font-medium">{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <nav className="space-y-2">
                  <div
                    className={`px-3 py-2 rounded-lg ${
                      currentPage === "dashboard"
                        ? "bg-green-50 text-green-700 font-medium"
                        : "text-gray-600"
                    }`}
                  >
                    Dashboard
                  </div>
                  <button
                    onClick={() => {
                      navigate("/registration");
                      setIsOpen(false);
                    }}
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
              )}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {user?.username || "9922433036"}
                  </p>
                  <p className="text-sm text-gray-600">Administrator</p>
                </div>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 text-[hsl(var(--gi-secondary))] hover:text-[hsl(var(--gi-secondary))]/80 font-medium text-sm"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
