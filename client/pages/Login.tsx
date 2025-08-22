import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authAPI, handleAPIError } from "@/lib/api";

export default function Login() {
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

      navigate("/dashboard");
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
              <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
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
                <Label
                  htmlFor="username"
                  className="text-gray-700 font-medium text-sm"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter User Name*"
                  className="mt-2 input-desktop text-gray-700 bg-gray-50 border-gray-300 rounded-lg focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <Label
                  htmlFor="password"
                  className="text-gray-700 font-medium text-sm"
                >
                  Password
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    className="input-desktop text-gray-700 bg-gray-50 border-gray-300 rounded-lg pr-20 focus:border-green-500 focus:ring-green-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[hsl(var(--geo-secondary))] font-medium flex items-center gap-1 hover:text-[hsl(var(--geo-secondary))]/80"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span className="text-sm">
                      {showPassword ? "Hide" : "Show"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="btn-primary btn-desktop w-full text-lg font-semibold mt-8 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Logging in...
                  </>
                ) : (
                  "LOGIN"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>Secure login for GI product registration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
