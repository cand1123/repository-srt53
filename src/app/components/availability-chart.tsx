import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type JenjangKey = "SRD" | "SRMP" | "SRMA";

interface AvailabilityChartProps {
  apiMap: Record<JenjangKey, string>;
}

interface AvailabilityCount {
  tersedia: number;
  tidakTersedia: number;
}

type AvailabilityState = Record<JenjangKey, AvailabilityCount>;

export function AvailabilityChart({ apiMap }: AvailabilityChartProps) {
  const [data, setData] = useState<AvailabilityState>({
    SRD: { tersedia: 0, tidakTersedia: 0 },
    SRMP: { tersedia: 0, tidakTersedia: 0 },
    SRMA: { tersedia: 0, tidakTersedia: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const entries = Object.entries(apiMap) as [JenjangKey, string][];
        const results = await Promise.all(
          entries.map(async ([jenjang, endpoint]) => {
            try {
              const res = await fetch(endpoint);
              if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
              }
              const json = await res.json();

              // Hitung langsung TERSEDIA / TIDAK TERSEDIA tanpa membuat array besar
              let tersedia = 0;
              let tidakTersedia = 0;

              // Format: 2D array atau array of objects
              if (Array.isArray(json) && json.length > 0) {
                if (Array.isArray(json[0])) {
                  // 2D array: baris pertama = header
                  const headers = (json[0] as any[]).map((h: any) => String(h || "").trim());
                  const ketersediaanIndex = headers.indexOf("KETERSEDIAAN");
                  if (ketersediaanIndex !== -1) {
                    for (let i = 1; i < json.length; i++) {
                      const row = json[i] as any[];
                      const raw = row[ketersediaanIndex];
                      const value = String(raw ?? "").toUpperCase().trim();
                      if (value === "TERSEDIA") tersedia++;
                      else if (value === "TIDAK TERSEDIA") tidakTersedia++;
                    }
                  }
                } else {
                  // Array of objects
                  for (const row of json as any[]) {
                    const raw = (row as any)["KETERSEDIAAN"];
                    const value = String(raw ?? "").toUpperCase().trim();
                    if (value === "TERSEDIA") tersedia++;
                    else if (value === "TIDAK TERSEDIA") tidakTersedia++;
                  }
                }
              }
              // Format: { values: [...] }
              else if (json.values && Array.isArray(json.values)) {
                const [headerRow, ...rest] = json.values as any[][];
                if (headerRow) {
                  const headers = headerRow.map((h: any) => String(h || "").trim());
                  const ketersediaanIndex = headers.indexOf("KETERSEDIAAN");
                  if (ketersediaanIndex !== -1) {
                    for (const row of rest) {
                      const raw = row[ketersediaanIndex];
                      const value = String(raw ?? "").toUpperCase().trim();
                      if (value === "TERSEDIA") tersedia++;
                      else if (value === "TIDAK TERSEDIA") tidakTersedia++;
                    }
                  }
                }
              }
              // Format: { data: [...] } atau { records: [...] } (array of objects)
              else if (Array.isArray(json.data) && json.data.length > 0) {
                for (const row of json.data as any[]) {
                  const raw = (row as any)["KETERSEDIAAN"];
                  const value = String(raw ?? "").toUpperCase().trim();
                  if (value === "TERSEDIA") tersedia++;
                  else if (value === "TIDAK TERSEDIA") tidakTersedia++;
                }
              } else if (Array.isArray(json.records) && json.records.length > 0) {
                for (const row of json.records as any[]) {
                  const raw = (row as any)["KETERSEDIAAN"];
                  const value = String(raw ?? "").toUpperCase().trim();
                  if (value === "TERSEDIA") tersedia++;
                  else if (value === "TIDAK TERSEDIA") tidakTersedia++;
                }
              }

              return [jenjang, { tersedia, tidakTersedia }] as [JenjangKey, AvailabilityCount];
            } catch (err) {
              console.error(`${jenjang} availability fetch error:`, err);
              return [jenjang, { tersedia: 0, tidakTersedia: 0 }] as [JenjangKey, AvailabilityCount];
            }
          })
        );

        const next: AvailabilityState = {
          SRD: { tersedia: 0, tidakTersedia: 0 },
          SRMP: { tersedia: 0, tidakTersedia: 0 },
          SRMA: { tersedia: 0, tidakTersedia: 0 },
        };

        results.forEach(([jenjang, counts]) => {
          next[jenjang] = counts;
        });

        setData(next);
      } catch (err) {
        console.error("Availability chart error:", err);
        setError("Gagal memuat data ketersediaan.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [apiMap]);

  const allCounts = Object.values(data).flatMap((d) => [d.tersedia, d.tidakTersedia]);
  const maxCount = Math.max(1, ...allCounts); // minimal 1 agar tidak division by zero
  const MAX_BAR_HEIGHT = 180; // tinggi maksimum batang (px)

  const jenjangLabels: Record<JenjangKey, string> = {
    SRD: "SRD",
    SRMP: "SRMP",
    SRMA: "SRMA",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Grafik Ketersediaan Buku</h2>
        <p className="text-sm text-slate-600">
          Ringkasan jumlah buku dengan status <span className="font-semibold">TERSEDIA</span> dan{" "}
          <span className="font-semibold">TIDAK TERSEDIA</span> pada setiap jenjang.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.keys(data) as JenjangKey[]).map((key) => {
          const item = data[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {jenjangLabels[key]}
                </span>
                <span className="text-[11px] text-slate-400">
                  Total: {item.tersedia + item.tidakTersedia}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-slate-900">{item.tersedia}</span>
                <span className="text-xs text-emerald-600 font-medium">TERSEDIA</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold text-slate-900">{item.tidakTersedia}</span>
                <span className="text-xs text-rose-600 font-medium">TIDAK TERSEDIA</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grafik batang sederhana */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Grafik Batang Ketersediaan per Jenjang
            </h3>
            <p className="text-[11px] text-slate-600 mt-1">
              Menampilkan jumlah buku <span className="font-semibold">TERSEDIA</span> dan{" "}
              <span className="font-semibold">TIDAK TERSEDIA</span> dalam bentuk batang vertikal.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" />
              <span>Tersedia</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-400" />
              <span>Tidak tersedia</span>
            </div>
          </div>
        </div>

        <div className="relative h-64 px-4">
          {/* Sumbu Y garis bantu */}
          <div className="absolute inset-y-2 left-4 right-4 flex flex-col justify-between pointer-events-none">
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <div
                key={ratio}
                className="w-full border-t border-dashed border-slate-200/80"
              />
            ))}
          </div>

          <div className="relative h-full flex items-end justify-between gap-6">
            {(Object.keys(data) as JenjangKey[]).map((key) => {
              const item = data[key];
              const tersediaHeight = (item.tersedia / maxCount) * MAX_BAR_HEIGHT;
              const tidakHeight = (item.tidakTersedia / maxCount) * MAX_BAR_HEIGHT;

              return (
                <div
                  key={key}
                  className="flex flex-col items-center gap-2 text-slate-900"
                >
                  {/* Batang kelompok */}
                  <div className="flex items-end gap-3 sm:gap-4 h-44">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 sm:w-14 bg-emerald-400 shadow-md shadow-emerald-500/40 transition-all duration-500"
                        style={{ height: `${tersediaHeight}px` }}
                      />
                      <span className="text-[10px] text-emerald-700">
                        {item.tersedia}
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-12 sm:w-14 bg-rose-400 shadow-md shadow-rose-500/40 transition-all duration-500"
                        style={{ height: `${tidakHeight}px` }}
                      />
                      <span className="text-[10px] text-rose-700">
                        {item.tidakTersedia}
                      </span>
                    </div>
                  </div>

                  {/* Label jenjang */}
                  <span className="mt-1 text-[11px] font-semibold tracking-wide text-slate-800">
                    {jenjangLabels[key]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

