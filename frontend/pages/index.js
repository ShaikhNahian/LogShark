import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Choose a file first");
    setLoading(true);
    try {
      const form = new FormData();
      form.append("logfile", file);
      const upRes = await axios.post("http://localhost:5000/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const analyzeRes = await axios.post("http://localhost:5000/analyze", {
        logData: upRes.data.logData
      });

      setSummary(analyzeRes.data.summary);
    } catch (err) {
      console.error(err);
      alert("Upload or analysis failed. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        <h1 className="text-3xl font-bold mb-4">LogShark 🦈</h1>

        {/* --- File Upload Section --- */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          {/* Hidden File Input */}
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />

          {/* Styled Label as Button */}
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer transition"
          >
            {file ? file.name : "Choose File"}
          </label>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={loading}
            className={`px-5 py-2 rounded text-white font-medium transition 
              ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {loading ? "Analyzing..." : "Upload & Analyze"}
          </button>
        </div>

        {summary && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">AI Summary</h2>
            <pre className="whitespace-pre-wrap">{summary}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
