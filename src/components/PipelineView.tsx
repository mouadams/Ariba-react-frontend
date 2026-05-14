import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sparkles, Loader2, Download, Database, Trash2, Eye, CheckCircle2, FileText, Activity
} from "lucide-react";
import { useApp } from "@/context/app-context";
import { toast } from "sonner";
import { aiService } from "@/services/aiService";
import { processService } from "@/services/processService";
import { previewService } from "@/services/previewService";
import { api } from "@/services/api";
import * as XLSX from "xlsx";

export function PipelineView() {
  const { aiEnabled, setAiEnabled } = useApp();
  
  const [masterFiles, setMasterFiles] = useState<{ file: File; name: string; size: string }[]>([]);
  const [previews, setPreviews] = useState<Record<string, any>>({});
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  
  const [aiRunning, setAiRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Ariba Strict Configuration State
  const [config, setConfig] = useState({
    output_mode: "standard", 
    ariba_configs: {
      "En-tête de la demande d'achat": { skip: true, master_files: [] as string[], id_column: "", filter_column: "", filter_value: "" },
      "Détails de la demande d'achat": { skip: false, master_files: [] as string[], id_column: "", filter_column: "", filter_value: "" },
      "Fractionnement comptable": { skip: true, master_files: [] as string[], id_column: "", filter_column: "", filter_value: "" }
    } as Record<string, { skip: boolean; master_files: string[]; id_column: string; filter_column: string; filter_value: string; }>
  });

  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreviewData, setResultPreviewData] = useState<Record<string, any[]>>({});
  
  // Accordion state management to auto-open sections as user progresses
  const [accordionValue, setAccordionValue] = useState<string[]>(["upload"]);

  const handleMasterDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files);
    addFiles(list);
  };

  const addFiles = async (list: File[]) => {
    const next = list.map((f) => ({ file: f, name: f.name, size: `${(f.size / 1024).toFixed(1)} KB` }));
    setMasterFiles((p) => [...p, ...next]);
    
    toast.success(`${list.length} file(s) queued`);
    
    setLoadingPreviews(true);
    try {
      const data = await previewService.getPreview(list);
      const newPreviews = { ...previews };
      data.previews.forEach((p: any) => {
        newPreviews[p.filename] = p;
      });
      setPreviews(newPreviews);
      
      // Expand preview and config sections automatically
      setAccordionValue(prev => [...new Set([...prev, "preview", "mapping"])]);
      
      if (aiEnabled && data.previews.length > 0) {
        // Run AI on all new previews concurrently
        Promise.all(data.previews.map((p: any) => runAi(p)));
      }
    } catch (e) {
      toast.error("Failed to load file preview.");
    } finally {
      setLoadingPreviews(false);
    }
  };

  const runAi = async (previewData: any) => {
    setAiRunning(true);
    try {
      const dfJson = JSON.stringify(previewData.preview);
      const aiResult = await aiService.detectConfiguration(dfJson, previewData.filename, "v1");
      const configData = aiResult.configuration;
      
      if (configData && configData.sheets && configData.sheets.length > 0) {
        const topSheet = configData.sheets.sort((a: any, b: any) => b.confidence - a.confidence)[0].name;
        
        let sheetKey = "";
        if (topSheet === "HEADER") sheetKey = "En-tête de la demande d'achat";
        if (topSheet === "DETAILS") sheetKey = "Détails de la demande d'achat";
        if (topSheet === "ACCOUNTING") sheetKey = "Fractionnement comptable";
        
        if (sheetKey) {
          setConfig(prev => {
            const newConfig = { ...prev };
            newConfig.ariba_configs[sheetKey as keyof typeof newConfig.ariba_configs] = {
              ...newConfig.ariba_configs[sheetKey as keyof typeof newConfig.ariba_configs],
              skip: false,
              master_files: [...new Set([...newConfig.ariba_configs[sheetKey as keyof typeof newConfig.ariba_configs].master_files, previewData.filename])],
              id_column: configData.id_column || newConfig.ariba_configs[sheetKey as keyof typeof newConfig.ariba_configs].id_column
            };
            return newConfig;
          });
          toast.success(`AI assigned ${previewData.filename} to ${topSheet}`);
        }
      }
    } catch (e: any) {
      toast.warning(`AI analysis failed for ${previewData.filename}`);
    } finally {
      setAiRunning(false);
    }
  };

  const handleProcess = async () => {
    if (masterFiles.length < 1) {
      toast.error("Please upload at least one file");
      return;
    }
    setProcessing(true);
    setUploadProgress(0);
    toast.loading("Processing isolated sheets...", { id: "process" });
    try {
      const parsedResults: Record<string, any[]> = {};
      const sheetKeys = ["En-tête de la demande d'achat", "Détails de la demande d'achat", "Fractionnement comptable"] as const;
      
      let processedCount = 0;
      for (const sheetKey of sheetKeys) {
        const sheetConf = config.ariba_configs[sheetKey];
        if (sheetConf.skip || sheetConf.master_files.length === 0) continue;
        
        const filesForSheet = masterFiles.filter(f => sheetConf.master_files.includes(f.name)).map(f => f.file);
        if (filesForSheet.length === 0) continue;
        
        // Build clean config payload for the backend specifically for this isolated sheet
        const finalConfig: Record<string, any> = {
          output_mode: "standard",
          auto_distribute: false,
          master_key: sheetConf.id_column || "",
          save_history: false // Prevent partial history records
        };
        
        toast.loading(`Extracting ${sheetKey}...`, { id: "process" });
        
        const blob = await processService.processFiles(filesForSheet, finalConfig, (progress) => {
          setUploadProgress(progress);
        });
        
        const arrayBuffer = await blob.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        
        // The backend returns an Excel file with all sheets, but we only extract the target sheet
        // since we processed its files independently to prevent cross-contamination.
        if (workbook.Sheets[sheetKey]) {
          parsedResults[sheetKey] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetKey], { header: 1 }).slice(0, 500);
          processedCount++;
        }
      }
      
      if (processedCount === 0) {
        toast.error("No valid configurations found. Check mappings.", { id: "process" });
        return;
      }
      
      setResultPreviewData(parsedResults);
      
      // Combine into a single valid Excel file for the user to download
      const newWb = XLSX.utils.book_new();
      for (const sheetKey of sheetKeys) {
        if (parsedResults[sheetKey] && parsedResults[sheetKey].length > 0) {
           const ws = XLSX.utils.aoa_to_sheet(parsedResults[sheetKey]);
           XLSX.utils.book_append_sheet(newWb, ws, sheetKey);
        }
      }
      const wbout = XLSX.write(newWb, { bookType: 'xlsx', type: 'array' });
      const finalBlob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      setResultBlob(finalBlob);
      
      // Upload the final assembled Excel file to the history endpoint
      try {
        const historyFormData = new FormData();
        historyFormData.append("file", finalBlob, `Extracted_Ariba_${Date.now()}.xlsx`);
        historyFormData.append("original_file_names", masterFiles.map(f => f.name).join(", "));
        await api.post("/history/upload", historyFormData);
      } catch (err) {
        console.error("Failed to save final file to history:", err);
      }
      
      setAccordionValue(prev => [...new Set([...prev, "results"])]); // Auto-open results
      toast.success("Extraction complete! Preview your isolated sheets.", { id: "process" });
    } catch (e: any) {
      const msg = e?.message || "Failed to process data";
      toast.error(msg, { id: "process" });
      console.error("[Process Error]", e);
    } finally {
      setProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultBlob) return;
    const url = window.URL.createObjectURL(resultBlob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Extracted_Ariba_Process.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const previewFilenames = Object.keys(previews);
  const resultSheetNames = Object.keys(resultPreviewData);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-[1800px] space-y-8 px-8 py-10 min-h-screen"
    >
      <div className="mb-8">
         <h1 className="text-2xl font-semibold tracking-tight">Data Pipeline</h1>
         <p className="text-sm text-muted-foreground mt-1">Transform flat files into strict SAP Ariba formats.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Files Queued</p>
            <p className="text-2xl font-semibold">{masterFiles.length}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AI Detection</p>
            <p className="text-2xl font-semibold">{aiEnabled ? "Active" : "Disabled"}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Extracted Sheets</p>
            <p className="text-2xl font-semibold">{resultSheetNames.length}</p>
          </div>
        </Card>
      </div>

      <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="space-y-4">
        
        <AccordionItem value="upload" className="rounded-xl border border-border bg-card px-6 shadow-sm data-[state=open]:pb-6">
          <AccordionTrigger className="py-4 hover:no-underline font-semibold text-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Database className="h-4 w-4" /></div>
              1. Upload Catalogs
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleMasterDrop}
              className="mt-2 rounded-2xl border-2 border-dashed border-border bg-card/50 p-8 text-center transition hover:border-primary hover:bg-card/80"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/5 border border-border">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-base font-medium">Drag & Drop files here</h3>
              <p className="mt-1 text-xs text-muted-foreground">XLSX or CSV supported.</p>
              <label className="mt-4 inline-block">
                <input type="file" multiple accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} />
                <span className="inline-flex cursor-pointer items-center rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-muted/50">
                  Browse Files
                </span>
              </label>
              
              <AnimatePresence>
                {masterFiles.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-6 space-y-2 text-left">
                    {masterFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-2.5">
                        <span className="text-sm font-medium">{f.name} <span className="text-muted-foreground text-xs ml-2">({f.size})</span></span>
                        <Trash2 className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-destructive" onClick={() => {
                            setMasterFiles(m => m.filter(x => x.name !== f.name));
                            const p = {...previews};
                            delete p[f.name];
                            setPreviews(p);
                        }} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="preview" className="rounded-xl border border-border bg-card px-6 shadow-sm data-[state=open]:pb-6" disabled={previewFilenames.length === 0}>
          <AccordionTrigger className="py-4 hover:no-underline font-semibold text-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Eye className="h-4 w-4" /></div>
              2. Raw Data Preview
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {loadingPreviews && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary h-6 w-6" /></div>}
            
            {!loadingPreviews && previewFilenames.length > 0 && (
              <Tabs defaultValue={previewFilenames[0]}>
                <TabsList className="mb-4 bg-transparent p-0 w-full justify-start overflow-x-auto rounded-none border-b border-border/60">
                  {previewFilenames.map(fname => (
                    <TabsTrigger key={fname} value={fname} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-2">
                      {fname}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {previewFilenames.map(fname => (
                  <TabsContent key={fname} value={fname} className="mt-0">
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                      <div className="overflow-x-auto max-h-[400px]">
                        <Table>
                          <TableHeader className="bg-muted/40 sticky top-0 z-10">
                            <TableRow>
                              {previews[fname]?.columns?.map((col: string, i: number) => (
                                <TableHead key={i} className="whitespace-nowrap text-xs text-muted-foreground">{col}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previews[fname]?.preview?.map((row: any, rIdx: number) => (
                              <TableRow key={rIdx}>
                                {previews[fname]?.columns?.map((col: string, cIdx: number) => (
                                  <TableCell key={cIdx} className="whitespace-nowrap text-xs py-2">{row[col] !== null ? String(row[col]) : ""}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mapping" className="rounded-xl border border-border bg-card px-6 shadow-sm data-[state=open]:pb-6" disabled={masterFiles.length === 0}>
          <AccordionTrigger className="py-4 hover:no-underline font-semibold text-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></div>
              3. Ariba Sheet Configuration
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center justify-end mb-4 gap-2 border-b border-border/60 pb-3">
               <span className="text-sm font-medium text-muted-foreground">AI Assist</span>
               <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
               {aiRunning && <Loader2 className="ml-2 animate-spin text-primary h-4 w-4" />}
            </div>

            <div className="space-y-6">
              {["En-tête de la demande d'achat", "Détails de la demande d'achat", "Fractionnement comptable"].map((sheetName) => (
                <div key={sheetName} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                      <span className="font-semibold text-base">Configure - {sheetName}</span>
                      <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                          <input 
                              type="checkbox" 
                              className="h-4 w-4 rounded border-border"
                              checked={config.ariba_configs[sheetName].skip}
                              onChange={e => {
                                  const checked = e.target.checked;
                                  setConfig(prev => ({
                                      ...prev,
                                      ariba_configs: {
                                          ...prev.ariba_configs,
                                          [sheetName]: { ...prev.ariba_configs[sheetName], skip: checked }
                                      }
                                  }));
                              }}
                          />
                          Skip this sheet (keep original)
                      </label>
                  </div>
                  
                  {!config.ariba_configs[sheetName].skip && (
                      <div className="space-y-6">
                          <div>
                              <label className="block text-sm font-medium text-muted-foreground mb-3">Select Master File(s) for Enrichment:</label>
                              <div className="flex flex-wrap gap-3">
                                  {masterFiles.map(f => (
                                      <label key={f.name} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm cursor-pointer transition ${config.ariba_configs[sheetName].master_files.includes(f.name) ? "border-primary bg-primary/10 text-primary font-medium shadow-sm" : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
                                          <input 
                                              type="checkbox" 
                                              className="hidden"
                                              checked={config.ariba_configs[sheetName].master_files.includes(f.name)}
                                              onChange={e => {
                                                  const checked = e.target.checked;
                                                  setConfig(prev => {
                                                      const currList = prev.ariba_configs[sheetName].master_files;
                                                      const newList = checked ? [...currList, f.name] : currList.filter(x => x !== f.name);
                                                      return {
                                                          ...prev,
                                                          ariba_configs: {
                                                              ...prev.ariba_configs,
                                                              [sheetName]: { ...prev.ariba_configs[sheetName], master_files: newList }
                                                          }
                                                      };
                                                  });
                                              }}
                                          />
                                          {f.name}
                                      </label>
                                  ))}
                              </div>
                          </div>

                          {/* Data mapping options and mini-preview for selected files */}
                          {config.ariba_configs[sheetName].master_files.length > 0 && (
                            <div className="mt-6 rounded-xl border border-border/60 bg-background p-5 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">ID Column</label>
                                    <select 
                                      className="w-full rounded-lg border border-border bg-card p-2 text-sm"
                                      value={config.ariba_configs[sheetName].id_column}
                                      onChange={(e) => setConfig(p => ({
                                        ...p, ariba_configs: { ...p.ariba_configs, [sheetName]: { ...p.ariba_configs[sheetName], id_column: e.target.value } }
                                      }))}
                                    >
                                      <option value="">Select ID Column...</option>
                                      {previews[config.ariba_configs[sheetName].master_files[0]]?.columns?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Filter Column</label>
                                    <select 
                                      className="w-full rounded-lg border border-border bg-card p-2 text-sm"
                                      value={config.ariba_configs[sheetName].filter_column}
                                      onChange={(e) => setConfig(p => ({
                                        ...p, ariba_configs: { ...p.ariba_configs, [sheetName]: { ...p.ariba_configs[sheetName], filter_column: e.target.value } }
                                      }))}
                                    >
                                      <option value="">No Filter...</option>
                                      {previews[config.ariba_configs[sheetName].master_files[0]]?.columns?.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Filter Value</label>
                                    <input 
                                      type="text"
                                      className="w-full rounded-lg border border-border bg-card p-2 text-sm"
                                      placeholder="e.g. Active"
                                      value={config.ariba_configs[sheetName].filter_value}
                                      onChange={(e) => setConfig(p => ({
                                        ...p, ariba_configs: { ...p.ariba_configs, [sheetName]: { ...p.ariba_configs[sheetName], filter_value: e.target.value } }
                                      }))}
                                    />
                                  </div>
                                </div>

                                <Accordion type="single" collapsible className="w-full">
                                  <AccordionItem value="mini-preview" className="border-0">
                                    <AccordionTrigger className="text-xs font-medium py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted border border-border/60">
                                      Toggle Data Preview for {config.ariba_configs[sheetName].master_files[0]}
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-3">
                                      <div className="rounded-lg border border-border/60 overflow-hidden">
                                        <div className="overflow-x-auto max-h-[400px]">
                                          <Table>
                                            <TableHeader className="bg-muted/40 sticky top-0 z-10">
                                              <TableRow>
                                                {previews[config.ariba_configs[sheetName].master_files[0]]?.columns?.map((col: string, i: number) => (
                                                  <TableHead key={i} className="whitespace-nowrap text-[10px] text-muted-foreground py-1 h-8">{col}</TableHead>
                                                ))}
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {(() => {
                                                const fileName = config.ariba_configs[sheetName].master_files[0];
                                                const filterCol = config.ariba_configs[sheetName].filter_column;
                                                const filterVal = config.ariba_configs[sheetName].filter_value;
                                                let data = previews[fileName]?.preview || [];
                                                
                                                if (filterCol && filterVal) {
                                                  data = data.filter((row: any) => 
                                                    String(row[filterCol]).toLowerCase().includes(filterVal.toLowerCase())
                                                  );
                                                }
                                                
                                                return data.slice(0, 500).map((row: any, rIdx: number) => (
                                                  <TableRow key={rIdx}>
                                                    {previews[fileName]?.columns?.map((col: string, cIdx: number) => (
                                                      <TableCell key={cIdx} className="whitespace-nowrap text-[10px] py-1 h-8">{row[col] !== null ? String(row[col]) : ""}</TableCell>
                                                    ))}
                                                  </TableRow>
                                                ));
                                              })()}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                            </div>
                          )}
                      </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-end gap-3">
              {processing && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full max-w-xs space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              {processing && uploadProgress === 100 && (
                <p className="text-xs text-muted-foreground animate-pulse">Processing on server...</p>
              )}
              <Button
                size="lg"
                onClick={handleProcess}
                disabled={processing || masterFiles.length === 0}
                className="w-full md:w-auto"
              >
                {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {processing ? "Extracting..." : "Start Extraction"}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="results" className="rounded-xl border border-border bg-card px-6 shadow-sm data-[state=open]:pb-6" disabled={!resultBlob}>
          <AccordionTrigger className="py-4 hover:no-underline font-semibold text-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><CheckCircle2 className="h-4 w-4" /></div>
              4. Extracted Results
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {resultSheetNames.length > 0 && (
              <div className="space-y-4">
                <Tabs defaultValue={resultSheetNames[0]}>
                  <TabsList className="mb-4 bg-transparent p-0 w-full justify-start overflow-x-auto rounded-none border-b border-border/60">
                    {resultSheetNames.map(sheetName => (
                      <TabsTrigger key={sheetName} value={sheetName} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2 pt-2">
                        {sheetName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {resultSheetNames.map(sheetName => {
                    const rows = resultPreviewData[sheetName];
                    if (!rows || rows.length === 0) return null;
                    const headers = rows[0] || [];
                    const dataRows = rows.slice(1);
                    
                    return (
                      <TabsContent key={sheetName} value={sheetName} className="mt-0">
                        <div className="rounded-lg border border-border/60 overflow-hidden">
                          <div className="overflow-x-auto max-h-[400px]">
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
                                  <TableRow key={rIdx}>
                                    {headers.map((_: any, cIdx: number) => (
                                      <TableCell key={cIdx} className="whitespace-nowrap text-xs py-2">{row[cIdx] !== undefined ? String(row[cIdx]) : ""}</TableCell>
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
                
                <div className="flex justify-end pt-4">
                  <Button size="lg" onClick={downloadResult} className="w-full md:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Download .xlsx
                  </Button>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
}