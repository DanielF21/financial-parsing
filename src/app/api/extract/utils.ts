"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod";

// Current Assets
const CurrentAssets = z.object({
    cashAndEquivalents: z.number(),
    marketableSecurities: z.number(),
    inventories: z.number(),
    accountsReceivable: z.number(),
    totalCurrentAssets: z.number(),
});

// Non-Current Assets
const OtherAssets = z.object({
    propertyAndEquipment: z.number(),
    operatingLeases: z.number(),
    goodwill: z.number(),
    otherAssets: z.number(),
});

// Current Liabilities
const CurrentLiabilities = z.object({
    accountsPayable: z.number(),
    accruedExpenses: z.number(),
    unearnedRevenue: z.number(),
    totalCurrentLiabilities: z.number(),
});

// Non-Current Liabilities
const OtherLiabilities = z.object({
    longTermLeases: z.number(),
    longTermDebt: z.number(),
    otherLongTermLiabilities: z.number(),
});

// Stockholders Equity
const StockholdersEquity = z.object({
    commonStock: z.object({
        value: z.number(),
        sharesIssued: z.number(),
        sharesOutstanding: z.number(),
    }),
    treasuryStock: z.number(),
    additionalPaidInCapital: z.number(),
    accumulatedOtherComprehensiveIncome: z.number(),
    retainedEarnings: z.number(),
    totalStockholdersEquity: z.number(),
});

// Complete Balance Sheet
const BalanceSheetData = z.object({
    currentAssets: CurrentAssets,
    nonCurrentAssets: OtherAssets,
    currentLiabilities: CurrentLiabilities,
    nonCurrentLiabilities: OtherLiabilities,
    stockholdersEquity: StockholdersEquity,
    totalAssets: z.number(),
    totalLiabilitiesAndEquity: z.number(),
});


//extraction:
async function analyzeIncomeStatement<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    try {
        const { object } = await generateObject({
            model: openai("gpt-4"),
            prompt: prompt,
            schema: schema
        });
        return schema.parse(object);
    } catch (error) {
        console.error("Error analyzing statement:", error);
        throw error;
    }
}

function chunkText(text: string, maxTokens: number = 8000): string[] {
    // Rough approximation: 1 token ≈ 4 characters
    const chunkSize = maxTokens * 4;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    
    return chunks;
}

async function extractMetrics(text: string): Promise<z.infer<typeof BalanceSheetData>> {
    const chunks = chunkText(text);
    let combinedResults: z.infer<typeof BalanceSheetData> | null = null;
    
    for (const chunk of chunks) {
        const prompt = `
          You are an assistant tasked with extracting financial information from a 10-Q Report section.
          If you find any financial metrics in this section, update the corresponding values.
          If you don't find relevant information in this section, return the previous values or 0.

          ${chunk}
        `;
        
        try {
            const chunkResult = await analyzeIncomeStatement(prompt, BalanceSheetData);
            if (!combinedResults) {
                combinedResults = chunkResult;
            } else {
                // Merge results, taking non-zero values
                combinedResults = mergeResults(combinedResults, chunkResult);
            }
        } catch (error) {
            console.error("Error processing chunk:", error);
        }
    }
    
    if (!combinedResults) {
        throw new Error("Failed to extract any valid metrics");
    }
    
    return combinedResults;
}

function mergeResults(
    existing: z.infer<typeof BalanceSheetData>, 
    newData: z.infer<typeof BalanceSheetData>
): z.infer<typeof BalanceSheetData> {
    return {
        ...existing,
        currentAssets: {
            ...existing.currentAssets,
            cashAndEquivalents: newData.currentAssets.cashAndEquivalents || existing.currentAssets.cashAndEquivalents,
            // ... merge other fields similarly
        },
        // ... merge other sections similarly
    };
}

export async function analyzeReportWithGPT(text: string): Promise<z.infer<typeof BalanceSheetData>> {
    try {
        console.log("Analyzing...");
        return await extractMetrics(text);
    } catch (error) {
        console.error("Error analyzing report:", error);
        throw error;
    }
}

export async function jsonToCsv(analysis: Promise<z.infer<typeof BalanceSheetData>>): Promise<string> {
    try {
        const data = await analysis;
        const rows = [
            [
                data.currentAssets.totalCurrentAssets,
                data.nonCurrentAssets.otherAssets,
                data.currentLiabilities.totalCurrentLiabilities,
                data.nonCurrentLiabilities.longTermDebt
            ].join(',')
        ];
        
        const headers = [
            'Current Assets',
            'Other Assets',
            'Current Liabilities',
            'Other Liabilities'
        ].join(',');

        return [headers, ...rows].join('\n');
    } catch (error) {
        console.error("Error converting to CSV:", error);
        throw error;
    }
}
