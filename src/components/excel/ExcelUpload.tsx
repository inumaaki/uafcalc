import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

interface ExcelUploadProps {
  onAGNumbersChange: (agNumbers: string[]) => void;
}

export function ExcelUpload({ onAGNumbersChange }: ExcelUploadProps) {
  const [agNumbers, setAgNumbers] = useState<string[]>([]);
  const [newAG, setNewAG] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

        const extractedAGs: string[] = [];
        jsonData.forEach((row) => {
          row.forEach((cell) => {
            if (typeof cell === "string" && cell.match(/^\d{4}-ag-\d+$/i)) {
              extractedAGs.push(cell.toLowerCase());
            }
          });
        });

        const uniqueAGs = [...new Set([...agNumbers, ...extractedAGs])];
        setAgNumbers(uniqueAGs);
        onAGNumbersChange(uniqueAGs);
      } catch (error) {
        console.error("Error processing file:", error);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [agNumbers, onAGNumbersChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.match(/\.(xlsx|xls)$/i)) {
        processFile(file);
      }
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const addManualAG = () => {
    const trimmed = newAG.trim().toLowerCase();
    if (trimmed && trimmed.match(/^\d{4}-ag-\d+$/i) && !agNumbers.includes(trimmed)) {
      const updated = [...agNumbers, trimmed];
      setAgNumbers(updated);
      onAGNumbersChange(updated);
      setNewAG("");
    }
  };

  const removeAG = (ag: string) => {
    const updated = agNumbers.filter((n) => n !== ag);
    setAgNumbers(updated);
    onAGNumbersChange(updated);
  };

  const clearAll = () => {
    setAgNumbers([]);
    onAGNumbersChange([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          AG Numbers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drop Excel file here or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports .xlsx and .xls files
          </p>
        </motion.div>

        {/* Manual Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter AG number (e.g., 2022-ag-7745)"
            value={newAG}
            onChange={(e) => setNewAG(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addManualAG()}
            className="flex-1"
          />
          <Button onClick={addManualAG} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* AG List */}
        <AnimatePresence>
          {agNumbers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {agNumbers.length} AG number{agNumbers.length !== 1 ? "s" : ""}
                </p>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-muted/30 rounded-lg">
                {agNumbers.map((ag, index) => (
                  <motion.div
                    key={ag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Badge
                      variant="secondary"
                      className="pr-1 gap-1 font-mono"
                    >
                      {ag}
                      <button
                        onClick={() => removeAG(ag)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
