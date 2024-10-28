'use client'

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PDF = {
  id: string;
  file_name: string;
};

interface PDFListProps {
  onSelectPDF: (pdfId: string) => void;
}

export default function PDFList({ onSelectPDF }: PDFListProps) {
  const [pdfs, setPdfs] = useState<PDF[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    const { data, error } = await supabase
      .from('pdfs')
      .select('id, file_name');

    if (error) {
      console.error('Error fetching PDFs:', error);
    } else {
      setPdfs(data as PDF[]); // Update state with fetched PDFs
    }
  };

  const handlePDFClick = (pdfId: string) => {
    onSelectPDF(pdfId); // Call the passed function with the selected PDF ID
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your PDFs</CardTitle>
        <CardDescription>Click on a PDF to view it</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ul className="space-y-2">
            {pdfs.map((pdf) => (
              <li key={pdf.id}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handlePDFClick(pdf.id)}
                >
                  {pdf.file_name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}