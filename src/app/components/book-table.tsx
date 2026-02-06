import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { RefreshCw, Loader2, Columns3, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { toast } from "sonner";

// Dynamic record type - can have any columns
type DynamicRecord = Record<string, any>;

// Struktur data buku lokal (mock / fallback)
interface BookRecord {
  id: string;
  tanggal: string;
  judulBuku: string;
  pengarang: string;
  penerbit: string;
  tahunTerbit: string;
  jumlahEksemplar: number;
  kategori: string;
  keterangan: string;
}

interface BookTableProps {
  apiEndpoint: string;
  jenjang: string;
}

export function BookTable({ apiEndpoint, jenjang }: BookTableProps) {
  const [books, setBooks] = useState<DynamicRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<DynamicRecord | null>(null);
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    book: DynamicRecord;
    newStatus: string;
  } | null>(null);
  
  // Dynamic columns from API
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  const toggleAllColumns = (visible: boolean) => {
    setVisibleColumns(allColumns.reduce((acc, col) => ({
      ...acc,
      [col]: visible
    }), {}));
  };

  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalColumns = allColumns.length;

  // Batas maksimal baris yang diambil dari API (semakin kecil, semakin cepat)
  const ROW_LIMIT = 200;

  // Fetch data dari API
  const fetchBooks = async () => {
    setLoading(true);
    try {
      const url = `${apiEndpoint}?limit=${ROW_LIMIT}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log(`${jenjang} API Response:`, data);
      console.log(`${jenjang} API Response Type:`, typeof data, Array.isArray(data));
      
      let parsedBooks: DynamicRecord[] = [];
      let headers: string[] = [];
      
      // Handle berbagai format response dari Google Sheets API
      if (Array.isArray(data) && data.length > 0) {
        // Cek apakah item pertama adalah array (format 2D dari Google Sheets)
        if (Array.isArray(data[0])) {
          // Format array 2D dari Google Sheets Apps Script
          console.log(`${jenjang}: Data is 2D array (Google Sheets format), length:`, data.length);
          
          // Ambil header dari baris pertama
          headers = data[0].map((h: any) => String(h || '').trim());
          console.log(`${jenjang}: Headers (${headers.length} columns):`, headers);
          
          // Set all columns
          setAllColumns(headers);
          
          // Initialize visible columns - only show specific columns by default
          const defaultVisibleColumns = [
            'NO',
            'JUDUL_UTAMA',
            'PERNYATAAN_TANGGUNGJAWAB',
            'TAJUK_PENGARANG',
            'PENERBIT',
            'TAHUN_TERBIT',
            'ISBN',
            'KETERSEDIAAN'
          ];
          
          const initialVisibility = headers.reduce((acc, col) => ({
            ...acc,
            [col]: defaultVisibleColumns.includes(col)
          }), {});
          setVisibleColumns(initialVisibility);
          
          // Parse data dari baris ke-2 dan seterusnya (skip header)
          parsedBooks = data.slice(1).map((row: any[], rowIndex: number) => {
            const record: DynamicRecord = {};
            
            // Map each column to its header
            headers.forEach((header, colIndex) => {
              const value = row[colIndex];
              // Convert value to string, handle null/undefined
              record[header] = value !== null && value !== undefined ? String(value) : '';
            });
            
            // Add unique ID if not present
            if (!record['NO'] && !record['ID']) {
              record['_ID'] = `${Date.now()}-${rowIndex}`;
            }
            
            return record;
          });
          
        } else {
          // Format array of objects
          console.log(`${jenjang}: Data is array of objects, length:`, data.length);
          
          // Extract headers from first object
          if (data.length > 0) {
            headers = Object.keys(data[0]);
            setAllColumns(headers);
            
            const initialVisibility = headers.reduce((acc, col) => ({
              ...acc,
              [col]: true
            }), {});
            setVisibleColumns(initialVisibility);
          }
          
          parsedBooks = data;
        }
      } else if (data.data && Array.isArray(data.data)) {
        // Jika data ada di property 'data'
        console.log(`${jenjang}: Data in 'data' property, length:`, data.data.length);
        
        if (data.data.length > 0) {
          headers = Object.keys(data.data[0]);
          setAllColumns(headers);
          
          const initialVisibility = headers.reduce((acc, col) => ({
            ...acc,
            [col]: true
          }), {});
          setVisibleColumns(initialVisibility);
        }
        
        parsedBooks = data.data;
      } else if (data.records && Array.isArray(data.records)) {
        // Jika data ada di property 'records'
        console.log(`${jenjang}: Data in 'records' property, length:`, data.records.length);
        
        if (data.records.length > 0) {
          headers = Object.keys(data.records[0]);
          setAllColumns(headers);
          
          const initialVisibility = headers.reduce((acc, col) => ({
            ...acc,
            [col]: true
          }), {});
          setVisibleColumns(initialVisibility);
        }
        
        parsedBooks = data.records;
      } else if (data.values && Array.isArray(data.values)) {
        // Format Google Sheets API yang mengembalikan values sebagai array 2D
        console.log(`${jenjang}: Data in 'values' property (Google Sheets format), length:`, data.values.length);
        
        const [headerRow, ...rows] = data.values;
        headers = headerRow.map((h: any) => String(h || '').trim());
        setAllColumns(headers);
        
        const initialVisibility = headers.reduce((acc, col) => ({
          ...acc,
          [col]: true
        }), {});
        setVisibleColumns(initialVisibility);
        
        parsedBooks = rows.map((row: any[], rowIndex: number) => {
          const record: DynamicRecord = {};
          headers.forEach((header, colIndex) => {
            record[header] = row[colIndex] !== null && row[colIndex] !== undefined ? String(row[colIndex]) : '';
          });
          if (!record['NO'] && !record['ID']) {
            record['_ID'] = `${Date.now()}-${rowIndex}`;
          }
          return record;
        });
      } else {
        console.warn(`${jenjang}: Format data tidak dikenali:`, data);
        console.warn(`${jenjang}: Available keys:`, Object.keys(data));
        parsedBooks = [];
      }
      
      console.log(`${jenjang}: Total records parsed:`, parsedBooks.length);
      console.log(`${jenjang}: Sample record:`, parsedBooks[0]);
      
      setBooks(parsedBooks);
      
      if (parsedBooks.length > 0) {
        toast.success(`${jenjang}: Data berhasil dimuat (${parsedBooks.length} record, ${headers.length} kolom)`);
      } else {
        toast.warning(`${jenjang}: Tidak ada data yang valid`);
      }
    } catch (error) {
      console.error(`${jenjang} Error fetching books:`, error);
      setBooks([]);
      toast.error(`${jenjang}: Gagal memuat data dari API - ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Mock data untuk demonstrasi
  const generateMockData = (): BookRecord[] => {
    return [
      {
        id: "1",
        tanggal: "2026-02-01",
        judulBuku: "Matematika Dasar Kelas 1",
        pengarang: "Dr. Ahmad Susanto",
        penerbit: "Erlangga",
        tahunTerbit: "2025",
        jumlahEksemplar: 50,
        kategori: "Pelajaran",
        keterangan: "Buku paket semester genap"
      },
      {
        id: "2",
        tanggal: "2026-02-01",
        judulBuku: "Bahasa Indonesia untuk Pemula",
        pengarang: "Siti Nurhaliza",
        penerbit: "Gramedia",
        tahunTerbit: "2025",
        jumlahEksemplar: 45,
        kategori: "Pelajaran",
        keterangan: "Edisi revisi 2025"
      },
      {
        id: "3",
        tanggal: "2026-02-02",
        judulBuku: "Ensiklopedia Anak",
        pengarang: "Tim Penulis",
        penerbit: "Mizan",
        tahunTerbit: "2024",
        jumlahEksemplar: 20,
        kategori: "Referensi",
        keterangan: "Untuk perpustakaan"
      }
    ];
  };

  useEffect(() => {
    fetchBooks();
  }, [apiEndpoint]);

  // Keyboard shortcut for search (Ctrl + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + F or Cmd + F (for Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); // Prevent browser's default find
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter books based on search query (JUDUL_UTAMA and ISBN)
  const filteredBooks = books.filter(book => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const judulUtama = (book['JUDUL_UTAMA'] || '').toString().toLowerCase();
    const isbn = (book['ISBN'] || '').toString().toLowerCase();
    
    return judulUtama.includes(query) || isbn.includes(query);
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBooks = filteredBooks.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = editingBook 
        ? { ...formData, id: editingBook.id }
        : { ...formData, id: Date.now().toString() };

      // Kirim ke API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        toast.success(editingBook ? "Buku berhasil diperbarui" : "Buku berhasil ditambahkan");
        fetchBooks();
        handleCloseDialog();
      } else {
        throw new Error("Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Error saving book:", error);
      // Simulasi penambahan data lokal jika API gagal
      if (editingBook) {
        setBooks(books.map(book => 
          book.id === editingBook.id ? { ...formData as BookRecord, id: editingBook.id } : book
        ));
        toast.success("Buku berhasil diperbarui (mode lokal)");
      } else {
        const newBook: BookRecord = {
          ...formData as BookRecord,
          id: Date.now().toString()
        };
        setBooks([...books, newBook]);
        toast.success("Buku berhasil ditambahkan (mode lokal)");
      }
      handleCloseDialog();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (book: BookRecord) => {
    setEditingBook(book);
    setFormData({
      tanggal: book.tanggal,
      judulBuku: book.judulBuku,
      pengarang: book.pengarang,
      penerbit: book.penerbit,
      tahunTerbit: book.tahunTerbit,
      jumlahEksemplar: book.jumlahEksemplar,
      kategori: book.kategori,
      keterangan: book.keterangan
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    
    try {
      const response = await fetch(`${apiEndpoint}?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success("Buku berhasil dihapus");
        fetchBooks();
      } else {
        throw new Error("Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting book:", error);
      // Hapus lokal jika API gagal
      setBooks(books.filter(book => book.id !== id));
      toast.success("Buku berhasil dihapus (mode lokal)");
    }
  };

  // Handle status ketersediaan change
  const handleStatusChange = (book: DynamicRecord, newStatus: string) => {
    if (!newStatus) return; // Jangan proses jika status kosong
    
    // Set pending change and open confirmation dialog
    setPendingStatusChange({ book, newStatus });
    setIsConfirmDialogOpen(true);
  };

  // Confirm status change
  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;
    
    const { book, newStatus } = pendingStatusChange;
    const bookIndex = books.findIndex(
      (b) =>
        (b.NO && b.NO === book.NO) ||
        (b._ID && b._ID === book._ID) ||
        (b.ID && b.ID === book.ID) ||
        b === book
    );
    
    if (bookIndex === -1) {
      toast.error('Buku tidak ditemukan dalam data.');
      setIsConfirmDialogOpen(false);
      setPendingStatusChange(null);
      return;
    }
    
    const oldStatus = book['KETERSEDIAAN'];
    
    // Update lokal langsung untuk responsiveness
    const updatedBooks = [...books];
    updatedBooks[bookIndex] = { ...updatedBooks[bookIndex], KETERSEDIAAN: newStatus };
    setBooks(updatedBooks);

    // Close dialog
    setIsConfirmDialogOpen(false);
    setPendingStatusChange(null);

    const toastId = toast.loading('Menyimpan...');

    try {
      const ketersediaanColIndex = allColumns.indexOf('KETERSEDIAAN');
      if (ketersediaanColIndex === -1) {
        throw new Error('Kolom KETERSEDIAAN tidak ditemukan');
      }

      // Apps Script: sheetRow = rowIndex + 1, sheetCol = colIndex + 1
      // rowIndex 1 = baris data pertama (sheet row 2). Jadi rowIndex = bookIndex + 1
      const rowIndex = bookIndex + 1;

      const payload = {
        action: 'updateCell',
        rowIndex,
        colIndex: ketersediaanColIndex,
        value: newStatus,
      };

      // Coba fetch POST dulu; jika gagal (CORS/dll) fallback ke JSONP GET
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.success === true || data?.result === 'ok')) {
          toast.success('Tersimpan', { id: toastId, duration: 2000 });
          return;
        }
        if (res.ok && data.success !== false && !data.error) {
          toast.success('Tersimpan', { id: toastId, duration: 2000 });
          return;
        }
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      } catch {
        // Fallback: JSONP GET (untuk Apps Script yang hanya support GET)
        await new Promise<void>((resolve, reject) => {
          const callbackName = `jsonpCallback${Date.now()}`;
          const params = new URLSearchParams({
            action: 'updateCell',
            rowIndex: String(rowIndex),
            colIndex: String(ketersediaanColIndex),
            value: newStatus,
            callback: callbackName,
          });
          const url = `${apiEndpoint}?${params.toString()}`;
          const script = document.createElement('script');
          const timeout = setTimeout(() => {
            cleanup();
            reject(new Error('Request timeout'));
          }, 8000);

          (window as any)[callbackName] = (response: any) => {
            clearTimeout(timeout);
            cleanup();
            if (response?.success === true) {
              resolve();
            } else {
              reject(new Error(response?.message || 'Update gagal'));
            }
          };

          const cleanup = () => {
            delete (window as any)[callbackName];
            script.parentNode?.removeChild(script);
          };

          script.onerror = () => {
            clearTimeout(timeout);
            cleanup();
            reject(new Error('Request gagal'));
          };
          script.src = url;
          document.head.appendChild(script);
        });
        toast.success('Tersimpan', { id: toastId, duration: 2000 });
      }
    } catch (error) {
      console.error('Error updating to spreadsheet:', error);
      const rolledBackBooks = [...books];
      rolledBackBooks[bookIndex] = { ...rolledBackBooks[bookIndex], KETERSEDIAAN: oldStatus };
      setBooks(rolledBackBooks);
      toast.error(
        `Gagal menyimpan: ${error instanceof Error ? error.message : 'Unknown error'}. Dikembalikan ke "${oldStatus}".`,
        { id: toastId, duration: 4000 }
      );
    }
  };

  // Cancel status change
  const cancelStatusChange = () => {
    setIsConfirmDialogOpen(false);
    setPendingStatusChange(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBook(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      judulBuku: "",
      pengarang: "",
      penerbit: "",
      tahunTerbit: "",
      jumlahEksemplar: 1,
      kategori: "",
      keterangan: ""
    });
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Confirmation Dialog for Status Change */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md rounded-xl border-slate-200">
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Status</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengubah status ketersediaan menjadi "{pendingStatusChange?.newStatus}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelStatusChange}>
              Batal
            </Button>
            <Button onClick={confirmStatusChange}>
              Ya, Ubah Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        {/* Kiri: Refresh, Kolom, dan Search dalam satu baris/flex-wrap */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={fetchBooks}
            disabled={loading}
            className="gap-2 border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-slate-200 hover:bg-slate-50 whitespace-nowrap"
                disabled={allColumns.length === 0}
              >
                <Columns3 className="w-4 h-4" />
                Kolom ({visibleCount}/{totalColumns})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-[500px]" align="start">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Pilih Kolom yang Ditampilkan</h4>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllColumns(true)}
                      className="h-7 px-2 text-xs"
                    >
                      Semua
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllColumns(false)}
                      className="h-7 px-2 text-xs"
                    >
                      Bersihkan
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-2">
                  {allColumns.map((column) => (
                    <div key={column} className="flex items-center space-x-2">
                      <Checkbox
                        id={`column-${column}`}
                        checked={visibleColumns[column] || false}
                        onCheckedChange={() => toggleColumn(column)}
                      />
                      <label
                        htmlFor={`column-${column}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                      >
                        {column}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Cari judul atau ISBN (Ctrl+F)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 w-full border-slate-200 focus-visible:ring-slate-900/20 focus-visible:border-slate-400"
            />
            <button
              onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-opacity ${
                searchQuery ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              }`}
              aria-label="Clear search"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>

        {/* Kanan: info total */}
        <div className="text-sm text-slate-600 shrink-0 whitespace-nowrap">
          Total:{" "}
          <span className="font-semibold text-slate-900 inline-block min-w-[4ch] text-right tabular-nums">
            {filteredBooks.length}
          </span>
          {searchQuery && books.length !== filteredBooks.length && (
            <span className="text-slate-400">
              {" "}
              dari{" "}
              <span className="inline-block min-w-[4ch] text-right tabular-nums">
                {books.length}
              </span>
            </span>
          )}
          <span> buku</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto" style={{ scrollbarGutter: 'stable' }}>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {allColumns.filter(col => visibleColumns[col]).map((column) => (
                  <th 
                    key={column} 
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-r border-slate-200 last:border-r-0 whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleCount || 1} className="px-4 py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
                    <p className="text-slate-500 text-sm">Memuat data...</p>
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={visibleCount || 1} className="px-4 py-16 text-center">
                    <p className="text-slate-500 text-sm">Belum ada data. Klik &quot;Refresh&quot; untuk memuat data dari API.</p>
                  </td>
                </tr>
              ) : (
                paginatedBooks.map((book, rowIndex) => (
                  <tr 
                    key={book.NO || book.ID || book._ID || rowIndex} 
                    className={`border-b border-slate-100 transition-colors hover:bg-slate-50/80 ${
                      rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    {allColumns.filter(col => visibleColumns[col]).map((column) => (
                      <td 
                        key={column} 
                        className="px-4 py-3 text-sm text-slate-700 border-r border-slate-100 last:border-r-0 max-w-md overflow-hidden text-ellipsis"
                        title={column !== 'KETERSEDIAAN' ? book[column] : undefined}
                      >
                        {column === 'KETERSEDIAAN' ? (
                          <select
                            value={book[column] || ''}
                            onChange={(e) => handleStatusChange(book, e.target.value)}
                            className="w-full min-w-[160px] px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 bg-white hover:border-slate-300 transition-colors"
                          >
                            <option value="">Pilih Status</option>
                            <option value="TERSEDIA">Tersedia</option>
                            <option value="TIDAK TERSEDIA">Tidak Tersedia</option>
                          </select>
                        ) : (
                          book[column] || '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && filteredBooks.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            Menampilkan <span className="font-medium text-slate-900">{startIndex + 1}</span> – <span className="font-medium text-slate-900">{Math.min(endIndex, filteredBooks.length)}</span> dari <span className="font-medium text-slate-900">{filteredBooks.length}</span> buku
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="gap-1 border-slate-200 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </Button>
            
            <div className="flex items-center gap-1">
              {/* Show page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                // Show first page, last page, current page, and pages around current
                const showPage = 
                  pageNum === 1 || 
                  pageNum === totalPages || 
                  Math.abs(pageNum - currentPage) <= 1;
                
                // Show ellipsis
                const showEllipsisBefore = pageNum === currentPage - 2 && currentPage > 3;
                const showEllipsisAfter = pageNum === currentPage + 2 && currentPage < totalPages - 2;
                
                if (showEllipsisBefore || showEllipsisAfter) {
                  return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                }
                
                if (!showPage) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[36px] ${currentPage === pageNum ? 'bg-slate-900 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="gap-1 border-slate-200 hover:bg-slate-50"
            >
              Selanjutnya
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}