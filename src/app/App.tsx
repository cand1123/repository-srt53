import React, { useState } from "react";
import { Toaster } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { BookTable } from "./components/book-table";
import { AvailabilityChart } from "./components/availability-chart";
import { BookOpen, Sparkles } from "lucide-react";

// API Endpoints untuk setiap jenjang
const API_ENDPOINTS = {
  SRD: "https://script.google.com/macros/s/AKfycby65P-Nr-BdMTOaO5QfUmKshuxCDPFyPnissCFYQ8dA7ZIph-7ue3T6vVDeMlddkYNp/exec",
  SRMP: "https://script.google.com/macros/s/AKfycbxvTBhshwg8gX1TjoSpHAenVx0v7kL-PXeVYhZKrM8Qu9ZKo18e2RDn2ODLlB-UsTxq/exec",
  SRMA: "https://script.google.com/a/macros/students.um.ac.id/s/AKfycbyIiCtai12bOMH0Zcmali8mPXKWaWmu0vd5a1nnfmji-4bcoZBXmYXnfVcvMYSCHF7N/exec"
};

export default function App() {
  const [activeTab, setActiveTab] = useState("SRD");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img
                src="/logo3-tag.png"
                alt="SRT 53 Repository"
                className="h-8 w-auto object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  SRT 53 Repository
                </h1>
                <span className="text-xs font-medium text-slate-600">
                  Ini Direktif Pimpinan Ya Ges
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              <span className="text-xs font-medium text-slate-600">Jangan lupa mengerjakan RHK!!!</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full mx-auto px-2 sm:px-4 lg:px-8 xl:px-12 2xl:px-16 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 flex justify-center">
              <TabsList className="bg-transparent h-auto p-0 gap-0 border-0">
                <TabsTrigger 
                  value="SRD" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-6 py-3.5 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  SRD
                </TabsTrigger>
                <TabsTrigger 
                  value="SRMP" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none px-6 py-3.5 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  SRMP
                </TabsTrigger>
                <TabsTrigger 
                  value="SRMA" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  SRMA
                </TabsTrigger>
                <TabsTrigger 
                  value="KETERSEDIAAN" 
                  className="ml-auto rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none px-6 py-3.5 font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  GRAFIK
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="SRD" className="p-0 m-0 focus-visible:outline-none focus-visible:ring-0">
              {activeTab === "SRD" && (
                <BookTable apiEndpoint={API_ENDPOINTS.SRD} jenjang="SRD" />
              )}
            </TabsContent>

            <TabsContent value="SRMP" className="p-0 m-0 focus-visible:outline-none focus-visible:ring-0">
              {activeTab === "SRMP" && (
                <BookTable apiEndpoint={API_ENDPOINTS.SRMP} jenjang="SRMP" />
              )}
            </TabsContent>

            <TabsContent value="SRMA" className="p-0 m-0 focus-visible:outline-none focus-visible:ring-0">
              {activeTab === "SRMA" && (
                <BookTable apiEndpoint={API_ENDPOINTS.SRMA} jenjang="SRMA" />
              )}
            </TabsContent>

            <TabsContent value="KETERSEDIAAN" className="p-0 m-0 focus-visible:outline-none focus-visible:ring-0">
              {activeTab === "KETERSEDIAAN" && (
                <AvailabilityChart apiMap={API_ENDPOINTS} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}