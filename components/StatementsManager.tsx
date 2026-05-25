"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FileText, Trash2, Loader2, Calendar, FileQuestion, Square, CheckSquare } from "lucide-react";

interface Statement {
  id: string;
  fileName: string;
  bankName: string | null;
  uploadedAt: string;
  _count: { transactions: number };
}

// Зөвхөн test/local орчинд multi-select & bulk-delete UI харуулна.
// .env.local дотор `NEXT_PUBLIC_TEST_MODE=1` тавьсан үед идэвхтэй.
// Production .env-д энэ var тавиагүй тул feature production-д харагдахгүй.
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "1";

export default function StatementsManager() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/statements");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Алдаа");
      setStatements(data.statements ?? []);
      setSelectedIds(new Set()); // refresh-ийн дараа сонголтыг цэвэрлэнэ
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

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = useMemo(
    () => statements.length > 0 && selectedIds.size === statements.length,
    [statements.length, selectedIds.size]
  );

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(statements.map(s => s.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size} хуулгыг бүх гүйлгээтэй нь устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/statements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Устгаж чадсангүй");
      await fetchStatements();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Алдаа");
    } finally {
      setBulkDeleting(false);
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
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {TEST_MODE && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              title={allSelected ? "Бүгдийг сонголтоос гаргах" : "Бүгдийг сонгох"}
            >
              {allSelected
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />}
            </button>
          )}
          <p className="text-sm font-semibold text-gray-700">
            Нийт {statements.length} хуулга
            {TEST_MODE && selectedIds.size > 0 && (
              <span className="ml-2 text-blue-600">· {selectedIds.size} сонгосон</span>
            )}
          </p>
        </div>
        {TEST_MODE && selectedIds.size > 0 ? (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {bulkDeleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />}
            {selectedIds.size} устгах
          </button>
        ) : (
          <p className="text-xs text-gray-400 hidden sm:block">
            Хуулга устгахад түүний бүх гүйлгээ ч мөн устана
          </p>
        )}
      </div>
      <ul className="divide-y divide-gray-100">
        {statements.map(s => {
          const checked = selectedIds.has(s.id);
          return (
            <li
              key={s.id}
              className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 ${checked ? "bg-blue-50/50" : ""}`}
            >
              {TEST_MODE && (
                <button
                  type="button"
                  onClick={() => toggleOne(s.id)}
                  className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                  title={checked ? "Сонголтоос гаргах" : "Сонгох"}
                >
                  {checked
                    ? <CheckSquare className="w-4 h-4 text-blue-600" />
                    : <Square className="w-4 h-4" />}
                </button>
              )}
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
                disabled={deletingId === s.id || bulkDeleting}
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
          );
        })}
      </ul>
    </div>
  );
}
