import React, { useEffect, useMemo, useRef, useState } from "react";
import DentalChart from "../DentalChart";
import {
  CLINICAL_TYPES,
  clinicalCatalog,
  searchClinicalItems,
} from "./clinicalCatalog";
import "./VisitDiagnosis.css";

const STORAGE_PREFIX = "medical.visit.diagnosis.";

const SECTION_META = {
  [CLINICAL_TYPES.DIAGNOSIS]: {
    title: "Diagnoses",
    icon: "D",
  },
  [CLINICAL_TYPES.SYMPTOM]: {
    title: "Symptoms",
    icon: "S",
  },
  [CLINICAL_TYPES.SIGN]: {
    title: "Clinical signs",
    icon: "C",
  },
  [CLINICAL_TYPES.CHRONIC_CONDITION]: {
    title: "Chronic conditions",
    icon: "H",
  },
};

const emptyDraft = (visitId) => ({
  visitId,
  diagnoses: [],
  symptoms: [],
  signs: [],
  chronicConditions: [],
  updatedAt: null,
});

function getBucket(type) {
  switch (type) {
    case CLINICAL_TYPES.DIAGNOSIS:
      return "diagnoses";

    case CLINICAL_TYPES.SYMPTOM:
      return "symptoms";

    case CLINICAL_TYPES.SIGN:
      return "signs";

    case CLINICAL_TYPES.CHRONIC_CONDITION:
      return "chronicConditions";

    default:
      return null;
  }
}

function createClinicalEntry(item) {
  return {
    id: `${item.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,

    clinicalItemId: item.id,

    type: item.type,

    codeSystem: item.codeSystem,
    code: item.code,

    nameEn: item.nameEn,
    nameAr: item.nameAr,

    role:
      item.type === CLINICAL_TYPES.DIAGNOSIS
        ? "SECONDARY"
        : null,

    certainty:
      item.type === CLINICAL_TYPES.DIAGNOSIS
        ? "CONFIRMED"
        : null,

    affectedTeeth: [],

    notes: "",
  };
}

export default function VisitDiagnosis({
  visitId,
  patient,
  initialDraft,

  numberingSystem = "FDI",
  onNumberingSystemChange,

  onAutoSave,
  onContinueToServices,

  readOnly = false,
}) {
  const [draft, setDraft] = useState(
    initialDraft || emptyDraft(visitId)
  );

  const [query, setQuery] = useState("");

  const [activeType, setActiveType] = useState(
    CLINICAL_TYPES.DIAGNOSIS
  );

  const [selectedDiagnosisId, setSelectedDiagnosisId] =
    useState(null);

  const [chartOpen, setChartOpen] = useState(false);

  const [saveStatus, setSaveStatus] = useState("saved");

  const [recentItems, setRecentItems] = useState([]);

  const saveTimerRef = useRef(null);
  const latestDraftRef = useRef(draft);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  /*
   * Load existing visit draft.
   *
   * Priority:
   * 1. initialDraft from parent
   * 2. localStorage recovery
   * 3. empty draft
   */
  useEffect(() => {
    let recoveredDraft = null;

    if (initialDraft) {
      recoveredDraft = initialDraft;
    } else {
      try {
        const stored = localStorage.getItem(
          STORAGE_PREFIX + visitId
        );

        if (stored) {
          recoveredDraft = JSON.parse(stored);
        }
      } catch {
        recoveredDraft = null;
      }
    }

    if (recoveredDraft) {
      setDraft(recoveredDraft);
      latestDraftRef.current = recoveredDraft;
    }

    try {
      const storedRecent = localStorage.getItem(
        "medical.clinical.recent"
      );

      if (storedRecent) {
        setRecentItems(JSON.parse(storedRecent));
      }
    } catch {
      setRecentItems([]);
    }
  }, [visitId, initialDraft]);

  /*
   * Final persistence.
   */
  const persistDraft = async (
    draftToSave = latestDraftRef.current
  ) => {
    const payload = {
      ...draftToSave,
      updatedAt: new Date().toISOString(),
    };

    latestDraftRef.current = payload;

    setSaveStatus("saving");

    /*
     * Local recovery is immediate.
     * This protects the physician from losing entered data.
     */
    try {
      localStorage.setItem(
        STORAGE_PREFIX + visitId,
        JSON.stringify(payload)
      );
    } catch {
      // Local storage failure should not block the visit.
    }

    try {
      if (onAutoSave) {
        await onAutoSave(payload);
      }

      setDraft(payload);
      setSaveStatus("saved");
    } catch {
      /*
       * The local draft remains available even
       * if the backend is temporarily unavailable.
       */
      setSaveStatus("offline");
    }

    return payload;
  };

  /*
   * Debounced autosave.
   */
  const scheduleSave = (nextDraft) => {
    if (readOnly) {
      return;
    }

    setDraft(nextDraft);
    latestDraftRef.current = nextDraft;
    setSaveStatus("saving");

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      persistDraft(nextDraft);
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  /*
   * Search results.
   */
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return searchClinicalItems(
      query,
      activeType,
      12
    );
  }, [query, activeType]);

  /*
   * Default catalog items when search is empty.
   */
  const defaultItems = useMemo(() => {
    return clinicalCatalog
      .filter((item) => item.type === activeType)
      .slice(0, 8);
  }, [activeType]);

  /*
   * Currently selected diagnosis.
   */
  const selectedDiagnosis = useMemo(() => {
    return (
      draft.diagnoses.find(
        (item) => item.id === selectedDiagnosisId
      ) || null
    );
  }, [draft.diagnoses, selectedDiagnosisId]);

  /*
   * Add a clinical item.
   */
  const addClinicalItem = (item) => {
    if (readOnly) {
      return;
    }

    const bucket = getBucket(item.type);

    if (!bucket) {
      return;
    }

    /*
     * Do not allow duplicate clinical items
     * inside the same visit.
     */
    const alreadyExists = draft[bucket].some(
      (entry) => entry.clinicalItemId === item.id
    );

    if (alreadyExists) {
      const existingEntry = draft[bucket].find(
        (entry) => entry.clinicalItemId === item.id
      );

      if (
        item.type === CLINICAL_TYPES.DIAGNOSIS &&
        existingEntry
      ) {
        setSelectedDiagnosisId(existingEntry.id);
      }

      setQuery("");
      return;
    }

    const entry = createClinicalEntry(item);

    const nextDraft = {
      ...draft,
      [bucket]: [
        ...draft[bucket],
        entry,
      ],
    };

    scheduleSave(nextDraft);

    if (item.type === CLINICAL_TYPES.DIAGNOSIS) {
      setSelectedDiagnosisId(entry.id);
    }

    /*
     * Maintain recent clinical items.
     */
    const nextRecent = [
      item.id,
      ...recentItems.filter(
        (id) => id !== item.id
      ),
    ].slice(0, 20);

    setRecentItems(nextRecent);

    try {
      localStorage.setItem(
        "medical.clinical.recent",
        JSON.stringify(nextRecent)
      );
    } catch {
      // Non-blocking.
    }

    setQuery("");
  };

  /*
   * Remove item from visit.
   */
  const removeClinicalItem = (
    bucket,
    entryId
  ) => {
    if (readOnly) {
      return;
    }

    const nextDraft = {
      ...draft,
      [bucket]: draft[bucket].filter(
        (entry) => entry.id !== entryId
      ),
    };

    scheduleSave(nextDraft);

    if (entryId === selectedDiagnosisId) {
      setSelectedDiagnosisId(null);
    }
  };

  /*
   * Update selected diagnosis.
   */
  const updateSelectedDiagnosis = (
    changes
  ) => {
    if (
      readOnly ||
      !selectedDiagnosis
    ) {
      return;
    }

    const nextDraft = {
      ...draft,

      diagnoses: draft.diagnoses.map(
        (entry) =>
          entry.id === selectedDiagnosis.id
            ? {
                ...entry,
                ...changes,
              }
            : entry
      ),
    };

    scheduleSave(nextDraft);
  };

  /*
   * Dental chart result.
   *
   * We intentionally store stable tooth IDs.
   * The displayed numbering can change independently.
   */
  const handleDentalChartSave = (
    teeth
  ) => {
    if (
      !selectedDiagnosis ||
      readOnly
    ) {
      return;
    }

    const affectedTeeth = teeth.map(
      (tooth) => ({
        toothId: tooth.id,

        /*
         * label is only a display snapshot.
         * toothId remains the source of identity.
         */
        label: tooth.label,

        dentition: tooth.dentition,
        arch: tooth.arch,
        side: tooth.side,
      })
    );

    updateSelectedDiagnosis({
      affectedTeeth,
    });

    setChartOpen(false);
  };

  /*
   * Continue to services.
   *
   * Before navigation we ALWAYS flush the latest
   * draft so no recent change is lost.
   */
  const handleContinueToServices =
    async () => {
      const savedDraft =
        await persistDraft(
          latestDraftRef.current
        );

      if (onContinueToServices) {
        onContinueToServices(
          savedDraft
        );
      }
    };

  const renderSaveStatus = () => {
    if (saveStatus === "saving") {
      return (
        <div className="vd-save saving">
          <i />
          Saving…
        </div>
      );
    }

    if (saveStatus === "offline") {
      return (
        <div className="vd-save offline">
          <i />
          Offline draft saved
        </div>
      );
    }

    return (
      <div className="vd-save saved">
        <i />
        Saved
      </div>
    );
  };

  const renderClinicalSection = (
    title,
    bucket
  ) => {
    const items = draft[bucket] || [];

    return (
      <section
        className="vd-card"
        key={bucket}
      >
        <div className="vd-card-head">
          <h3>{title}</h3>

          <span>
            {items.length}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="vd-empty">
            None selected.
          </div>
        ) : (
          items.map((entry) => (
            <div
              className={
                "vd-item " +
                (entry.id ===
                selectedDiagnosisId
                  ? "selected"
                  : "")
              }
              key={entry.id}
              onClick={() => {
                if (
                  entry.type ===
                  CLINICAL_TYPES.DIAGNOSIS
                ) {
                  setSelectedDiagnosisId(
                    entry.id
                  );
                }
              }}
            >
              <div>
                <strong>
                  {entry.nameEn}
                </strong>

                <small>
                  {entry.code} ·{" "}
                  {entry.nameAr}
                </small>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();

                    removeClinicalItem(
                      bucket,
                      entry.id
                    );
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </section>
    );
  };

  const currentItems = query
    ? searchResults
    : defaultItems;

  return (
    <div className="vd-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="vd-header">

        <div>
          <div className="vd-kicker">
            OPEN VISIT
          </div>

          <h1>
            Diagnosis &amp;
            clinical findings
          </h1>

          <p>
            {patient?.name ||
              "Patient"}{" "}
            · Visit {visitId}
          </p>
        </div>

        {renderSaveStatus()}
      </header>

      {/* =========================
          VISIT STEPS
      ========================== */}

      <nav className="vd-steps">

        {[
          "Visit",
          "Diagnosis",
          "Services",
          "Orders",
          "Summary",
        ].map((step, index) => (
          <div
            className={
              "vd-step " +
              (index < 2
                ? "active"
                : "")
            }
            key={step}
          >
            <b>
              {index + 1}
            </b>

            {step}
          </div>
        ))}

      </nav>

      {/* =========================
          MAIN
      ========================== */}

      <main className="vd-layout">

        {/* =========================
            SEARCH PANEL
        ========================== */}

        <aside className="vd-search-panel">

          <h2>
            Clinical search
          </h2>

          <p>
            Search by Arabic name,
            English name, synonym or
            clinical code.
          </p>

          <div className="vd-search">

            <span>
              ⌕
            </span>

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="e.g. K02.9, caries, تسوس…"
            />

            {query && (
              <button
                type="button"
                onClick={() =>
                  setQuery("")
                }
              >
                ×
              </button>
            )}
          </div>

          {/* =====================
              TYPE FILTER
          ====================== */}

          <div className="vd-tabs">

            {Object.entries(
              SECTION_META
            ).map(
              ([type, meta]) => (
                <button
                  type="button"
                  className={
                    activeType ===
                    type
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setActiveType(
                      type
                    );
                    setQuery("");
                  }}
                  key={type}
                >
                  {meta.title}
                </button>
              )
            )}

          </div>

          <div className="vd-section-title">
            {query
              ? "Search results"
              : "Clinical catalog"}
          </div>

          {/* =====================
              SEARCH RESULTS
          ====================== */}

          {currentItems.map(
            (item) => (
              <button
                type="button"
                className="vd-result"
                onClick={() =>
                  addClinicalItem(
                    item
                  )
                }
                key={item.id}
              >
                <span>
                  {
                    SECTION_META[
                      item.type
                    ].icon
                  }
                </span>

                <strong>
                  {item.nameEn}

                  <small>
                    {item.nameAr}
                  </small>
                </strong>

                <em>
                  {item.code}
                </em>
              </button>
            )
          )}

          {query &&
            currentItems.length ===
              0 && (
              <div className="vd-empty">
                No matching clinical
                item.
              </div>
            )}

        </aside>

        {/* =========================
            WORKSPACE
        ========================== */}

        <section className="vd-workspace">

          <h2>
            Selected clinical data
          </h2>

          <p>
            Changes are protected
            automatically.
          </p>

          {/* =====================
              SELECTED ITEMS
          ====================== */}

          <div className="vd-grid">

            {renderClinicalSection(
              "Diagnoses",
              "diagnoses"
            )}

            {renderClinicalSection(
              "Symptoms",
              "symptoms"
            )}

            {renderClinicalSection(
              "Clinical signs",
              "signs"
            )}

            {renderClinicalSection(
              "Chronic conditions",
              "chronicConditions"
            )}

          </div>

          {/* =========================
              DIAGNOSIS DETAILS
          ========================== */}

          {selectedDiagnosis && (
            <section className="vd-detail">

              <div className="vd-detail-head">

                <div>

                  <label>
                    DIAGNOSIS DETAILS
                  </label>

                  <h3>
                    {
                      selectedDiagnosis.nameEn
                    }
                  </h3>

                  <p>
                    {
                      selectedDiagnosis
                        .codeSystem
                    }{" "}
                    ·{" "}
                    {
                      selectedDiagnosis.code
                    }{" "}
                    ·{" "}
                    {
                      selectedDiagnosis
                        .nameAr
                    }
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setChartOpen(true)
                  }
                >
                  {selectedDiagnosis
                    .affectedTeeth
                    ?.length
                    ? "Edit teeth"
                    : "Select teeth"}
                </button>

              </div>

              {/* =====================
                  DIAGNOSIS ATTRIBUTES
              ====================== */}

              <div className="vd-fields">

                <label>

                  <span>
                    Diagnosis role
                  </span>

                  <select
                    value={
                      selectedDiagnosis.role
                    }
                    onChange={(event) =>
                      updateSelectedDiagnosis(
                        {
                          role:
                            event.target
                              .value,
                        }
                      )
                    }
                  >
                    <option value="PRIMARY">
                      Primary
                    </option>

                    <option value="SECONDARY">
                      Secondary
                    </option>
                  </select>

                </label>

                <label>

                  <span>
                    Clinical certainty
                  </span>

                  <select
                    value={
                      selectedDiagnosis.certainty
                    }
                    onChange={(event) =>
                      updateSelectedDiagnosis(
                        {
                          certainty:
                            event.target
                              .value,
                        }
                      )
                    }
                  >
                    <option value="SUSPECTED">
                      Suspected
                    </option>

                    <option value="PROVISIONAL">
                      Provisional
                    </option>

                    <option value="CONFIRMED">
                      Confirmed
                    </option>
                  </select>

                </label>

              </div>

              {/* =====================
                  ASSOCIATED TEETH
              ====================== */}

              <div className="vd-teeth">

                <label>
                  Associated teeth
                </label>

                <div>

                  {selectedDiagnosis
                    .affectedTeeth
                    ?.length ? (
                    selectedDiagnosis.affectedTeeth.map(
                      (tooth) => (
                        <span
                          key={
                            tooth.toothId
                          }
                        >
                          {tooth.label}
                        </span>
                      )
                    )
                  ) : (
                    <small>
                      No teeth linked.
                    </small>
                  )}

                </div>

              </div>

              {/* =====================
                  NOTES
              ====================== */}

              <label className="vd-notes">

                <span>
                  Clinical note
                </span>

                <textarea
                  value={
                    selectedDiagnosis.notes
                  }
                  onChange={(event) =>
                    updateSelectedDiagnosis(
                      {
                        notes:
                          event.target
                            .value,
                      }
                    )
                  }
                  placeholder="Add relevant clinical findings, observations or notes..."
                />

              </label>

            </section>
          )}

        </section>

      </main>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="vd-footer">

        {renderSaveStatus()}

        <button
          type="button"
          onClick={
            handleContinueToServices
          }
        >
          Continue to Services →
        </button>

      </footer>

      {/* =========================
          DENTAL CHART
      ========================== */}

      {chartOpen && (
        <DentalChart
          open={chartOpen}

          title={
            `Select teeth · ${
              selectedDiagnosis?.nameEn ||
              "Diagnosis"
            }`
          }

          initialSelectedIds={
            selectedDiagnosis
              ?.affectedTeeth
              ?.map(
                (tooth) =>
                  tooth.toothId
              ) || []
          }

          numberingSystem={
            numberingSystem
          }

          onNumberingSystemChange={
            onNumberingSystemChange
          }

          onClose={() =>
            setChartOpen(false)
          }

          onSave={
            handleDentalChartSave
          }
        />
      )}

    </div>
  );
}