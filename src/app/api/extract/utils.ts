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

function chunkText(text: string, maxTokens: number = 12500): string[] {
    const chunkSize = maxTokens * 4;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    
    return chunks;
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
                combinedResults = mergeResults(combinedResults, chunkResult);
            }
            // avoid rate limits
            await delay(2000); 
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
        currentAssets: {
            ...existing.currentAssets,
            cashAndEquivalents: newData.currentAssets.cashAndEquivalents || existing.currentAssets.cashAndEquivalents,
            marketableSecurities: newData.currentAssets.marketableSecurities || existing.currentAssets.marketableSecurities,
            inventories: newData.currentAssets.inventories || existing.currentAssets.inventories,
            accountsReceivable: newData.currentAssets.accountsReceivable || existing.currentAssets.accountsReceivable,
            totalCurrentAssets: newData.currentAssets.totalCurrentAssets || existing.currentAssets.totalCurrentAssets,
        },
        nonCurrentAssets: {
            ...existing.nonCurrentAssets,
            propertyAndEquipment: newData.nonCurrentAssets.propertyAndEquipment || existing.nonCurrentAssets.propertyAndEquipment,
            operatingLeases: newData.nonCurrentAssets.operatingLeases || existing.nonCurrentAssets.operatingLeases,
            goodwill: newData.nonCurrentAssets.goodwill || existing.nonCurrentAssets.goodwill,
            otherAssets: newData.nonCurrentAssets.otherAssets || existing.nonCurrentAssets.otherAssets,
        },
        currentLiabilities: {
            ...existing.currentLiabilities,
            accountsPayable: newData.currentLiabilities.accountsPayable || existing.currentLiabilities.accountsPayable,
            accruedExpenses: newData.currentLiabilities.accruedExpenses || existing.currentLiabilities.accruedExpenses,
            unearnedRevenue: newData.currentLiabilities.unearnedRevenue || existing.currentLiabilities.unearnedRevenue,
            totalCurrentLiabilities: newData.currentLiabilities.totalCurrentLiabilities || existing.currentLiabilities.totalCurrentLiabilities,
        },
        nonCurrentLiabilities: {
            ...existing.nonCurrentLiabilities,
            longTermLeases: newData.nonCurrentLiabilities.longTermLeases || existing.nonCurrentLiabilities.longTermLeases,
            longTermDebt: newData.nonCurrentLiabilities.longTermDebt || existing.nonCurrentLiabilities.longTermDebt,
            otherLongTermLiabilities: newData.nonCurrentLiabilities.otherLongTermLiabilities || existing.nonCurrentLiabilities.otherLongTermLiabilities,
        },
        stockholdersEquity: {
            ...existing.stockholdersEquity,
            commonStock: {
                ...existing.stockholdersEquity.commonStock,
                value: newData.stockholdersEquity.commonStock.value || existing.stockholdersEquity.commonStock.value,
                sharesIssued: newData.stockholdersEquity.commonStock.sharesIssued || existing.stockholdersEquity.commonStock.sharesIssued,
                sharesOutstanding: newData.stockholdersEquity.commonStock.sharesOutstanding || existing.stockholdersEquity.commonStock.sharesOutstanding,
            },
            treasuryStock: newData.stockholdersEquity.treasuryStock || existing.stockholdersEquity.treasuryStock,
            additionalPaidInCapital: newData.stockholdersEquity.additionalPaidInCapital || existing.stockholdersEquity.additionalPaidInCapital,
            accumulatedOtherComprehensiveIncome: newData.stockholdersEquity.accumulatedOtherComprehensiveIncome || existing.stockholdersEquity.accumulatedOtherComprehensiveIncome,
            retainedEarnings: newData.stockholdersEquity.retainedEarnings || existing.stockholdersEquity.retainedEarnings,
            totalStockholdersEquity: newData.stockholdersEquity.totalStockholdersEquity || existing.stockholdersEquity.totalStockholdersEquity,
        },
        totalAssets: newData.totalAssets || existing.totalAssets,
        totalLiabilitiesAndEquity: newData.totalLiabilitiesAndEquity || existing.totalLiabilitiesAndEquity,
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
