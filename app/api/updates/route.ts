// Create API endpoint

import { NextRequest, NextResponse } from "next/server";

import { getClinicalTrials } from "../../../lib/clinicalTrials";
import { getPubMedArticles } from "../../../lib/pubmed";

import type {
  MedicalUpdate,
  UpdatesResponse,
} from "../../../lib/types";

// Run API route with Node.js
export const runtime = "nodejs";

// Create GET endpoint (updates)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const query =
    searchParams.get("q")?.trim() ?? "";

  const source =
    searchParams.get("source") ?? "all";

  const requestedLimit = Number(
    searchParams.get("limit") ?? 15
  );

  const limit = Math.min(
    Math.max(requestedLimit, 1),
    30
  );

  const requests: Promise<MedicalUpdate[]>[] = [];

  if (
    source === "all" ||
    source === "PubMed"
  ) {
    requests.push(
      getPubMedArticles(query, limit)
    );
  }

  if (
    source === "all" ||
    source === "ClinicalTrials.gov"
  ) {
    requests.push(
      getClinicalTrials(query, limit)
    );
  }

  try {
    const results =
      await Promise.allSettled(requests);

    const updates = results.flatMap(
      (result) => {
        if (result.status === "fulfilled") {
          return result.value;
        }

        return [];
      }
    );

    const errors = results
      .filter(
        (
          result
        ): result is PromiseRejectedResult =>
          result.status === "rejected"
      )
      .map((result) => {
        if (result.reason instanceof Error) {
          return result.reason.message;
        }

        return "A medical data source failed.";
      });

    updates.sort((first, second) => {
      const firstTime = first.date
        ? new Date(first.date).getTime()
        : 0;

      const secondTime = second.date
        ? new Date(second.date).getTime()
        : 0;

      return secondTime - firstTime;
    });

    const response: UpdatesResponse = {
      updates,
      errors,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error(error);

    const response: UpdatesResponse = {
      updates: [],
      errors: [
        "The update service is temporarily unavailable.",
      ],
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: 500,
    });
  }
}