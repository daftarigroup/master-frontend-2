import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '../ui/form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ClipLoader as Loader } from 'react-spinners';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeClosed } from 'lucide-react';
import Logo from '../element/Logo';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default () => {
    const { login, loggedIn } = useAuth();
    const [visible, setVisible] = useState(false);
    const navigate = useNavigate();

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (loggedIn) {
            navigate('/select-project');
        }
    }, [loggedIn]);

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        const target = e.target;
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    useGSAP(() => {
        const blobs = gsap.utils.toArray<HTMLElement>('.login-blob', containerRef.current);

        const tl = gsap.timeline();
        tl.fromTo(
            blobs,
            { opacity: 0, scale: 0.4 },
            { opacity: 0.6, scale: 1, duration: 1.2, stagger: 0.15, ease: 'power3.out' }
        )
            .fromTo(
                cardRef.current,
                { y: 50, opacity: 0, scale: 0.92 },
                { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' },
                '-=0.8'
            )
            .fromTo(
                logoRef.current,
                { scale: 0, rotate: -200, opacity: 0 },
                { scale: 1, rotate: 0, opacity: 1, duration: 0.7, ease: 'back.out(1.8)' },
                '-=0.5'
            )
            .fromTo(
                '.form-stagger',
                { y: 18, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out' },
                '-=0.3'
            );

        gsap.to(logoRef.current, { y: -6, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.6 });

        blobs.forEach((blob, i) => {
            gsap.to(blob, {
                x: i % 2 === 0 ? 40 : -40,
                y: i % 2 === 0 ? -30 : 30,
                duration: 7 + i,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
            });
        });
    }, { scope: containerRef });

    const schema = z.object({
        username: z.string().nonempty(),
        password: z.string().nonempty(),
    });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            username: '',
            password: '',
        }
    });

    async function onSubmit(values: z.infer<typeof schema>) {
        try {
            const res = await login(values.username, values.password);
            if (!res) {
                toast.error("Invalid Username or Password");
            }
        } catch (err: any) {
            console.error('Login submit error:', err);
            toast.error(err?.message || "Failed to connect to backend server. Please check backend status.");
        }
    }

    function onError(e: any) {
        console.error(e);
    }

    return (
        <div
            ref={containerRef}
            className="login-container relative grid place-items-center h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-purple-50 to-pink-50"
        >
            <style>{`
                /* Mobile only: allow scroll when keyboard pushes height down */
                @media (max-width: 768px) {
                    .login-container {
                        height: auto !important;
                        min-height: 100dvh !important;
                        overflow-y: auto !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        padding: 1.5rem 1rem !important;
                    }
                    .login-card {
                        margin-top: auto !important;
                        margin-bottom: auto !important;
                    }
                }
                /* Mobile + keyboard open (small height): compact layout */
                @media (max-width: 768px) and (max-height: 600px) {
                    .login-header {
                        padding: 0.5rem 0.5rem 0.25rem 0.5rem !important;
                    }
                    .login-logo img {
                        width: 44px !important;
                        height: 44px !important;
                    }
                    .login-title {
                        font-size: 1.05rem !important;
                        margin-top: 0.2rem !important;
                    }
                    .login-desc {
                        display: none !important;
                    }
                    .login-content {
                        padding: 0.5rem !important;
                        gap: 0.6rem !important;
                    }
                    .login-footer {
                        padding: 0.25rem 0.5rem 0.5rem 0.5rem !important;
                    }
                    .login-input {
                        height: 2.25rem !important;
                        font-size: 0.875rem !important;
                    }
                }
            `}</style>

            <div className="login-blob absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-300 to-purple-300 blur-3xl opacity-60 pointer-events-none" />
            <div className="login-blob absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-purple-300 to-fuchsia-300 blur-3xl opacity-50 pointer-events-none" />
            <div className="login-blob absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300 to-blue-200 blur-3xl opacity-50 pointer-events-none" />

            <Card
                className="login-card relative w-full max-w-sm my-auto bg-white/85 backdrop-blur-sm border-white/60 shadow-xl"
                ref={cardRef}
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid gap-6">
                        <CardHeader className="login-header text-center flex justify-center flex-col items-center">
                            <Logo ref={logoRef} size={72} className="login-logo" />
                            <CardTitle className="login-title form-stagger font-bold text-xl bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Pooja Constructions PMS
                            </CardTitle>
                            <CardDescription className="login-desc form-stagger">Please login to your account</CardDescription>
                        </CardHeader>
                        <CardContent className="login-content grid gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem className="form-stagger">
                                        <FormLabel className="text-xs sm:text-sm">Username</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                onFocus={handleInputFocus}
                                                className="login-input"
                                                placeholder="Enter username"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="form-stagger">
                                        <FormLabel className="text-xs sm:text-sm">Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={visible ? 'text' : 'password'}
                                                    placeholder="Enter password"
                                                    {...field}
                                                    onFocus={handleInputFocus}
                                                    className="login-input"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent active:bg-transparent"
                                                    tabIndex={-1}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setVisible(!visible);
                                                    }}
                                                >
                                                    {visible ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    <span className="sr-only">
                                                        Toggle password visibility
                                                    </span>
                                                </Button>
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <CardFooter className="login-footer form-stagger">
                            <Button
                                type="submit"
                                className="login-input bg-gradient-to-br from-blue-600 to-purple-600 font-medium w-full transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting && (
                                    <Loader size={20} color="white" aria-label="Loading Spinner" />
                                )}
                                Login
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
};
