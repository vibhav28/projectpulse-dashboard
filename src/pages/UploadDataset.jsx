import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/auth";
export default function UploadDataset() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const handleUpload = async () => {
    if (!file) return;
    setStatus("loading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/upload-csv", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      setStatus("success");
      setMessage("Dataset uploaded successfully!");
    } catch {
      setStatus("error");
      setMessage("Upload failed. Please try again.");
    }
  };
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h1 className="text-lg font-semibold mb-1">Upload Dataset</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Upload a CSV file to analyze with AI
        </p>
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setStatus("idle");
              setMessage("");
            }}
          />
          <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          {file ? (
            <p className="text-sm font-medium">{file.name}</p>
          ) : (
            <>
              <p className="text-sm font-medium">Click to select a CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only .csv files supported
              </p>
            </>
          )}
        </div>
        <Button
          onClick={handleUpload}
          disabled={!file || status === "loading"}
          className="w-full mt-4"
        >
          {status === "loading" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload
        </Button>
        {status === "success" && (
          <div className="flex items-center gap-2 mt-4 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 mt-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {message}
          </div>
        )}
      </motion.div>
    </div>
  );
}
