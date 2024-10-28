"use server"

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod";

const AdditionalExpenseSchema = z.object({
    description: z.string(),
    amount: z.number(),
  });

const OptionalExpenseSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

const MeetingRoomTotalResponseSchema = z.object({
  total: z.number(),
});

const SleepingRoomTotalResponseSchema = z.object({
  total: z.number(),
});

const OptionalExpensesResponseSchema = z.object({
  expenses: z.array(OptionalExpenseSchema),
});

const AdditionalExpensesResponseSchema = z.object({
  expenses: z.array(AdditionalExpenseSchema),
});

const HotelQuoteAnalysisSchema = z.object({
  Total_Quote_With_Optional_Expenses: z.number(),
  Total_Quote_Without_Optional_Expenses: z.number(),
  Meeting_Room_Total: MeetingRoomTotalResponseSchema,
  Sleeping_Room_Total: SleepingRoomTotalResponseSchema,
  Additional_Expenses: z.array(AdditionalExpenseSchema),
  Optional_Expenses: z.array(OptionalExpenseSchema),
});

// expenses extraction
async function callOpenAIForExpenses<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
    const { object } = await generateObject({
        model: openai("gpt-4o"),
        prompt: prompt,
        schema: schema
    });
    return schema.parse(object); // Parse the generated text to ensure it matches the schema
}

// Extract optional expenses
async function extractOptionalExpenses(text: string): Promise<z.infer<typeof OptionalExpensesResponseSchema>> {
  const prompt = `
  You are an assistant tasked with extracting financial information from a PDF document containing hotel quotes. Your goal is to identify and extract all optional expenses.
  
  **Key Information to Extract**:
  - **Optional Expenses**: These are expenses labeled as 'Optional', 'Extra', 'Additional', or any similar term. 
    - Important: Taxes for Meeting Room and Sleeping Room are not included in the optional expenses, as they are already accounted for in the respective totals.
  
  **Formatting Guidelines**:
  - Ensure that all currency values are formatted correctly. For example:
    - Convert '1,000.00' to '1000.00'.
    - Convert '1.500,00' to '1500.00'.
  - Each optional expense should be listed on its own line in the 'Optional Expenses' section, with the tag '(Optional)' included in the description field.
  
  **Important Notes**:
  - If tax or VAT amounts are mentioned, include them in the calculation for their respective totals.
  
  **Extracted Text**:
  ${text}
  `;
  
    const response = await callOpenAIForExpenses(prompt, OptionalExpensesResponseSchema);    
    return response;
  }
  
  // Extract additional expenses
  async function extractAdditionalExpenses(text: string): Promise<z.infer<typeof AdditionalExpensesResponseSchema>> {
    const prompt = `
    You are an assistant responsible for extracting financial details from a PDF document containing hotel quotes. Your task is to identify and extract all additional expenses that are necessary.

    **Key Information to Extract**:
    - **Additional Expenses**: These are expenses that do not relate to Meeting Room or Sleeping Room prices but are essential costs. 
      - Important: Taxes for Meeting Room and Sleeping Room are not included in the additional expenses, as those are already accounted for in their respective totals.
      
    **Formatting Guidelines**:
    - Ensure that all currency values are formatted correctly. For example:
      - Convert '1,000.00' to '1000.00'.
      - Convert '1.500,00' to '1500.00'.
    - Each additional expense should be listed on its own line in the 'Additional Expenses' section.

    **Important Notes**:
    - Include tax or VAT amounts as part of their respective totals.
    - Do not extract any expenses labeled as 'Optional', 'Extra', 'Additional', or similar terms.

      **Extracted Text**:
      ${text}
    `;

    const response = await callOpenAIForExpenses(prompt, AdditionalExpensesResponseSchema);
    return response;
  }
  
  // Extract meeting room total
  async function extractMeetingRoomTotal(text: string): Promise<z.infer<typeof MeetingRoomTotalResponseSchema>> {
    const prompt = `
    You are an assistant that extracts financial information from PDF documents containing hotel quotes. Your task is to identify and extract the total cost associated with meeting rooms.
    
    **Key Information to Extract**:
    - Meeting Room Total: This is defined as the Meeting Room Rate multiplied by the number of days. If a per-person rate is provided, multiply that rate by the number of people to get the total.
    
    **Formatting Guidelines**:
    - Ensure that currency values are correctly formatted. For example:
      - Convert '1,000.00' to '1000.00'.
      - Convert '1.500,00' to '1500.00'.
    
    **Important Notes**:
    - If the number of nights is not specified, derive it from the provided dates.
    - Include any tax or VAT amounts in the total calculation.
    - If there are taxes on additional expenses, include those in the final amount.
    
    **Examples**:
    1. Input: "Meeting room rate is $200 per day for 3 days."
       Output: { total: 600 }
    
    2. Input: "Meeting room costs €1.200,00 for 2 nights, including VAT."
       Output: { total: 1200 }
    
    **Extracted Text**:
    ${text}
    `;    
    const response = await callOpenAIForExpenses(prompt, MeetingRoomTotalResponseSchema);
    return response;
  }
  
  // Extract sleeping room total  
  async function extractSleepingRoomTotal(text: string): Promise<z.infer<typeof SleepingRoomTotalResponseSchema>> {
    const prompt = `
    You are an assistant tasked with extracting financial information from a PDF document containing hotel quotes. Your goal is to identify and calculate the total cost associated with sleeping rooms.

    **Key Information to Extract**:
    - Sleeping Room Total: This is defined as the total sum of all sleeping room rates multiplied by the number of nights for each room. For example, if there are multiple room types, the calculation would be:
      Sleeping Room Total = (Room Rate 1 * Number of Nights * number of people) + (Room Rate 2 * Number of Nights * number of people) + ... + (Room Rate N * Number of Nights * number of people).

    **Formatting Guidelines**:
    - Ensure that currency values are formatted correctly. For instance:
      - Convert '1,000.00' to '1000.00'.
      - Convert '1.500,00' to '1500.00'.

    **Important Notes**:
    - If the number of nights is not explicitly stated, infer it from the provided dates.
    - Include any applicable tax or VAT amounts in the total calculation.
    - If there are taxes on additional expenses, ensure these are incorporated into the final amount.

    **Examples**:
    1. Input: "Sleeping room rate is $150 per night for 2 nights."
      Output: { total: 300 }

    2. Input: "Room rate of €200,00 for 3 nights, including VAT."
      Output: { total: 600 }

    3. Input: "Room rate of €200,00 for 3 nights. 40 rooms"
      Output: { total: 24000 }

    **Extracted Text**:
    ${text}
    `;
    const response = await callOpenAIForExpenses(prompt, SleepingRoomTotalResponseSchema);
    return response;
  }

  export async function analyzeTextWithGPT(text: string): Promise<z.infer<typeof HotelQuoteAnalysisSchema>> {
    console.log("Analyzing text with GPT");
    const optionalExpenses = await extractOptionalExpenses(text);
    console.log("Optional expenses:", optionalExpenses);
    const additionalExpenses = await extractAdditionalExpenses(text);
    const meetingRoomTotal = await extractMeetingRoomTotal(text);
    const sleepingRoomTotal = await extractSleepingRoomTotal(text);
    
    const additionalExpensesArray = AdditionalExpensesResponseSchema.parse(additionalExpenses).expenses; // Parse to get the array
    const totalWithoutOptional = meetingRoomTotal.total + sleepingRoomTotal.total + additionalExpensesArray.reduce((sum, exp) => sum + exp.amount, 0);
    const optionalExpensesArray = OptionalExpensesResponseSchema.parse(optionalExpenses).expenses; // Parse to get the array
    const totalWithOptional = totalWithoutOptional + optionalExpensesArray.reduce((sum, exp) => sum + exp.amount, 0);
    
    const result = {
      Total_Quote_With_Optional_Expenses: totalWithOptional,
      Total_Quote_Without_Optional_Expenses: totalWithoutOptional,
      Meeting_Room_Total: meetingRoomTotal,
      Sleeping_Room_Total: sleepingRoomTotal,
      Additional_Expenses: additionalExpensesArray, // Use the parsed array
      Optional_Expenses: optionalExpensesArray, // Use the parsed array
    };
    return HotelQuoteAnalysisSchema.parse(result);
  }

  export async function jsonToCsv(analysis: ReturnType<typeof analyzeTextWithGPT>): Promise<string> {
    // Convert the structured output to a plain object
    const data = await analysis; // Ensure you await the promise
    const totalQuoteWithOptionalExpenses = data.Total_Quote_With_Optional_Expenses;
    const totalQuoteWithoutOptionalExpenses = data.Total_Quote_Without_Optional_Expenses;
    const meetingRoomTotal = data.Meeting_Room_Total.total;
    const sleepingRoomTotal = data.Sleeping_Room_Total.total;
  
    // Prepare CSV headers
    const headers = [
      "Total Quote with Optional Expenses",
      "Total Quote without Optional Expenses",
      "Meeting Room Total",
      "Sleeping Room Total"
    ];
  
    // Add additional expenses headers
    const additionalExpenses = data.Additional_Expenses || []; // Access the property after resolution
    additionalExpenses.forEach((_, i) => {
      headers.push(`Additional Expense ${i+1} Description`);
      headers.push(`Additional Expense ${i+1} Amount`);
    });
  
    // Add optional expenses headers
    const optionalExpenses = data.Optional_Expenses || [];
    optionalExpenses.forEach((_, i) => {
      headers.push(`Optional Expense ${i+1} Description`);
      headers.push(`Optional Expense ${i+1} Amount`);
    });
  
    // Prepare CSV data
    const csvData = [
      totalQuoteWithOptionalExpenses.toString(),
      totalQuoteWithoutOptionalExpenses.toString(),
      meetingRoomTotal.toString(),
      sleepingRoomTotal.toString()
    ];
  
    // Add additional expenses data
    additionalExpenses.forEach(expense => {
      console.log(expense.description)
      console.log(expense.amount)
      csvData.push(expense.description.toString());
      csvData.push(expense.amount.toString()); // Convert amount to a number, default to 0 if conversion fails
    });
  
    // Add optional expenses data
    optionalExpenses.forEach(expense => {
      console.log(expense.description)
      console.log(expense.amount)
      csvData.push(expense.description.toString());
      csvData.push(expense.amount.toString()); // Convert amount to a number, default to 0 if conversion fails
    });
  
    // Create CSV content
    const csvContent = [
      headers.join(','),
      csvData.join(',')
    ].join('\n');
    // Write to CSV file
    return csvContent
  }