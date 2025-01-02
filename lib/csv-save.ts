export async function saveCSV(
    org_key: string,
    module_key: string,
    content: string,
    type: 'config' | 'codeset'
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const response = await fetch(
        `/edit/api/save-csv?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content, type })
        }
      );
  
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save CSV'
      };
    }
  }
  