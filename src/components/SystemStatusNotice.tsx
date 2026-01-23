import { useEffect, useState } from 'react';
import { uafScraper } from '@/lib/uaf-scraper';
import { AlertCircle } from 'lucide-react';

export const SystemStatusNotice = () => {
    const [isSystemDown, setIsSystemDown] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                // Run check in background
                const isHealthy = await uafScraper.checkAttendanceHealth();
                if (!isHealthy) {
                    setIsSystemDown(true);
                    setIsVisible(true);
                }
            } catch (e) {
                console.error("Health check failed unexpectedly", e);
                // Fail safe: don't show error if we aren't sure
            }
        };

        checkHealth();
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed top-20 right-4 z-[100] animate-in fade-in slide-in-from-top-2">
            <div className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm border border-destructive/20">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                    <p className="font-bold text-sm">System Alert</p>
                    <p className="text-xs opacity-90">
                        ATTENDANCE SYSTEM IS DOWN. DATA CANNOT BE RETRIEVED
                    </p>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="ml-2 hover:bg-destructive/20 p-1 rounded-full transition-colors"
                >
                    <span className="sr-only">Dismiss</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 18 18" /></svg>
                </button>
            </div>
        </div>
    );
};
