"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

interface Props {
  onSuccess: () => void;
  compact?: boolean;
}

export default function FileUpload({ onSuccess, compact = false }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");

  const upload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (bankName) formData.append("bankName", bankName);

      let res: Response;
      try {
        res = await fetch("/api/upload", { method: "POST", body: formData });
      } catch (netErr) {
        throw new Error(
          `Сүлжээний алдаа: ${netErr instanceof Error ? netErr.message : "тодорхойгүй алдаа"}`
        );
      }

      const text = await res.text();
      let data: { error?: string; count?: number };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Сервер JSON биш хариу буцаалаа: ${text.slice(0, 200)}`);
      }

      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }, [bankName, onSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <input
          type="text"
          placeholder="Банкны нэр (заавал биш)"
          value={bankName}
          onChange={e => setBankName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      <label
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          compact ? "p-4" : "p-10"
        } ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
        {loading ? (
          <Loader2 className={`${compact ? "w-6 h-6" : "w-10 h-10"} text-blue-500 animate-spin`} />
        ) : (
          <>
            <Upload className={`${compact ? "w-6 h-6 mb-1" : "w-10 h-10 mb-3"} text-gray-400`} />
            <p className={`font-medium text-gray-700 ${compact ? "text-xs" : ""}`}>
              {compact ? "Файл оруулах" : "Файл чирж оруулах эсвэл дарж сонгох"}
            </p>
            {!compact && (
              <p className="text-sm text-gray-400 mt-1">PDF, Excel (.xlsx), CSV дэмжигдэнэ</p>
            )}
          </>
        )}
      </label>
      {error && (
        <div className={`flex items-start gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg ${compact ? "text-xs" : "text-sm"}`}>
          <FileText className={`flex-shrink-0 ${compact ? "w-3 h-3 mt-0.5" : "w-4 h-4"}`} />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
