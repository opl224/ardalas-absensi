'use client'

import { ArrowLeft, Shield, Eye, Database, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const PrivacyRow = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="flex items-start gap-4 py-4">
        <Icon className="h-6 w-6 text-muted-foreground mt-1" />
        <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);

export function Privacy({ onBack }: { onBack: () => void }) {
    return (
        <div className="bg-gray-50 dark:bg-zinc-900 p-4 min-h-screen">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-1">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-xl font-bold text-foreground">Privacy</h1>
            </header>

            <div className="text-center mb-8">
                <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
                <h2 className="text-2xl font-bold">Privacy & Security</h2>
                <p className="text-muted-foreground">Manage your privacy settings and data</p>
            </div>

            <Card>
                <CardContent className="p-4 pt-2">
                     <h3 className="font-semibold text-lg my-2">Data Privacy</h3>
                     <Separator />
                     <div className="divide-y divide-border">
                        <PrivacyRow 
                            icon={Eye} 
                            title="Data Collection" 
                            description="We collect attendance data, location information, and photos for verification purposes only." 
                        />
                         <PrivacyRow 
                            icon={Database} 
                            title="Data Storage" 
                            description="Your data is securely stored and encrypted. We do not share your personal information with third parties." 
                        />
                         <PrivacyRow 
                            icon={Lock} 
                            title="Data Security" 
                            description="All data transmission is encrypted using industry-standard security protocols." 
                        />
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
