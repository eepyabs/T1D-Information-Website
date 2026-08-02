// Fetch PubMed article data, parse XML, format data

import { XMLParser } from "fast-xml-parser";
import type { MedicalUpdate } from "./types";

const EUTILS =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});

/**
 * PubMed XML sometimes returns one object and sometimes an array.
 * This helper always converts the value into an array.
 */
function asArray<T>(
  value: T | T[] | undefined
): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

/**
 * Safely retrieves text from parsed PubMed XML values.
 */
function getText(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (
    value &&
    typeof value === "object" &&
    "#text" in value
  ) {
    return String(
      (value as { "#text": unknown })["#text"]
    );
  }

  return "";
}

/**
 * Adds optional NCBI identification information.
 */
function addNcbiInformation(
  params: URLSearchParams
): void {
  const tool = process.env.NCBI_TOOL;
  const email = process.env.NCBI_EMAIL;
  const apiKey = process.env.NCBI_API_KEY;

  if (tool) {
    params.set("tool", tool);
  }

  if (email) {
    params.set("email", email);
  }

  if (apiKey) {
    params.set("api_key", apiKey);
  }
}

/**
 * Converts PubMed's separate date fields into an ISO date string.
 */
function convertPubMedDate(
  articleDate: Record<string, unknown>,
  journalDate: Record<string, unknown>
): string | null {
  const year =
    getText(articleDate?.Year) ||
    getText(journalDate?.Year);

  const month =
    getText(articleDate?.Month) ||
    getText(journalDate?.Month);

  const day =
    getText(articleDate?.Day) ||
    getText(journalDate?.Day);

  if (!year) {
    return null;
  }

  let monthNumber = 1;

  if (/^\d+$/.test(month)) {
    monthNumber = Number(month);
  } else if (month) {
    const parsedMonth = new Date(
      `${month} 1, 2000`
    ).getMonth();

    if (parsedMonth >= 0) {
      monthNumber = parsedMonth + 1;
    }
  }

  const date = new Date(
    Date.UTC(
      Number(year),
      Math.max(monthNumber - 1, 0),
      Number(day) || 1
    )
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Retrieves recent Type 1 diabetes articles from PubMed.
 */
export async function getPubMedArticles(
  extraQuery: string,
  limit: number
): Promise<MedicalUpdate[]> {
  const typeOneDiabetesQuery =
    '("Diabetes Mellitus, Type 1"[MeSH Terms] OR "type 1 diabetes"[Title/Abstract])';

  const completeQuery = extraQuery
    ? `${typeOneDiabetesQuery} AND (${extraQuery})`
    : typeOneDiabetesQuery;

  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: completeQuery,
    retmode: "json",
    retmax: String(limit),
    sort: "pub date",
  });

  addNcbiInformation(searchParams);

  const searchResponse = await fetch(
    `${EUTILS}/esearch.fcgi?${searchParams.toString()}`
  );

  if (!searchResponse.ok) {
    throw new Error(
      `PubMed search failed with status ${searchResponse.status}.`
    );
  }

  const searchData =
    (await searchResponse.json()) as {
      esearchresult?: {
        idlist?: string[];
      };
    };

  const ids =
    searchData.esearchresult?.idlist ?? [];

  if (ids.length === 0) {
    return [];
  }

  const fetchParams = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "xml",
  });

  addNcbiInformation(fetchParams);

  const fetchResponse = await fetch(
    `${EUTILS}/efetch.fcgi?${fetchParams.toString()}`
  );

  if (!fetchResponse.ok) {
    throw new Error(
      `PubMed article retrieval failed with status ${fetchResponse.status}.`
    );
  }

  const xml = await fetchResponse.text();
  const parsed = parser.parse(xml);

  const articles = asArray(
    parsed?.PubmedArticleSet?.PubmedArticle
  );

  return articles.map((record: any) => {
    const citation =
      record?.MedlineCitation;

    const article =
      citation?.Article;

    const pmid =
      getText(citation?.PMID);

    const abstractParts = asArray(
      article?.Abstract?.AbstractText
    )
      .map((part: any) => {
        const label =
          part?.["@_Label"];

        const text =
          getText(part);

        if (!text) {
          return "";
        }

        return label
          ? `${label}: ${text}`
          : text;
      })
      .filter(Boolean);

    const authors = asArray(
      article?.AuthorList?.Author
    )
      .map((author: any) => {
        const firstName =
          getText(author?.ForeName);

        const lastName =
          getText(author?.LastName);

        return [firstName, lastName]
          .filter(Boolean)
          .join(" ");
      })
      .filter(Boolean);

    const journalDate =
      article?.Journal?.JournalIssue?.PubDate ??
      {};

    const articleDate =
      asArray(article?.ArticleDate)[0] ??
      {};

    return {
      id: pmid || crypto.randomUUID(),
      kind: "article" as const,
      source: "PubMed" as const,

      title:
        getText(article?.ArticleTitle) ||
        "Untitled PubMed article",

      summary:
        abstractParts.join(" ") || null,

      date: convertPubMedDate(
        articleDate,
        journalDate
      ),

      url: pmid
        ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
        : "https://pubmed.ncbi.nlm.nih.gov/",

      countries: [],
      status: null,
      authors,
    };
  });
}