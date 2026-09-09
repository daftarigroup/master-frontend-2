import { useNavigate, useSearchParams as useRRSearchParams, useLocation, useParams } from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string, _options?: any) => navigate(url),
    replace: (url: string, _options?: any) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function useSearchParams() {
  const [searchParams] = useRRSearchParams();
  return searchParams;
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export { useParams };
