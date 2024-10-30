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

// Extraction
async function analyzeIncomeStatement<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    try {
        const { object } = await generateObject({
            model: openai("gpt-4o"),
            prompt: prompt,
            schema: schema
        });
        return schema.parse(object);
    } catch (error) {
        console.error("Error analyzing statement:", error);
        throw error;
    }
}

function chunkText(text: string, maxTokens: number = 23000): string {
    const chunkSize = maxTokens * 4;
    return text.slice(0, chunkSize);
}

async function extractMetrics(text: string): Promise<z.infer<typeof BalanceSheetData>> {
    const chunk = chunkText(text);
    const prompt = `
      You are an assistant tasked with extracting financial information from a 10-Q Report section.
      Extract all financial metrics you can find in this section.
      If you don't find a specific value, return 0.

      ${chunk}
    `;
    
    try {
        const result = await analyzeIncomeStatement(prompt, BalanceSheetData);
        return result;
    } catch (error) {
        console.error("Error processing chunk:", error);
        throw new Error("Failed to extract metrics");
    }
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
