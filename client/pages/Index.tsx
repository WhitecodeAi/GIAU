import { DemoResponse } from "@shared/api";
import { useEffect, useState } from "react";

export default function Index() {
  const [exampleFromServer, setExampleFromServer] = useState("");
  // Fetch users on component mount
  useEffect(() => {
    fetchDemo();
  }, []);

  // Example of how to fetch data from the server (if needed)
  const fetchDemo = async () => {
    try {
      const response = await fetch("/api/demo");
      const data = (await response.json()) as DemoResponse;
      setExampleFromServer(data.message);
    } catch (error) {
      console.error("Error fetching hello:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="text-center">
        <div className="mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F6d290b314071499797627b72ba9eee0c%2F6214c05e13a84aaa8d3c108e9e1ffeb0?format=webp&width=800"
            alt="Indian GI Logo"
            className="mx-auto w-32 h-32 object-contain"
          />
        </div>
        <h1 className="text-2xl font-semibold text-slate-800">
          Indian GI Registration App
        </h1>
        <p className="mt-4 text-slate-600 max-w-md">
          Geographical Indication Authentication Unit
        </p>
        <p className="mt-4 hidden max-w-md">{exampleFromServer}</p>
      </div>
    </div>
  );
}
