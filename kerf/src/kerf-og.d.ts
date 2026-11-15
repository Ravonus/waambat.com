// Kerf Start 0.1.0 exports this renderer as JS without a declaration file.
// Keep the app seam typed until Start publishes its OG entry-point declarations.
declare module '@kerf-js/start/og' {
  export function renderCard(
    html: string,
    size?: {width?: number; height?: number},
    fonts?: {name: string; data: Uint8Array; weight?: number; style?: 'normal' | 'italic'}[],
    options?: {strict?: boolean; onDiagnostic?: (diagnostic: {code: string; severity: string; message: string}) => void},
  ): Promise<Uint8Array>;
}
