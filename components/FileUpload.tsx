"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Upload, Loader2, Sparkles, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Props {
  /** Файл амжилттай boловсруулагдаж dashboard data-г refetch хийх ёстой үед автоматаар дуудагдана. Modal-ийг хаахгүй. */
  onSuccess: () => void;
  /** Хэрэглэгч success banner дахь "Дашбоард руу очих" товчийг даргахад дуудагдана. Modal-ийг хаах ёстой. Заагүй бол товч харагдахгүй. */
  onRequestClose?: () => void;
  compact?: boolean;
}

interface LimitInfo {
  message: string;
  upgradeUrl: string;
}

type ItemStatus = "pending" | "uploading" | "done" | "error" | "limit";

interface ServerTiming {
  total: number;
  parse: number;
  categorize: number;
  db: number;
}

interface QueueItem {
  id: string;
  file: File;
  status: ItemStatus;
  message?: string;
  count?: number;
  detectedBank?: string | null;
  gapWarning?: string | null;
  clientMs?: number;
  serverTiming?: ServerTiming;
  statementId?: string;
}

const ACCEPT = ".pdf,.xlsx,.xls,.csv";

function fmtBytes(n: number) {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

export default function FileUpload({ onSuccess, onRequestClose, compact = false }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [bankName, setBankName] = useState("");
  const [limit, setLimit] = useState<LimitInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Шинэ файлуудыг queue-руу нэмж дараалан байршуулна
  const enqueueAndProcess = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const newItems: QueueItem[] = files.map(f => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        status: "pending",
      }));
      setQueue(prev => [...prev, ...newItems]);
      setLimit(null);

      // Concurrency=2 — Node event-loop болон Prisma client тогтворжуулна.
      // Туршилтаар concurrency=3 нь хоёр дахь wave-д db latency 3.5x өсгөж
      // байсан (event-loop saturation). =2 нь хурд тэгшилнэ.
      const CONCURRENCY = 2;
      setProcessing(true);
      let successCount = 0;
      let limitReached = false;

      try {
        let cursor = 0;
        const worker = async () => {
          while (cursor < newItems.length && !limitReached) {
            const item = newItems[cursor++];

            setQueue(prev =>
              prev.map(q => (q.id === item.id ? { ...q, status: "uploading" } : q))
            );

            const formData = new FormData();
            formData.append("file", item.file);
            if (bankName) formData.append("bankName", bankName);

            const clientStart = performance.now();
            try {
              const res = await fetch("/api/upload", { method: "POST", body: formData });
              const clientMs = Math.round(performance.now() - clientStart);
              const text = await res.text();
              let data: {
                error?: string;
                count?: number;
                detectedBank?: string | null;
                code?: string;
                upgradeUrl?: string;
                statement?: { id?: string };
                timing?: ServerTiming;
              } = {};
              try {
                data = text ? JSON.parse(text) : {};
              } catch {
                throw new Error("Сервер JSON биш хариу буцаалаа");
              }

              if (res.status === 402 && data.code === "LIMIT_EXCEEDED") {
                limitReached = true;
                setLimit({
                  message: data.error ?? "Багцын хязгаар хэтэрсэн",
                  upgradeUrl: data.upgradeUrl ?? "/account#billing",
                });
                setQueue(prev =>
                  prev.map(q =>
                    q.id === item.id
                      ? { ...q, status: "limit", message: data.error ?? "Багцын хязгаар хэтэрсэн" }
                      : q
                  )
                );
                return;
              }

              if (!res.ok) {
                throw new Error(data.error ?? `HTTP ${res.status}`);
              }

              setQueue(prev =>
                prev.map(q =>
                  q.id === item.id
                    ? {
                        ...q,
                        status: "done",
                        count: data.count ?? 0,
                        detectedBank: data.detectedBank ?? null,
                        // gapWarning эхэндээ null. Бүх upload дууссаны дараа
                        // /api/statements/gaps-аас merge хийгдэнэ.
                        gapWarning: null,
                        clientMs,
                        serverTiming: data.timing,
                        statementId: data.statement?.id,
                      }
                    : q
                )
              );
              successCount++;
            } catch (err) {
              setQueue(prev =>
                prev.map(q =>
                  q.id === item.id
                    ? {
                        ...q,
                        status: "error",
                        message: err instanceof Error ? err.message : "Алдаа",
                      }
                    : q
                )
              );
            }
          }
        };

        await Promise.all(
          Array.from(
            { length: Math.min(CONCURRENCY, newItems.length) },
            () => worker()
          )
        );
      } finally {
        setProcessing(false);
        // Бүх upload commit болсны дараа gap-detection-ийг нэг л удаа гүйцэтгэнэ.
        // Үүнийг сервер дээр sequential way-аар (periodEnd-аар sort) шалгадаг
        // тул parallel upload-ийн race condition үүсэхгүй.
        if (successCount > 0) {
          try {
            const gapsRes = await fetch("/api/statements/gaps");
            if (gapsRes.ok) {
              const { gaps } = await gapsRes.json() as {
                gaps: Array<{ statementId: string; message: string }>;
              };
              const gapMap = new Map(gaps.map(g => [g.statementId, g.message]));
              setQueue(prev =>
                prev.map(q =>
                  q.statementId && gapMap.has(q.statementId)
                    ? { ...q, gapWarning: gapMap.get(q.statementId) ?? null }
                    : q
                )
              );
            }
          } catch {
            // Gap-check амжилтгүй болсон ч upload бүхэлдээ амжилттай —
            // дараа Statements хэсэгт дахин шалгаж болно. Чимээгүй унтраана.
          }
          // Dashboard-ыг refetch хийнэ
          onSuccess();
        }
      }
    },
    [bankName, onSuccess]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      enqueueAndProcess(files);
    },
    [enqueueAndProcess]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    enqueueAndProcess(files);
    if (inputRef.current) inputRef.current.value = ""; // нэг файлыг 2-р удаа сонгох боломжтой болгох
  };

  const clearDone = () => {
    setQueue(prev => prev.filter(q => q.status === "uploading" || q.status === "pending"));
  };

  const hasFinished = queue.some(q => q.status === "done" || q.status === "error" || q.status === "limit");

  // Бүгд дууссан (uploading/pending байхгүй) бөгөөд ядаж нэг done байгаа үед
  // амжилтын banner харуулна. Test mode-д modal хаагдахгүй учир үүнийг
  // хэрэглэгч цонхондоо үлдээж харна.
  const allFinished = !processing && queue.length > 0 &&
    queue.every(q => q.status === "done" || q.status === "error" || q.status === "limit");
  const doneCount = queue.filter(q => q.status === "done").length;
  const errorCount = queue.filter(q => q.status === "error").length;
  const showSuccessBanner = allFinished && doneCount > 0;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <input
          type="text"
          placeholder="Банкны нэр (заавал биш — auto-detect ажиллана)"
          value={bankName}
          onChange={e => setBankName(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        />
      )}

      <label
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          compact ? "p-4" : "p-10"
        } ${
          isDragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={handleChange}
        />
        {processing ? (
          <Loader2 className={`${compact ? "w-6 h-6" : "w-10 h-10"} text-blue-500 animate-spin`} />
        ) : (
          <>
            <Upload
              className={`${compact ? "w-6 h-6 mb-1" : "w-10 h-10 mb-3"} text-gray-400 transition-transform duration-200 ${
                isDragging ? "-translate-y-0.5" : ""
              }`}
            />
            <p className={`font-medium text-gray-700 ${compact ? "text-xs" : ""}`}>
              {compact
                ? "Файл оруулах"
                : "Нэг эсвэл хэд хэдэн файл чирж оруулах эсвэл дарж сонгох"}
            </p>
            {!compact && (
              <p className="text-sm text-gray-400 mt-1">
                PDF, Excel (.xlsx), CSV — олон файлыг нэг дор сонгож болно
              </p>
            )}
          </>
        )}
      </label>

      {/* Амжилтын banner — бүх файл боловсруулагдсаны дараа.
          Хэрэглэгчийн зөвшөөрөл хүсээд, "Дашбоард руу очих" товчоор л хаагдана. */}
      {showSuccessBanner && (
        <div className={`flex items-start gap-2 text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2.5 rounded-lg animate-fade-in ${compact ? "text-xs" : "text-sm"}`}>
          <CheckCircle2 className={`flex-shrink-0 text-emerald-600 ${compact ? "w-3.5 h-3.5 mt-0.5" : "w-4 h-4 mt-0.5"}`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">
              Амжилттай дууслаа · {doneCount}/{queue.length} файл
              {errorCount > 0 && <span className="text-rose-700"> ({errorCount} алдаатай)</span>}
            </p>
            <p className="text-emerald-700/80 mt-0.5">
              Гүйлгээ амжилттай хадгалагдлаа. Доорх жагсаалтаас дэлгэрэнгүйг харна уу.
            </p>
            {onRequestClose && (
              <button
                type="button"
                onClick={onRequestClose}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Дашбоард руу очих →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Файлын жагсаалт */}
      {queue.length > 0 && (
        <div className="space-y-1.5 animate-fade-in">
          {!compact && (
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                {queue.filter(q => q.status === "done").length} / {queue.length} амжилттай
              </span>
              {hasFinished && !processing && (
                <button
                  type="button"
                  onClick={clearDone}
                  className="text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Цэвэрлэх
                </button>
              )}
            </div>
          )}
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {queue.map(item => (
              <li
                key={item.id}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  item.status === "done"
                    ? item.gapWarning
                      ? "border-amber-300 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50"
                    : item.status === "error"
                      ? "border-rose-200 bg-rose-50"
                      : item.status === "limit"
                        ? "border-amber-200 bg-amber-50"
                        : item.status === "uploading"
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <StatusIcon status={item.status} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{item.file.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {fmtBytes(item.file.size)}
                      {item.status === "done" && item.count !== undefined && (
                        <>
                          {" · "}
                          <span className="text-emerald-700 font-medium">{item.count} гүйлгээ</span>
                          {item.detectedBank && <> · <span className="text-slate-600">{item.detectedBank}</span></>}
                        </>
                      )}
                      {item.status === "uploading" && " · Боловсруулж байна..."}
                      {item.status === "pending" && " · Хүлээгдэж байна"}
                      {(item.status === "error" || item.status === "limit") && item.message && (
                        <> · <span className={item.status === "error" ? "text-rose-700" : "text-amber-700"}>{item.message}</span></>
                      )}
                    </p>
                  </div>
                </div>
                {item.gapWarning && (
                  <div className="mt-1.5 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-100/60 px-2 py-1.5 text-[11px] leading-snug text-amber-900 animate-fade-in">
                    <Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-600" />
                    <span className="break-words">{item.gapWarning}</span>
                  </div>
                )}
                {item.status === "done" && item.serverTiming && (
                  <div className="mt-1 text-[10px] text-slate-500 font-mono">
                    ⏱ {item.clientMs ?? "?"}ms (server {item.serverTiming.total}ms ·
                    parse {item.serverTiming.parse} ·
                    cat {item.serverTiming.categorize} ·
                    db {item.serverTiming.db})
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {limit && (
        <div className={`flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-lg ${compact ? "text-xs" : "text-sm"}`}>
          <Sparkles className={`flex-shrink-0 text-amber-600 ${compact ? "w-3.5 h-3.5 mt-0.5" : "w-4 h-4 mt-0.5"}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium break-words">{limit.message}</p>
            <Link
              href={limit.upgradeUrl}
              className="mt-1 inline-flex items-center gap-1 font-semibold text-amber-900 underline-offset-2 hover:underline"
            >
              Багц шинэчлэх →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: ItemStatus }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />;
    case "uploading":
      return <Loader2 className="h-3.5 w-3.5 flex-shrink-0 text-blue-500 animate-spin" />;
    case "error":
      return <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-rose-600" />;
    case "limit":
      return <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-amber-600" />;
    case "pending":
    default:
      return <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />;
  }
}

