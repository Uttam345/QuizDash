// Diagnostic Component - Add this temporarily to check environment variables
// Place this in your main App.tsx or create a separate diagnostic page

export const DiagnosticInfo = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const mode = import.meta.env.MODE;
  const dev = import.meta.env.DEV;
  const prod = import.meta.env.PROD;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      background: 'black', 
      color: 'lime', 
      padding: '10px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 9999,
      maxWidth: '400px',
      borderRadius: '5px'
    }}>
      <div><strong>🔍 Environment Diagnostic</strong></div>
      <div>Mode: {mode}</div>
      <div>Dev: {dev ? 'true' : 'false'}</div>
      <div>Prod: {prod ? 'true' : 'false'}</div>
      <div>API URL: {apiUrl || '❌ NOT SET'}</div>
      <div>Expected: https://quizdash-bhcw.onrender.com/api</div>
      {!apiUrl && (
        <div style={{color: 'red', marginTop: '5px'}}>
          ⚠️ VITE_API_URL not set in Vercel!
        </div>
      )}
    </div>
  );
};

// Test API connection
export const testApiConnection = async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  console.log('🔍 Testing API connection...');
  console.log('API URL:', apiUrl);
  
  try {
    const response = await fetch(`${apiUrl.replace('/api', '')}/`);
    const data = await response.json();
    console.log('✅ Backend connected:', data);
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
};
