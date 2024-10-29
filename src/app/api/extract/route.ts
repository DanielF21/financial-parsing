import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pdfToText } from 'pdf-ts';
import { analyzeReportWithGPT, jsonToCsv } from "./utils";

async function readPdfBuffer(pdfBuffer: Buffer): Promise<string> {
  try {
    const text = await pdfToText(pdfBuffer);
    return text;
  } catch (error) {
    console.error("Error reading PDF:", error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get("fileId");
  const { data: fileData, error: fileError } = await supabase
      .from('pdfs')
      .select('*')
      .eq('id', fileId)
      .single();

  if (fileError || !fileData) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    
  const { data: file, error: downloadError } = await supabase.storage
          .from('PDF_Bucket')
          .download(fileData.file_path);
  
  if (downloadError || !file) {
        console.error('Download error:', downloadError);
        return NextResponse.json({ error: 'File not found or download error' }, { status: 404 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
  }

  //const userId = searchParams.get("userId");
  const fileBuffer = Buffer.from(arrayBuffer);
  try {
    const text = await readPdfBuffer(fileBuffer);
    
    // Add progress tracking
    const analysisResult = await analyzeReportWithGPT(text);
    const csvContent = await jsonToCsv(Promise.resolve(analysisResult));

    return NextResponse.json({ 
        data: csvContent,
        status: 'completed'
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json({ 
        error: 'Error processing PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
