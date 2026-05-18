import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import StatementsManager from "@/components/StatementsManager";

export const metadata = {
  title: "Хуулга удирдах | Санхүүгийн дүн шинжилгээ",
};

export default function StatementsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Буцах"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Хуулга удирдах</h1>
            <p className="text-xs text-gray-500">Оруулсан банкны statement-уудаа харах, устгах</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <StatementsManager />
      </main>
    </div>
  );
}
