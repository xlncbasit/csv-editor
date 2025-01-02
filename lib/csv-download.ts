export async function downloadCSV(
    org_key: string, 
    module_key: string, 
    type: 'config' | 'codeset'
  ) {
    try {
      const response = await fetch(
        `/edit/api/download-csv?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type })
        }
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const blob = await response.blob();
      const filename = type === 'config' ? 'config.csv' : 'codesetvalues.csv';
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
  
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      return false;
    }
  }
  