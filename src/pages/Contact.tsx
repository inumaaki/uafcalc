import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, User, MessageSquare } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function Contact() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch("https://formspree.io/f/mvzzajyy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                toast({
                    title: "Message Sent Successfully!",
                    description: "Thank you for your suggestion. We will review it shortly.",
                });
                setFormData({ name: "", email: "", message: "" });
            } else {
                toast({
                    title: "Error Sending Message",
                    description: "Please try again later.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error Sending Message",
                description: "Please check your internet connection and try again.",
                variant: "destructive",
            });
        }

        setLoading(false);
    };

    return (
        <Layout>
            <div className="flex flex-col items-center justify-center min-h-[85vh] p-4">
                <div className="w-full max-w-lg mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-6"
                    >
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                            <Mail className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-1">
                            Contact & Suggestions
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Have a suggestion or found a bug? We'd love to hear from you.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="border-primary/20 shadow-xl">
                            <CardHeader className="pb-2 pt-4 text-center">
                                <CardTitle className="text-xl">Send us a Message</CardTitle>
                                <CardDescription className="text-xs">
                                    Fill out the form below and we'll get back to you if needed.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            Name
                                        </label>
                                        <Input
                                            placeholder="Your Name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="h-9 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                            Email
                                        </label>
                                        <Input
                                            type="email"
                                            placeholder="your.email@example.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                            className="h-9 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                            Suggestion / Message
                                        </label>
                                        <Textarea
                                            placeholder="Type your message here..."
                                            className="min-h-[100px] resize-none text-sm"
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <Button type="submit" className="w-full h-9 mt-1" disabled={loading}>
                                        {loading ? (
                                            "Sending..."
                                        ) : (
                                            <>
                                                <Send className="h-3.5 w-3.5 mr-2" />
                                                Send Message
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </Layout>
    );
}
