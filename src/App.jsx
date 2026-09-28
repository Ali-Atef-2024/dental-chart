import { useState } from "react";
import "./index.css";

import VisitDiagnosis from "./visit/VisitDiagnosis";

export default function App() {
  const [visitStarted, setVisitStarted] = useState(false);

  const [numberingSystem, setNumberingSystem] =
    useState("FDI");

  const [visitId] = useState(
    () =>
      `VISIT-${new Date()
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 14)}`
  );

  if (!visitStarted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f5f7fa",
          fontFamily:
            "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            width: "min(460px, calc(100% - 32px))",
            padding: "28px",
            background: "#fff",
            border: "1px solid #e3e8ee",
            borderRadius: "16px",
            boxShadow:
              "0 8px 30px rgba(20,30,40,.06)",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: ".12em",
              color: "#7b8490",
              marginBottom: "6px",
            }}
          >
            MEDICAL VISIT
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              color: "#202833",
            }}
          >
            Open patient visit
          </h1>

          <p
            style={{
              margin:
                "10px 0 24px",
              color: "#707b88",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            Start the clinical visit and
            continue to diagnosis and
            clinical findings.
          </p>

          <button
            type="button"
            onClick={() =>
              setVisitStarted(true)
            }
            style={{
              width: "100%",
              minHeight: "44px",
              border: 0,
              borderRadius: "9px",
              background: "#1976d2",
              color: "#fff",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            Start Visit →
          </button>
        </div>
      </div>
    );
  }

  return (
    <VisitDiagnosis
      visitId={visitId}
      patient={{
        id: "PATIENT-DEMO",
        name: "Demo Patient",
      }}
      numberingSystem={
        numberingSystem
      }
      onNumberingSystemChange={
        setNumberingSystem
      }
      onAutoSave={async (draft) => {
        /*
         * Temporary integration point.
         *
         * Later this will call the backend:
         *
         * PUT /visits/:visitId/diagnosis
         *
         * For now VisitDiagnosis already
         * protects the draft through localStorage.
         */
        console.log(
          "Diagnosis autosave:",
          draft
        );
      }}
      onContinueToServices={(draft) => {
        console.log(
          "Continue to services:",
          draft
        );

        /*
         * Next phase:
         *
         * setActiveVisitStep("services")
         */
      }}
    />
  );
}