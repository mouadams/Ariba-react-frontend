import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Eye, Trash2, ShieldCheck, CalendarClock, FileSpreadsheet, Loader2 } from "lucide-react";
import { historyService } from "@/services/historyService";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export function HistoryView() {
  const [q, setQ] = useState("");
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Preview State
  const [previewData, setPreviewData] = useState<Record<string, any[]>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await historyService.getHistory();
      // Assume data is an array. If the backend returns a nested array, handle accordingly.
      setItemsData(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (id: string, filename?: string) => {
    const toastId = toast.loading("Downloading...");
    try {
      const blob = await historyService.downloadHistory(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename || `History_${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download complete", { id: toastId });
    } catch (error) {
      toast.error("Download failed", { id: toastId });
    }
  };

  const handlePreview = async (id: string, filename: string) => {
    setPreviewTitle(filename);
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewData({});
    try {
      const blob = await historyService.downloadHistory(id);
      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const parsed: Record<string, any[]> = {};
      workbook.SheetNames.forEach(sheet => {
        parsed[sheet] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 }).slice(0, 500);
      });
      setPreviewData(parsed);
    } catch (error) {
      toast.error("Failed to load preview");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const toastId = toast.loading("Deleting file...");
    try {
      await historyService.deleteHistory(deleteTarget.id);
      setItemsData(prev => prev.filter(it => String(it.id) !== String(deleteTarget.id)));
      toast.success("File deleted successfully.", { id: toastId });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to delete file.", { id: toastId });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const items = itemsData.filter((i) =>
    ((i.processing_type || "") + i.id).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[1600px] space-y-6 px-6 py-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Generated file history</h2>
          <p className="text-sm text-muted-foreground">Encrypted vault · audit-ready · zero-trust retrieval</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full border border-accent/30 bg-accent/10 text-accent gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Secure retrieval
          </Badge>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search history…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      <Card className="rounded-xl border-border bg-card p-2 shadow-sm">
        <Accordion type="single" collapsible className="w-full">
          {loading ? (
            <div className="py-16 flex justify-center text-sm text-muted-foreground"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No entries match your search.</div>
          ) : items.map((it, idx) => (
            <AccordionItem key={it.id} value={it.id} className="border-border/60 px-4">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex w-full items-center justify-between gap-4 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                        <FileSpreadsheet className="h-4 w-4 text-primary" />
                      </div>
                      {idx < items.length - 1 && (
                        <div className="absolute left-1/2 top-full h-6 w-px -translate-x-1/2 bg-border" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold">{it.processing_type || "Extraction"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CalendarClock className="h-3 w-3" /> {it.created_at ? it.created_at.replace('T', ' ').substring(0, 16) : "N/A"} · {it.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{(it.matched_rows || 0).toLocaleString()} rows</span>
                    <span className="text-muted-foreground">{it.output_format || "Excel"}</span>
                    <Badge
                      variant="secondary"
                      className="border-accent/30 bg-accent/10 text-accent rounded-full"
                    >
                      Completed
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 rounded-xl border border-border/60 bg-background/40 p-4 md:grid-cols-[1fr_auto]">
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <Meta k="Process" v={it.processing_type || "Extraction"} />
                    <Meta k="Matched rows" v={(it.matched_rows || 0).toLocaleString()} />
                    <Meta k="Generated" v={it.created_at ? it.created_at.replace('T', ' ').substring(0, 16) : "N/A"} />
                    <Meta k="Format" v={it.output_format || "Excel"} />
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <Button size="sm" variant="outline" onClick={() => handlePreview(it.id, it.generated_file_name || `History_${it.id}.xlsx`)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button size="sm" onClick={() => handleDownload(it.id, it.generated_file_name)} className="w-full md:w-auto">
                      <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: String(it.id), name: it.generated_file_name || `File #${it.id}` }); }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">Preview: {previewTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden min-h-[400px]">
            {previewLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading spreadsheet data...</p>
              </div>
            ) : Object.keys(previewData).length > 0 ? (
              <Tabs defaultValue={Object.keys(previewData)[0]}>
                <TabsList className="mb-4 bg-transparent p-0 w-full justify-start overflow-x-auto rounded-none border-b border-border/60">
                  {Object.keys(previewData).map(sheetName => (
                    <TabsTrigger key={sheetName} value={sheetName} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-2">
                      {sheetName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {Object.keys(previewData).map(sheetName => {
                  const rows = previewData[sheetName];
                  if (!rows || rows.length === 0) return null;
                  const headers = rows[0] || [];
                  const dataRows = rows.slice(1);
                  
                  return (
                    <TabsContent key={sheetName} value={sheetName} className="mt-0">
                      <div className="rounded-lg border border-border/60 overflow-hidden">
                        <div className="overflow-x-auto max-h-[600px]">
                          <Table>
                            <TableHeader className="bg-muted/40 sticky top-0 z-10">
                              <TableRow>
                                {headers.map((col: any, i: number) => (
                                  <TableHead key={i} className="whitespace-nowrap text-xs text-muted-foreground bg-muted/40">{col}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dataRows.map((row: any, rIdx: number) => (
                                <TableRow key={rIdx} className="hover:bg-muted/30">
                                  {headers.map((_: any, cIdx: number) => (
                                    <TableCell key={cIdx} className="whitespace-nowrap text-xs py-2">
                                      {row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : ""}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>
                  )
                })}
              </Tabs>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No data could be extracted from this file.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete File
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              <br />
              This will remove the record and the physical file from the server. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Yes, delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-0.5 text-sm font-medium">{v}</div>
    </div>
  );
}