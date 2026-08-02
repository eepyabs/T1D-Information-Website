// Define shape of data

export type MedicalUpdate = {
    id: string;
    kind: "article" | "trial";
    source: "PubMed" | "ClinicalTrials.gov";
    title: string;
    summary: string | null;
    date: string | null;
    url: string;
    countries: string[];
    status: string | null;
    authors: string[];
};

export type UpdatesResponse = {
    updates: MedicalUpdate[];
    errors: string[];
    generatedAt: string;
};