"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Trash2, Loader2, Calendar, FileQuestion } from "lucide-react";

interface Statement {
  id: string;
  fileName: string;
  bankName: string | null;
  uploadedAt: string;
  _count: { transactions: number };
}

export default function StatementsManager() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/statements");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      setStatements(data.statements ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatements(); }, [fetchStatements]);

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`"${fileName}" хуулгыг бүх гүйлгээтэй нь устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/statements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Устгаж чадсангүй");
      }
      await fetchStatements();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && statements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (statements.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <FileQuestion className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Хуулга оруулаагүй байна</p>
        <p className="text-xs text-gray-400 mt-1">Үндсэн хуудаснаас файл оруулна уу</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          Нийт {statements.length} хуулга
        </p>
        <p className="text-xs text-gray-400">
          Хуулга устгахад түүний бүх гүйлгээ ч мөн устана
        </p>
      </div>
      <ul className="divide-y divide-gray-100">
        {statements.map(s => (
          <li key={s.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 truncate">{s.fileName}</p>
                {s.bankName && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 flex-shrink-0">
                    {s.bankName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(s.uploadedAt).toLocaleDateString("mn-MN")}
                </span>
                <span className="text-xs text-gray-400">
                  · {s._count.transactions} гүйлгээ
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDelete(s.id, s.fileName)}
              disabled={deletingId === s.id}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Устгах"
            >
              {deletingId === s.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
