import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, handleAPIError } from "@/lib/api";

export default function LoginFixed() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await authAPI.login(username, password);

      // Store user data and token
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...response.user,
          token: response.token,
        }),
      );

      // Redirect based on user role
      if (response.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(handleAPIError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="desktop-container">
      {/* Desktop/Mobile Background */}
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
          {/* Login Card */}
          <div className="card-container">
            {/* Logo Section */}
            <div className="text-center mb-8">
                <div className="mb-8">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2F6d290b314071499797627b72ba9eee0c%2F6214c05e13a84aaa8d3c108e9e1ffeb0?format=webp&width=800"
                    alt="Indian GI Logo"
                    className="mx-auto w-32 h-32 object-contain"
                  />
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
                INDIAN GI REGISTRATION APP
              </h1>
              <p className="text-gray-600">
                Geographical Indication Authentication Unit
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username Field */}
              <div>
                <label
                  htmlFor="username"
                  className="text-gray-700 font-medium text-sm"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter User Name*"
                  className="mt-2 input-desktop text-gray-700 bg-gray-50 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500 w-full h-12 px-4 border focus:outline-none focus:ring-2"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="text-gray-700 font-medium text-sm"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="input-desktop text-gray-700 bg-gray-50 border-gray-300 rounded-lg pr-20 focus:border-green-500 focus:ring-green-500 w-full h-12 px-4 border focus:outline-none focus:ring-2"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-medium flex items-center gap-1 hover:text-blue-800"
                  >
                    {showPassword ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                          />
                        </svg>
                        Hide
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        Show
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary btn-desktop w-full text-lg font-semibold mt-8 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Logging in...
                  </>
                ) : (
                  "LOGIN"
                )}
              </button>
            </form>

            {/* Footer */}
            {/* <div className="mt-8 text-center text-sm text-gray-500">
              <p>Secure login for GI product registration</p>
              <p className="mt-2 text-xs">Admin: admin / admin123</p>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/setup-admin", {
                      method: "POST",
                    });
                    const data = await response.json();
                    if (response.ok) {
                      alert("Admin user setup completed");
                    }
                  } catch (error) {
                    console.error("Setup error:", error);
                  }
                }}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Setup Admin User
              </button>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
