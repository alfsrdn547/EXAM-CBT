import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './index.css';

const rootElement = document.getElementById('root');

async function bootstrap() {
  if (!rootElement) {
    throw new Error('Elemen #root tidak ditemukan.');
  }

  try {
    const { default: App } = await import('./App.tsx');
    createRoot(rootElement).render(<App />);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Aplikasi gagal dimuat karena konfigurasi tidak valid.';

    createRoot(rootElement).render(
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-red-700">Aplikasi gagal dimuat</h1>
          <p className="mt-2 text-sm text-slate-600">
            Konfigurasi Supabase tidak valid. Periksa <code>.env</code> dan pastikan
            <code> VITE_SUPABASE_URL</code> berisi URL <code>https://...</code> serta
            <code> VITE_SUPABASE_ANON_KEY</code> berisi publishable/anon key.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-100 p-3 text-xs text-slate-700">
            {message}
          </pre>
        </div>
      </div>,
    );
  }
}

void bootstrap();
