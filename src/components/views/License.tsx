import React from 'react';
import { KeyRound, ShieldCheck, Mail, Globe, Sparkles } from 'lucide-react';

const License: React.FC = () => {
    return (
        <div className="flex-1 p-6 space-y-6 max-w-5xl mx-auto overflow-y-auto">
            {/* Header / Breadcrumb Banner */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <KeyRound className="size-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">License Agreement</h1>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Active License
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Enterprise software license terms, ownership, and support details
                        </p>
                    </div>
                </div>
            </div>

            {/* License Content Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Copyright Notice */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-4 text-primary">
                            <ShieldCheck className="size-5" />
                            <h2 className="text-base font-bold text-foreground">Proprietary Notice</h2>
                        </div>
                        <div className="text-base font-semibold text-foreground mb-2">
                            © BOTIVATE SERVICES LLP
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            This software is developed exclusively by Botivate Services LLP for authorized client deployments. 
                            Unauthorized duplication, decompilation, distribution, or copying of this software and its codebase is strictly prohibited and protected under applicable intellectual property laws.
                        </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Platform Engine</span>
                        <span className="font-mono font-bold text-foreground">v2.0 Enterprise</span>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-4 text-purple-600 dark:text-purple-400">
                            <Sparkles className="size-5" />
                            <h2 className="text-base font-bold text-foreground">Support & Licensing</h2>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-4">
                            For enterprise license extensions, custom modules, or technical support, contact the Botivate engineering team:
                        </p>
                        <div className="space-y-2.5">
                            <a
                                href="mailto:info@botivate.in"
                                className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 hover:bg-accent/70 transition-colors border border-border/50 text-xs sm:text-sm font-medium text-foreground no-underline"
                            >
                                <Mail className="size-4 text-primary shrink-0" />
                                <span>info@botivate.in</span>
                            </a>
                            <a
                                href="https://www.botivate.in"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 hover:bg-accent/70 transition-colors border border-border/50 text-xs sm:text-sm font-medium text-foreground no-underline"
                            >
                                <Globe className="size-4 text-purple-500 shrink-0" />
                                <span>www.botivate.in</span>
                            </a>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border/60 text-center text-[11px] text-muted-foreground">
                        Powered by <span className="font-semibold text-foreground">Botivate Platform Architecture</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default License;
