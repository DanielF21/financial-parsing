'use client'

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CsvViewerProps {
  pdfId: string;
}

export default function CsvViewer({ pdfId }: CsvViewerProps) {
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  console.log(csvContent);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchCsv = async () => {
      try {
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('PDF_Bucket')
          .createSignedUrl(`csv/analysis_${pdfId}.csv`, 600);

        if (urlError) throw urlError;

        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) throw new Error('Failed to fetch CSV');
        
        const csvText = await response.text();
        setCsvContent(csvText);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchCsv();
  }, [pdfId]);

  const renderCsvContent = () => {
    if (!csvContent) return null;
    
    const rows = csvContent.split('\n').map(row => row.split(','));
    return (
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            {rows[0].map((header, index) => (
              <th key={index} className="px-4 py-2 border-b">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 border-b">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>CSV Viewer</CardTitle>
        <CardDescription>View your analyzed CSV document</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading...</p>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {csvContent ? (
          <div className="overflow-x-auto">
            {renderCsvContent()}
          </div>
        ) : (
          !loading && <p>No CSV available.</p>
        )}
      </CardContent>
    </Card>
  );
}