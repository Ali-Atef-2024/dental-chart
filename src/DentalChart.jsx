import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  OdontogramProvider,
  OdontogramChartSurface,
  applyPrimaryDentition,
  resetMouth,
} from "react-advanced-odontogram";
import "react-advanced-odontogram/style.css";
import "./DentalChart.css";

const SYSTEMS = ["FDI", "Universal", "Palmer"];
const DENTITION_VIEWS = [
  { id: "permanent", label: "Permanent" },
  { id: "primary", label: "Primary" },
  { id: "mixed", label: "Mixed / Full" },
];

const PERMANENT_TEETH = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41,
  31, 32, 33, 34, 35, 36, 37, 38,
];

const PRIMARY_TEETH = [
  55, 54, 53, 52, 51,
  61, 62, 63, 64, 65,
  85, 84, 83, 82, 81,
  71, 72, 73, 74, 75,
];

const PRIMARY_TO_INTERNAL = {
  51: 11, 52: 12, 53: 13, 54: 14, 55: 15,
  61: 21, 62: 22, 63: 23, 64: 24, 65: 25,
  71: 31, 72: 32, 73: 33, 74: 34, 75: 35,
  81: 41, 82: 42, 83: 43, 84: 44, 85: 45,
};

const UNIVERSAL_PERMANENT = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
};

const UNIVERSAL_PRIMARY = {
  51: "E", 52: "D", 53: "C", 54: "B", 55: "A",
  61: "F", 62: "G", 63: "H", 64: "I", 65: "J",
  71: "O", 72: "N", 73: "M", 74: "L", 75: "K",
  81: "T", 82: "S", 83: "R", 84: "Q", 85: "P",
};

function getPalmer(fdi, primary = false) {
  const q = Math.floor(fdi / 10);
  const p = fdi % 10;
  const position = primary ? String.fromCharCode(64 + p) : String(p);
  const quadrant = {
    1: "UR", 2: "UL", 3: "LL", 4: "LR",
    5: "UR", 6: "UL", 7: "LL", 8: "LR",
  }[q];
  return `${quadrant}-${position}`;
}

function displayLabel(fdi, system) {
  const primary = fdi >= 51;
  if (system === "Universal") {
    return String(primary ? UNIVERSAL_PRIMARY[fdi] : UNIVERSAL_PERMANENT[fdi]);
  }
  if (system === "Palmer") return getPalmer(fdi, primary);
  return String(fdi);
}

function stableId(fdi) {
  return `${fdi >= 51 ? "PRIMARY" : "PERMANENT"}-${fdi}`;
}

function ToothVisual({ tooth, selected, onToggle, numberingSystem, gridColumn }) {
  const label = displayLabel(tooth.fdi, numberingSystem);
  return (
    <button
      type="button"
      className={`custom-tooth ${selected ? "is-selected" : ""} ${tooth.primary ? "primary-tooth" : ""}`}
      style={gridColumn ? { gridColumn } : undefined}
      aria-pressed={selected}
      aria-label={`${label} ${tooth.primary ? "primary" : "permanent"} tooth`}
      onClick={() => onToggle(tooth)}
    >
      <span className="custom-tooth-art" dangerouslySetInnerHTML={{ __html: tooth.svg }} />
      <span className="custom-tooth-number">{label}</span>
    </button>
  );
}

function primaryGridColumn(fdi) {
  const n = Number(fdi);
  const quadrant = Math.floor(n / 10);
  const position = n % 10;

  // One anatomical 16-column coordinate system is shared by permanent
  // and primary dentition. Primary teeth sit directly under the matching
  // permanent positions:
  //
  // Upper:  18 ... 11 | 21 ... 28
  //          55 ... 51 | 61 ... 65
  // Lower:  48 ... 41 | 31 ... 38
  //          85 ... 81 | 71 ... 75
  //
  // Therefore 55/54/.../51 occupy columns 4..8, while
  // 61/62/.../65 occupy columns 9..13. The same mapping is used below.
  if (quadrant === 5 || quadrant === 8) return 9 - position;
  if (quadrant === 6 || quadrant === 7) return 8 + position;

  return undefined;
}

function ToothCaptureEngine({ onReady }) {
  const capturedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const capture = () => {
      if (cancelled || capturedRef.current) return;
      const root = document.querySelector(".dental-engine-source");
      const tiles = [...root.querySelectorAll(".tooth-tile.side-view[data-tooth]")];
      if (tiles.length < 32) {
        requestAnimationFrame(capture);
        return;
      }

      const read = (internal) => {
        const tile = tiles.find((item) => Number(item.dataset.tooth) === internal);
        const svg = tile?.querySelector(".tooth-svg")?.outerHTML;
        return svg || "";
      };

      resetMouth();
      const permanent = PERMANENT_TEETH.map((fdi) => ({
        fdi,
        primary: false,
        svg: read(fdi),
      }));

      applyPrimaryDentition();
      const primary = PRIMARY_TEETH.map((fdi) => ({
        fdi,
        primary: true,
        svg: read(PRIMARY_TO_INTERNAL[fdi]),
      }));

      resetMouth();
      capturedRef.current = true;
      if (!cancelled) onReady({ permanent, primary });
    };

    requestAnimationFrame(capture);
    return () => { cancelled = true; };
  }, [onReady]);

  return (
    <div className="dental-engine-source" aria-hidden="true">
      <OdontogramProvider
        language="en"
        numberingSystem="FDI"
        darkMode={false}
        showStatusCard={false}
        showOrthoCard={false}
      >
        <OdontogramChartSurface />
      </OdontogramProvider>
    </div>
  );
}

export default function DentalChart({
  open,
  onClose,
  onSave,
  numberingSystem = "FDI",
  onNumberingSystemChange,
  initialSelectedIds = [],
  multipleTeeth = true,
  title = "Select teeth",
}) {
  const [assets, setAssets] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSelectedIds));
  const [view, setView] = useState("mixed");

  const initialSelectionKey = useMemo(
    () => initialSelectedIds.join("|"),
    [initialSelectedIds],
  );

  useEffect(() => {
    if (open) setSelectedIds(new Set(initialSelectedIds));
  }, [open, initialSelectionKey]);

  const handleAssetsReady = useCallback((next) => setAssets(next), []);

  const visibleTeeth = useMemo(() => {
    if (!assets) return [];
    if (view === "permanent") return assets.permanent;
    if (view === "primary") return assets.primary;
    return [...assets.permanent, ...assets.primary];
  }, [assets, view]);

  const toggleTooth = useCallback((tooth) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      const id = stableId(tooth.fdi);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multipleTeeth) next.clear();
        next.add(id);
      }
      return next;
    });
  }, [multipleTeeth]);

  const selectedTeeth = useMemo(() => {
    if (!assets) return [];
    const all = [...assets.permanent, ...assets.primary];
    return [...selectedIds]
      .map((id) => all.find((tooth) => stableId(tooth.fdi) === id))
      .filter(Boolean)
      .map((tooth) => ({
        id: stableId(tooth.fdi),
        toothId: stableId(tooth.fdi),
        fdi: String(tooth.fdi),
        dentition: tooth.primary ? "primary" : "permanent",
        label: displayLabel(tooth.fdi, numberingSystem),
      }));
  }, [assets, selectedIds, numberingSystem]);

  const save = useCallback(() => {
    if (!selectedTeeth.length) return;
    onSave?.(selectedTeeth);
  }, [onSave, selectedTeeth]);

  return (
    <div className={`dental-chart-host ${open ? "is-open" : "is-closed"}`}>
      <ToothCaptureEngine onReady={handleAssetsReady} />

      <div className="dental-selector-overlay" role="dialog" aria-modal="true" aria-hidden={!open}>
        <div className="dental-selector-sheet">
          <header className="dental-selector-header">
            <div>
              <span className="eyebrow">TOOTH SELECTION</span>
              <h2>{title}</h2>
              <p>Choose the actual tooth or teeth involved in this service.</p>
            </div>
            <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">×</button>
          </header>

          <div className="dental-selector-toolbar">
            <div className="toolbar-groups">
              <div className="numbering-control">
                <span>Numbering</span>
                <div className="numbering-options">
                  {SYSTEMS.map((system) => (
                    <button
                      type="button"
                      key={system}
                      className={numberingSystem === system ? "active" : ""}
                      onClick={() => onNumberingSystemChange?.(system)}
                    >
                      {system}
                    </button>
                  ))}
                </div>
              </div>

              <div className="dentition-control">
                <span>View</span>
                <div className="dentition-options">
                  {DENTITION_VIEWS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={view === item.id ? "active" : ""}
                      onClick={() => setView(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="selection-count">Selected <strong>{selectedTeeth.length}</strong></div>
          </div>

          <div className="dental-chart-viewport">
            {!assets ? (
              <div className="chart-loading">Preparing dental chart…</div>
            ) : (
              <div className={`custom-odontogram custom-view-${view}`}>
                <section className="jaw-section upper-jaw">
                  <div className="jaw-label">UPPER JAW</div>
                  <div className="dentition-band-label">PERMANENT</div>
                  <div className="tooth-row permanent-row">
                    {assets.permanent.slice(0, 16).map((tooth) => (
                      <ToothVisual key={stableId(tooth.fdi)} tooth={tooth} selected={selectedIds.has(stableId(tooth.fdi))} onToggle={toggleTooth} numberingSystem={numberingSystem} />
                    ))}
                  </div>
                  {(view === "mixed" || view === "primary") && (
                    <>
                      <div className="dentition-band-label primary-label">PRIMARY</div>
                      <div className="tooth-row primary-row">
                      {assets.primary.slice(0, 10).map((tooth, index) => (
                        <ToothVisual
                          key={stableId(tooth.fdi)}
                          tooth={tooth}
                          selected={selectedIds.has(stableId(tooth.fdi))}
                          onToggle={toggleTooth}
                          numberingSystem={numberingSystem}
                          gridColumn={primaryGridColumn(tooth.fdi)}
                        />
                      ))}
                      </div>
                    </>
                  )}
                </section>

                <div className="mouth-midline"><span>RIGHT</span><i /> <span>LEFT</span></div>

                <section className="jaw-section lower-jaw">
                  <div className="dentition-band-label">PERMANENT</div>
                  <div className="tooth-row permanent-row">
                    {assets.permanent.slice(16).map((tooth) => (
                      <ToothVisual key={stableId(tooth.fdi)} tooth={tooth} selected={selectedIds.has(stableId(tooth.fdi))} onToggle={toggleTooth} numberingSystem={numberingSystem} />
                    ))}
                  </div>
                  {(view === "mixed" || view === "primary") && (
                    <>
                      <div className="dentition-band-label primary-label">PRIMARY</div>
                      <div className="tooth-row primary-row">
                        {assets.primary.slice(10).map((tooth, index) => (
                          <ToothVisual
                            key={stableId(tooth.fdi)}
                            tooth={tooth}
                            selected={selectedIds.has(stableId(tooth.fdi))}
                            onToggle={toggleTooth}
                            numberingSystem={numberingSystem}
                            gridColumn={primaryGridColumn(tooth.fdi)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>

          <div className="dental-selector-summary">
            <div>
              <strong>Selected teeth</strong>
              <span>{selectedTeeth.length ? selectedTeeth.map((tooth) => tooth.label).join(" · ") : "None"}</span>
            </div>
            <span className="selection-hint">Click a tooth to select or deselect it. Ctrl is not required.</span>
          </div>

          <footer className="dental-selector-footer">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="button" className="primary-button" disabled={!selectedTeeth.length} onClick={save}>Save selection</button>
          </footer>
        </div>
      </div>
    </div>
  );
}
