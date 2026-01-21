import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Plus, Trash2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AGReviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    initialAGs: string[];
    onConfirm: (finalAGs: string[]) => void;
}

export function AGReviewDialog({ isOpen, onClose, initialAGs, onConfirm }: AGReviewDialogProps) {
    const [ags, setAgs] = useState<string[]>([]);
    const [newAG, setNewAG] = useState("");

    useEffect(() => {
        if (isOpen) {
            setAgs(initialAGs);
        }
    }, [isOpen, initialAGs]);

    const handleAdd = () => {
        if (newAG.trim()) {
            // Basic validation or just add
            const agToAdd = newAG.trim();
            if (!ags.includes(agToAdd)) {
                setAgs([...ags, agToAdd]);
            }
            setNewAG("");
        }
    };

    const handleRemove = (index: number) => {
        setAgs(ags.filter((_, i) => i !== index));
    };

    const handleConfirm = () => {
        onConfirm(ags);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-primary" />
                        Review Registration Numbers
                    </DialogTitle>
                    <DialogDescription>
                        Review the list of {ags.length} students to fetch. You can add or remove numbers before starting.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 my-2">
                    <Input
                        placeholder="Add AG (e.g. 2024-ag-1234)"
                        value={newAG}
                        onChange={(e) => setNewAG(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="flex-1"
                    />
                    <Button onClick={handleAdd} size="icon" variant="outline" title="Add">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="h-[50vh] w-full border rounded-md p-2 bg-muted/20">
                    {ags.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-8">
                            No registration numbers listed. Add some above.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ags.map((ag, idx) => (
                                <div key={`${ag}-${idx}`} className="flex items-center justify-between bg-card border px-2 py-1.5 rounded-md text-sm">
                                    <span className="font-mono truncate mr-2" title={ag}>{ag}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                        onClick={() => handleRemove(idx)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleConfirm} disabled={ags.length === 0}>
                        Confirm & Fetch ({ags.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
