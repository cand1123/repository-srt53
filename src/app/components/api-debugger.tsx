import React, { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

interface ApiDebuggerProps {
  apiEndpoint: string;
  jenjang: string;
}

export function ApiDebugger({ apiEndpoint, jenjang }: ApiDebuggerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint);
      const json = await response.json();
      setData(json);
      console.log(`${jenjang} API Response:`, json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error(`${jenjang} API Error:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Debug API - {jenjang}</h3>
        <Button size="sm" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test API"}
        </Button>
      </div>
      
      {error && (
        <div className="text-red-600 text-xs p-2 bg-red-50 rounded mb-2">
          Error: {error}
        </div>
      )}
      
      {data && (
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs font-semibold mb-2">Response Structure:</p>
          <pre className="text-xs overflow-auto max-h-60 bg-gray-900 text-green-400 p-2 rounded">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
