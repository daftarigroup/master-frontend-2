import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ClipLoader as Loader } from 'react-spinners';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeClosed, ShieldCheck, ArrowLeft } from 'lucide-react';
import Logo from '../element/Logo';
import { toast } from 'sonner';
import { createUser } from '@/services/userService';

const schema = z.object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    adminKey: z.string().min(1, 'Admin security key is required'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

// Temporary hardcoded admin creation key — change this before production
const ADMIN_CREATION_KEY = 'STORE@ADMIN2025';

export default () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [success, setSuccess] = useState(false);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            username: '',
            password: '',
            confirmPassword: '',
            adminKey: '',
        },
    });

    async function onSubmit(values: z.infer<typeof schema>) {
        if (values.adminKey !== ADMIN_CREATION_KEY) {
            form.setError('adminKey', { message: 'Invalid admin security key' });
            return;
        }

        try {
            await createUser({
                name: values.name,
                username: values.username,
                password: values.password,
                modify_access: 'EDIT',
                administrate: true,
                // Grant all permissions for admin account
                createIndent: true,
                indentApprovalView: true,
                updateVendorView: true,
                threePartyApprovalView: true,
                createPo: true,
                ordersView: true,
                storeIn: true,
                storeIssue: true,
                storeIssueReturn: true,
                issueData: true,
                inventory: true,
                fullKiting: true,
                makePayment: true,
                auditData: true,
                reauditData: true,
                hodStoreApproval: true,
                sendDebitNote: true,
                insteadOfQualityCheckInReceivedItem: true,
                exchangeMaterials: true,
                returnMaterialToParty: true,
                pendingPo: true,
            });

            setSuccess(true);
            toast.success(`Admin account "${values.username}" created successfully!`);
        } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already')) {
                toast.error('Username already exists. Choose a different one.');
                form.setError('username', { message: 'Username already taken' });
            } else {
                toast.error('Failed to create account. Check backend connection.');
                console.error(err);
            }
        }
    }

    if (success) {
        return (
            <div className="grid place-items-center h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
                <Card className="w-full max-w-sm text-center shadow-xl border-emerald-200">
                    <CardHeader className="flex flex-col items-center gap-3 pb-2">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ShieldCheck className="text-emerald-600" size={32} />
                        </div>
                        <CardTitle className="text-2xl font-bold text-emerald-700">Account Created!</CardTitle>
                        <CardDescription className="text-base">
                            Your admin account has been successfully created. You can now log in with your credentials.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 pt-2">
                        <Button
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-semibold"
                            onClick={() => navigate('/login')}
                        >
                            Go to Login
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => { setSuccess(false); form.reset(); }}
                        >
                            Create Another Account
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Back to login */}
                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 text-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Login
                </button>

                <Card className="bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl text-white">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-0">
                            <CardHeader className="text-center flex flex-col items-center gap-3 pb-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl" />
                                    <div className="relative w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                                        <Logo size={28} />
                                    </div>
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold text-white">Create Admin Account</CardTitle>
                                    <CardDescription className="text-slate-400 mt-1">
                                        Use the admin key to register a privileged account
                                    </CardDescription>
                                </div>

                                {/* Warning banner */}
                                <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2.5 flex items-start gap-2 text-left">
                                    <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-amber-300 text-xs leading-relaxed">
                                        This page is for <strong>temporary admin setup only</strong>. Remove or restrict access after initial setup.
                                    </p>
                                </div>
                            </CardHeader>

                            <CardContent className="grid gap-4 pt-0 pb-6">
                                {/* Full Name */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300 text-sm">Full Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="e.g. Pooja Sharma"
                                                    className="bg-white/8 border-white/15 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-10"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-xs" />
                                        </FormItem>
                                    )}
                                />

                                {/* Username */}
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300 text-sm">Username</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="e.g. admin_pooja"
                                                    className="bg-white/8 border-white/15 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-10"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-xs" />
                                        </FormItem>
                                    )}
                                />

                                {/* Password */}
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300 text-sm">Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        {...field}
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="Min. 6 characters"
                                                        className="bg-white/8 border-white/15 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-10 pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        tabIndex={-1}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                                        onMouseDown={(e) => { e.preventDefault(); setShowPassword(!showPassword); }}
                                                    >
                                                        {showPassword ? <EyeClosed size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-xs" />
                                        </FormItem>
                                    )}
                                />

                                {/* Confirm Password */}
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300 text-sm">Confirm Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        {...field}
                                                        type={showConfirm ? 'text' : 'password'}
                                                        placeholder="Re-enter password"
                                                        className="bg-white/8 border-white/15 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-10 pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        tabIndex={-1}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                                        onMouseDown={(e) => { e.preventDefault(); setShowConfirm(!showConfirm); }}
                                                    >
                                                        {showConfirm ? <EyeClosed size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-xs" />
                                        </FormItem>
                                    )}
                                />

                                {/* Divider */}
                                <div className="flex items-center gap-3 my-1">
                                    <div className="flex-1 h-px bg-white/10" />
                                    <span className="text-slate-500 text-xs uppercase tracking-wider">Security</span>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {/* Admin Security Key */}
                                <FormField
                                    control={form.control}
                                    name="adminKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-slate-300 text-sm flex items-center gap-1.5">
                                                <ShieldCheck size={13} className="text-purple-400" />
                                                Admin Security Key
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        {...field}
                                                        type={showKey ? 'text' : 'password'}
                                                        placeholder="Enter the admin key"
                                                        className="bg-white/8 border-white/15 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-10 pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        tabIndex={-1}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                                        onMouseDown={(e) => { e.preventDefault(); setShowKey(!showKey); }}
                                                    >
                                                        {showKey ? <EyeClosed size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400 text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={form.formState.isSubmitting}
                                    className="w-full h-11 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all"
                                >
                                    {form.formState.isSubmitting ? (
                                        <><Loader size={18} color="white" /> Creating Account...</>
                                    ) : (
                                        'Create Admin Account'
                                    )}
                                </Button>
                            </CardContent>
                        </form>
                    </Form>
                </Card>
            </div>
        </div>
    );
};
