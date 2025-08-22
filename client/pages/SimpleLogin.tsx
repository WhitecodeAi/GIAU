export default function SimpleLogin() {


  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #f0fdf4 0%, #dbeafe 50%, #ffffff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
            padding: "32px",
          }}
        >
          {/* Logo Section */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                margin: "0 auto 24px",
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #10b981, #3b82f6)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                style={{ width: "48px", height: "48px", color: "white" }}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "8px",
                fontFamily: "Arial, sans-serif",
              }}
            >
              INDIAN GI REGISTRATION APP
            </h1>
            <p
              style={{
                color: "#6b7280",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Geographical Indication Authentication Unit
            </p>
          </div>

          {/* Simple Form */}
          <form style={{ marginBottom: "32px" }}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  color: "#374151",
                  fontWeight: "500",
                  fontSize: "14px",
                  marginBottom: "8px",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Username
              </label>
              <input
                type="text"
                placeholder="Enter User Name*"
                style={{
                  width: "100%",
                  height: "48px",
                  fontSize: "16px",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "0 16px",
                  fontFamily: "Arial, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "32px" }}>
              <label
                style={{
                  display: "block",
                  color: "#374151",
                  fontWeight: "500",
                  fontSize: "14px",
                  marginBottom: "8px",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="Enter Password"
                style={{
                  width: "100%",
                  height: "48px",
                  fontSize: "16px",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "0 16px",
                  fontFamily: "Arial, sans-serif",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                height: "48px",
                backgroundColor: "#10b981",
                color: "white",
                fontSize: "18px",
                fontWeight: "600",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
                fontFamily: "Arial, sans-serif",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#059669";
                e.currentTarget.style.boxShadow =
                  "0 6px 12px -1px rgba(0, 0, 0, 0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#10b981";
                e.currentTarget.style.boxShadow =
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
              }}
            >
              LOGIN
            </button>
          </form>

          <div
            style={{
              textAlign: "center",
              fontSize: "14px",
              color: "#6b7280",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <p>Secure login for GI product registration</p>
          </div>
        </div>
      </div>
    </div>
  );
}
