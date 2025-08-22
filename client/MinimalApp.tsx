import { createRoot } from "react-dom/client";

function MinimalApp() {
  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f0f9ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        textAlign: "center"
      }}>
        <h1 style={{ color: "#1f2937", marginBottom: "1rem" }}>
          🎉 React App is Working!
        </h1>
        <p style={{ color: "#6b7280" }}>
          GI Registration App - Development Mode
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<MinimalApp />);
