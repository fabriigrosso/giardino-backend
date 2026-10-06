export default function Home() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px', lineHeight: 1.6 }}>
      <h1 style={{ color: '#10B981' }}>🌿 Giardino San Juan — Backend</h1>
      <p>El servidor está corriendo correctamente.</p>
      <ul>
        <li><code>/api/clientes</code> — REST (clientes)</li>
        <li><code>/api/transacciones</code> — REST (ingresos y gastos)</li>
        <li><code>/api/config</code> — REST (configuración de costos)</li>
        <li><code>/api/mcp</code> — servidor MCP (Gemini, Claude, etc.)</li>
      </ul>
      <p>Todas las rutas requieren el header:</p>
      <pre style={{ background: '#151d29', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
        Authorization: Bearer &lt;tu API_KEY&gt;
      </pre>
    </main>
  );
}
