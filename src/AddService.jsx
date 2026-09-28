import { useMemo, useState } from "react";
import DentalChart from "./DentalChart";

const DIAGNOSES = [
  { id: "dx-001", code: "K02.9", name: "Dental caries", teeth: [16] },
  { id: "dx-002", code: "K04.0", name: "Pulpitis", teeth: [26] },
];

const SERVICES = [
  { id: "svc-filling", name: "Composite Filling", requiresTooth: true, requiresSurface: true, multipleTeeth: true },
  { id: "svc-extraction", name: "Tooth Extraction", requiresTooth: true, requiresSurface: false, multipleTeeth: true },
  { id: "svc-xray", name: "Dental X-Ray", requiresTooth: true, requiresSurface: false, multipleTeeth: true },
  { id: "svc-consultation", name: "Clinical Consultation", requiresTooth: false, requiresSurface: false, multipleTeeth: false },
];

export default function AddService() {
  const [diagnoses] = useState(DIAGNOSES);
  const [services] = useState(SERVICES);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState([]);
  const [chartOpen, setChartOpen] = useState(false);
  const [numbering, setNumbering] = useState("FDI");
  const [message, setMessage] = useState("");

  const diagnosis = useMemo(
    () => diagnoses.find((item) => item.id === selectedDiagnosisId) ?? null,
    [diagnoses, selectedDiagnosisId],
  );

  const service = useMemo(
    () => services.find((item) => item.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const canContinue = Boolean(diagnosis && service);

  function handleContinue() {
    setMessage("");

    if (!diagnosis) {
      setMessage("Select a diagnosis first.");
      return;
    }

    if (!service) {
      setMessage("Select a service first.");
      return;
    }

    if (service.requiresTooth) {
      setChartOpen(true);
      return;
    }

    handleServiceSave([]);
  }

  function handleServiceSave(teeth) {
    setSelectedTeeth(teeth);
    setChartOpen(false);
    setMessage(
      `Service ready: ${service?.name ?? ""} • Diagnosis: ${diagnosis?.code ?? ""} • Teeth: ${
        teeth.length ? teeth.map((tooth) => tooth.label).join(", ") : "None"
      }`,
    );
  }

  return (
    <main className="visit-page">
      <section className="visit-card">
        <header className="visit-header">
          <div>
            <span className="eyebrow">PATIENT VISIT</span>
            <h1>New visit</h1>
            <p>Diagnosis must exist before a service can be added.</p>
          </div>
          <span className="visit-status">In progress</span>
        </header>

        <div className="workflow">
          <div className="workflow-step active"><b>01</b><span>Diagnosis</span></div>
          <div className="workflow-line" />
          <div className={`workflow-step ${diagnosis ? "complete" : ""}`}><b>02</b><span>Service</span></div>
          <div className="workflow-line" />
          <div className={`workflow-step ${selectedTeeth.length ? "complete" : ""}`}><b>03</b><span>Tooth</span></div>
        </div>

        <section className="service-editor">
          <div className="field">
            <label htmlFor="diagnosis">Diagnosis <span>*</span></label>
            <select
              id="diagnosis"
              value={selectedDiagnosisId}
              onChange={(event) => {
                setSelectedDiagnosisId(event.target.value);
                setSelectedTeeth([]);
                setMessage("");
              }}
            >
              <option value="">Select diagnosis</option>
              {diagnoses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="service">Service <span>*</span></label>
            <select
              id="service"
              value={selectedServiceId}
              onChange={(event) => {
                setSelectedServiceId(event.target.value);
                setSelectedTeeth([]);
                setMessage("");
              }}
            >
              <option value="">Select service</option>
              {services.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {service && (
            <div className="service-rule">
              <strong>{service.name}</strong>
              <span>
                {service.requiresTooth
                  ? service.requiresSurface
                    ? "Requires tooth selection and surface selection."
                    : "Requires tooth selection."
                  : "Does not require a tooth."}
              </span>
            </div>
          )}

          {selectedTeeth.length > 0 && (
            <div className="selection-result">
              <span>Selected teeth</span>
              <div>
                {selectedTeeth.map((tooth) => (
                  <span className="tooth-chip" key={tooth.toothId}>
                    {tooth.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {message && <div className="success-message">{message}</div>}

          <div className="actions">
            <button type="button" className="primary-button" disabled={!canContinue} onClick={handleContinue}>
              {service?.requiresTooth ? "Continue to tooth selection" : "Save service"}
            </button>
          </div>
        </section>
      </section>

      <DentalChart
        open={chartOpen}
        numberingSystem={numbering}
        onNumberingSystemChange={setNumbering}
        initialSelectedIds={selectedTeeth.map((tooth) => tooth.toothId)}
        multipleTeeth={service?.multipleTeeth ?? false}
        onClose={() => setChartOpen(false)}
        onSave={handleServiceSave}
        title={service ? `Select teeth · ${service.name}` : "Select teeth"}
      />
    </main>
  );
}
