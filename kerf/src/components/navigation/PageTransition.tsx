import { NavigationArrival } from './NavigationProvider';
export default function PageTransition({ children }: {
    children: unknown;
    skeleton?: boolean;
}) { return <><NavigationArrival />{children}</>; }
