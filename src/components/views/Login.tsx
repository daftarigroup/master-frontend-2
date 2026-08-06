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
            navigate('/');
        }
    }, [loggedIn]);

    useGSAP(() => {
        const blobs = gsap.utils.toArray<HTMLElement>('.login-blob', containerRef.current);

        const tl = gsap.timeline();
        tl.from(blobs, { opacity: 0, scale: 0.4, duration: 1.4, stagger: 0.15, ease: 'power3.out' })
            .from(cardRef.current, { y: 50, opacity: 0, scale: 0.92, duration: 0.9, ease: 'power3.out' }, '-=0.9')
            .from(logoRef.current, { scale: 0, rotate: -200, opacity: 0, duration: 0.7, ease: 'back.out(1.8)' }, '-=0.55')
            .from('.form-stagger', { y: 18, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }, '-=0.35');

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
            className="relative grid place-items-center h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-purple-50 to-pink-50"
        >
            <div className="login-blob absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-300 to-purple-300 blur-3xl opacity-60" />
            <div className="login-blob absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-purple-300 to-fuchsia-300 blur-3xl opacity-50" />
            <div className="login-blob absolute -bottom-24 left-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300 to-blue-200 blur-3xl opacity-50" />

            <Card
                className="relative w-full max-w-sm bg-white/80 backdrop-blur-sm border-white/60 shadow-xl"
                ref={cardRef}
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="grid gap-6">
                        <CardHeader className="text-center flex justify-center flex-col items-center">
                            <Logo ref={logoRef} size={72} />
                            <CardTitle className="form-stagger font-bold text-xl bg-gradient-to-br from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Pooja Constructions PMS
                            </CardTitle>
                            <CardDescription className="form-stagger">Please login to your account</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem className="form-stagger">
                                        <FormLabel>Username</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Enter username" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="form-stagger">
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={visible ? 'text' : 'password'}
                                                    placeholder="Enter password"
                                                    {...field}
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
                                                    {visible ? <EyeClosed /> : <Eye />}
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

                        <CardFooter className="form-stagger">
                            <Button
                                type="submit"
                                className="bg-gradient-to-br from-blue-600 to-purple-600 font-medium w-full transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
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
