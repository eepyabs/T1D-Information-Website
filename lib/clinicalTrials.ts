// Fetch data from ClinicalTrials.gov, filter out T2D results, format data

import type { MedicalUpdate } from "./types";

type ClinicalTrialStudy = {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
      officialTitle?: string;
    };

    descriptionModule?: {
      briefSummary?: string;
    };

    statusModule?: {
      overallStatus?: string;

      studyFirstPostDateStruct?: {
        date?: string;
      };

      lastUpdatePostDateStruct?: {
        date?: string;
      };
    };

    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
      }>;
    };
  };
};

function isT1DStudy(title: string, summary: string | null): boolean {
  const text = `${title} ${summary ?? ""}`.toLowerCase();

  const mentionsType1 =
    text.includes("type 1 diabetes") ||
    text.includes("type i diabetes") ||
    text.includes("t1d") ||
    text.includes("insulin-dependent diabetes");

  const clearlyType2 =
    text.includes("type 2 diabetes") ||
    text.includes("type ii diabetes") ||
    text.includes("t2d");

  return mentionsType1 && !clearlyType2;
}

export async function getClinicalTrials(
  extraQuery: string,
  limit: number
): Promise<MedicalUpdate[]> {
  const searchTerm = extraQuery
    ? `"Type 1 Diabetes" ${extraQuery}`
    : `"Type 1 Diabetes"`;

  const params = new URLSearchParams({
    "query.cond": searchTerm,
    format: "json",
    pageSize: String(limit),
    sort: "LastUpdatePostDate:desc",
    countTotal: "true",
  });

  const response = await fetch(
    `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `ClinicalTrials.gov request failed with status ${response.status}.`
    );
  }

  const data = (await response.json()) as {
    studies?: ClinicalTrialStudy[];
  };

  return (data.studies ?? []).map((study) => {
    const protocol = study.protocolSection;

    const identification = protocol?.identificationModule;

    const description = protocol?.descriptionModule;

    const status = protocol?.statusModule;

    const locations = protocol?.contactsLocationsModule?.locations ?? [];

    const nctId = identification?.nctId ?? "unknown-study";

    const title = 
      identification?.briefTitle ??
      identification?.officialTitle ??
      "Untitled clinical study";

    const summary = description?.briefSummary ?? null;

    const countries = [
      ...new Set(
        locations
          .map((location) =>
            location.country?.trim()
          )
          .filter(
            (country): country is string =>
              Boolean(country)
          )
      ),
    ].sort();

    return {
      id: nctId,
      kind: "trial" as const,
      source: "ClinicalTrials.gov" as const,

      title,

      summary,

      date:
        status?.lastUpdatePostDateStruct?.date ??
        status?.studyFirstPostDateStruct?.date ??
        null,

      url: `https://clinicaltrials.gov/study/${nctId}`,

      countries,

      status:
        status?.overallStatus ?? null,

      authors: [] as string[],
    };
  })
  .filter((study) =>
    isT1DStudy(study.title, study.summary)
  );
}