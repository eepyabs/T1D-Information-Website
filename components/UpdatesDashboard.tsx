// Interactive aspects of front page

"use client"; // Let's Next.js know to run in browser

import {
  FormEvent,
  useEffect, 
  useMemo,
  useState,
} from "react";

import type {
  MedicalUpdate,
  UpdatesResponse,
} from "@/lib/types";

// List of filters for type of resource
const sourceOptions = [
  "all",
  "PubMed",
  "ClinicalTrials.gov",
] as const;

// Only allows list of filters
type SourceOption =
  (typeof sourceOptions)[number];

// Format date
function formatDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

// Create and export UpdatesDashboard
export default function UpdatesDashboard() {
  // Store updates, change update list
  const [updates, setUpdates] = useState<
    MedicalUpdate[]
  >([]);

  // Store current search
  const [searchInput, setSearchInput] =
    useState("");

  // Store submitted search
  const [searchQuery, setSearchQuery] =
    useState("");

  // Store selected source filter (default = all)
  const [source, setSource] =
    useState<SourceOption>("all");

  // Store selected country filter (default = all)
  const [country, setCountry] =
    useState("all");

  // Store API error messages
  const [errors, setErrors] = useState<
    string[]
  >([]);

  // Store time of API generated results
  const [generatedAt, setGeneratedAt] =
    useState("");

  // Tracks if app is currently fetching data (default = true)
  const [loading, setLoading] =
    useState(true);

  // Fetch data instructions
  useEffect(() => {
    const controller = new AbortController();

    async function loadUpdates() {
      setLoading(true);
      setErrors([]);

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          source,
          limit: "15",
        });

        const response = await fetch(
          `/api/updates?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "The server could not load medical updates."
          );
        }

        const data =
          (await response.json()) as UpdatesResponse;

        setUpdates(data.updates);
        setErrors(data.errors);
        setGeneratedAt(data.generatedAt);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setUpdates([]);

        setErrors([
          error instanceof Error
            ? error.message
            : "Something went wrong.",
        ]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadUpdates();

    return () => {
      controller.abort();
    };
  }, [searchQuery, source]);

  const countries = useMemo(() => {
    const countrySet = new Set(
      updates
        .flatMap((update) => update.countries)
        .filter(Boolean)
    );

    return [...countrySet].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [updates]);

  // Chooses what updates to show
  const visibleUpdates = useMemo(() => {
    if (country === "all") {
      return updates;
    }

    return updates.filter((update) =>
      update.countries.includes(country)
    );
  }, [country, updates]);

  function handleSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setCountry("all");
    setSearchQuery(searchInput.trim());
  }

  // Indepth page format
  return (
    <section className="dashboard">
      <form
        className="controls"
        onSubmit={handleSearch}
      >
        <label className="search-field">
          <span>Search updates</span>

          <div className="search-row">
            <input
              type="search"
              value={searchInput}
              onChange={(event) =>
                setSearchInput(event.target.value)
              }
              placeholder="Insulin pump, immunotherapy, children..."
            />

            <button type="submit">
              Search
            </button>
          </div>
        </label>

        <label>
          <span>Source</span>

          <select
            value={source}
            onChange={(event) => {
              setCountry("all");

              setSource(
                event.target
                  .value as SourceOption
              );
            }}
          >
            <option value="all">
              All sources
            </option>

            <option value="PubMed">
              PubMed research
            </option>

            <option value="ClinicalTrials.gov">
              Clinical trials
            </option>
          </select>
        </label>

        <label>
          <span>Country</span>

          <select
            value={country}
            onChange={(event) =>
              setCountry(event.target.value)
            }
          >
            <option value="all">
              All countries
            </option>

            {countries.map((item) => (
              <option
                value={item}
                key={item}
              >
                {item}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="results-heading">
        <div>
          <h2>Latest updates</h2>

          <p>
            {loading
              ? "Checking trusted medical databases..."
              : `${visibleUpdates.length} update${
                  visibleUpdates.length === 1
                    ? ""
                    : "s"
                } shown`}
          </p>
        </div>

        {generatedAt && !loading ? (
          <small>
            Checked {formatDate(generatedAt)}
          </small>
        ) : null}
      </div>

      {errors.length > 0 ? (
        <div
          className="warning"
          role="status"
        >
          <strong>
            Some information could not be loaded.
          </strong>

          {errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div
          className="card-grid"
          aria-busy="true"
        >
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              className="card skeleton"
              key={index}
            />
          ))}
        </div>
      ) : visibleUpdates.length > 0 ? (
        <div className="card-grid">
          {visibleUpdates.map((update) => (
            <article
              className="card"
              key={`${update.source}-${update.id}`}
            >
              <div className="card-topline">
                <span
                  className={`badge ${update.kind}`}
                >
                  {update.kind === "trial"
                    ? "Clinical trial"
                    : "Research"}
                </span>

                <span>
                  {formatDate(update.date)}
                </span>
              </div>

              <h3>{update.title}</h3>

              <p className="summary">
                {update.summary ||
                  "No summary was supplied by the source."}
              </p>

              <dl>
                <div>
                  <dt>Source</dt>
                  <dd>{update.source}</dd>
                </div>

                {update.status ? (
                  <div>
                    <dt>Status</dt>

                    <dd>
                      {update.status.replaceAll(
                        "_",
                        " "
                      )}
                    </dd>
                  </div>
                ) : null}

                {update.countries.length > 0 ? (
                  <div>
                    <dt>Locations</dt>

                    <dd>
                      {update.countries
                        .slice(0, 4)
                        .join(", ")}
                    </dd>
                  </div>
                ) : null}

                {update.authors.length > 0 ? (
                  <div>
                    <dt>Authors</dt>

                    <dd>
                      {update.authors
                        .slice(0, 3)
                        .join(", ")}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <a
                className="source-link"
                href={update.url}
                target="_blank"
                rel="noreferrer"
              >
                Read the original source
                <span aria-hidden="true">
                  {" "}↗
                </span>
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No matching updates</h3>

          <p>
            Try a broader search or choose
            another source or country.
          </p>
        </div>
      )}
    </section>
  );
}