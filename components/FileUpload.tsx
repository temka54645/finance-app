"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

interface Props {
  onSuccess: () => void;
}

export default function FileUpload({ onSuccess }: Props) {
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
          `Сүлжээний алдаа: серверт хүрэх боломжгүй. Серверийн terminal-д ${netErr instanceof Error ? netErr.message : "алдаа"} харагдсан эсэхийг шалгана уу.`
        );
      }

      const text = await res.text();
      let data: { error?: string; count?: number };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Сервер буцаасан хариу JSON биш: ${text.slice(0, 200)}`);
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
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Банкны нэр (заавал биш)"
        value={bankName}
        onChange={e => setBankName(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <label
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleChange} />
        {loading ? (
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-400 mb-3" />
            <p className="font-medium text-gray-700">Файл чирж оруулах эсвэл дарж сонгох</p>
            <p className="text-sm text-gray-400 mt-1">PDF, Excel (.xlsx), CSV дэмжигдэнэ</p>
          </>
        )}
      </label>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
          <FileText className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
