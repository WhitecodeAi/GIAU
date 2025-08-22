import "./global.css";
import { createRoot } from "react-dom/client";

const TestApp = () => {

  
  return (
    <div style={{ 
      minHeight: "100vh", 
      backgroundColor: "#f0f9ff", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      flexDirection: "column",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ color: "#1f2937", fontSize: "32px", marginBottom: "16px" }}>
        GI Registration App - Test Mode
      </h1>
      <p style={{ color: "#6b7280", fontSize: "18px", marginBottom: "24px" }}>
        If you can see this, React is working!
      </p>
      <div style={{
        backgroundColor: "#10b981",
        color: "white",
        padding: "12px 24px",
        borderRadius: "8px",
        fontSize: "16px"
      }}>
        ✅ Frontend is visible
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")!).render(<TestApp />);
