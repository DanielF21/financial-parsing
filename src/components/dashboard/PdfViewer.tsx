'use client'

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PdfViewerProps {
  pdfId: string;
}

export default function PdfViewer({ pdfId }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        // Fetch the PDF metadata from the database
        const { data, error: fetchError } = await supabase
          .from('pdfs')
          .select('file_path')
          .eq('id', pdfId)
          .single();

        if (fetchError) throw fetchError;

        // Generate a signed URL for the PDF file
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('PDF_Bucket')
          .createSignedUrl(data.file_path, 600);

        if (urlError) throw urlError;

        setPdfUrl(signedUrlData.signedUrl);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();
  }, [pdfId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Viewer</CardTitle>
        <CardDescription>View your uploaded PDF document</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading...</p>}
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            width="100%"
            height="600px"
            title="PDF Viewer"
            style={{ border: 'none' }}
          />
        ) : (
          !loading && <p>No PDF available.</p>
        )}
      </CardContent>
    </Card>
  );
}