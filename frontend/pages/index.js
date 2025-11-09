import { useState } from "react";
import axios from "axios";
import Link from "next/link";

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
        <h1 className="text-3xl font-bold mb-6 text-center">LogShark 🦈</h1>

        <div className="mb-6 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative">
          <input
            id="file-input"
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <label
            htmlFor="file-input"
            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded cursor-pointer transition"
          >
            {file ? file.name : "Choose File"}
          </label>
        </div>

  <button
    onClick={handleUpload}
    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition disabled:opacity-60"
    disabled={loading}
  >
    {loading ? "Analyzing..." : "Upload & Analyze"}
  </button>
</div>


        {summary && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">AI Summary</h2>
            <pre className="whitespace-pre-wrap text-sm">{summary}</pre>
          </div>
        )}

        {/* Divider line */}
        <div className="my-8 border-t border-gray-200"></div>

        {/* Live Stream link section */}
        <div className="text-center">
          <p className="mb-3 text-gray-600">
            Want to monitor live logs in real time?
          </p>
          <Link href="/livestream">
            <button className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 transition">
              Go to Live Stream
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
