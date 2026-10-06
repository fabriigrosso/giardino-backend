export const metadata = {
  title: 'Giardino San Juan — Backend',
  description: 'API + servidor MCP para Giardino San Juan',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#0b1119', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
