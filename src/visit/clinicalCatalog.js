export const CLINICAL_TYPES = {
  DIAGNOSIS: "DIAGNOSIS",
  SYMPTOM: "SYMPTOM",
  SIGN: "SIGN",
  CHRONIC_CONDITION: "CHRONIC_CONDITION",
};

export const clinicalCatalog = [
  // =========================
  // DIAGNOSES
  // =========================
  {
    id: "dx-k02-9",
    type: CLINICAL_TYPES.DIAGNOSIS,
    codeSystem: "ICD-10",
    code: "K02.9",
    nameEn: "Dental caries, unspecified",
    nameAr: "تسوس الأسنان غير محدد",
    synonyms: [
      "dental caries",
      "caries",
      "tooth decay",
      "تسوس",
      "تسوس الأسنان",
    ],
  },

  {
    id: "dx-k05-10",
    type: CLINICAL_TYPES.DIAGNOSIS,
    codeSystem: "ICD-10",
    code: "K05.10",
    nameEn: "Chronic gingivitis",
    nameAr: "التهاب اللثة المزمن",
    synonyms: [
      "gingivitis",
      "chronic gingivitis",
      "التهاب اللثة",
      "التهاب اللثة المزمن",
    ],
  },

  {
    id: "dx-k04-0",
    type: CLINICAL_TYPES.DIAGNOSIS,
    codeSystem: "ICD-10",
    code: "K04.0",
    nameEn: "Pulpitis",
    nameAr: "التهاب لب السن",
    synonyms: [
      "pulpitis",
      "dental pulpitis",
      "التهاب اللب",
      "التهاب عصب السن",
    ],
  },

  // =========================
  // SYMPTOMS
  // =========================
  {
    id: "sx-pain",
    type: CLINICAL_TYPES.SYMPTOM,
    codeSystem: "LOCAL",
    code: "SX-PAIN",
    nameEn: "Dental pain",
    nameAr: "ألم الأسنان",
    synonyms: [
      "tooth pain",
      "dental pain",
      "pain",
      "ألم",
      "وجع الأسنان",
    ],
  },

  {
    id: "sx-sensitivity",
    type: CLINICAL_TYPES.SYMPTOM,
    codeSystem: "LOCAL",
    code: "SX-SENS",
    nameEn: "Tooth sensitivity",
    nameAr: "حساسية الأسنان",
    synonyms: [
      "sensitivity",
      "tooth sensitivity",
      "حساسية",
      "حساسية الأسنان",
    ],
  },

  // =========================
  // CLINICAL SIGNS
  // =========================
  {
    id: "sg-bleeding",
    type: CLINICAL_TYPES.SIGN,
    codeSystem: "LOCAL",
    code: "SG-BLEED",
    nameEn: "Gingival bleeding",
    nameAr: "نزيف اللثة",
    synonyms: [
      "gum bleeding",
      "gingival bleeding",
      "bleeding gums",
      "نزيف اللثة",
    ],
  },

  {
    id: "sg-swelling",
    type: CLINICAL_TYPES.SIGN,
    codeSystem: "LOCAL",
    code: "SG-SWELL",
    nameEn: "Gingival swelling",
    nameAr: "تورم اللثة",
    synonyms: [
      "swelling",
      "gum swelling",
      "gingival swelling",
      "تورم",
      "تورم اللثة",
    ],
  },

  // =========================
  // CHRONIC CONDITIONS
  // =========================
  {
    id: "cc-diabetes",
    type: CLINICAL_TYPES.CHRONIC_CONDITION,
    codeSystem: "ICD-10",
    code: "E11.9",
    nameEn: "Type 2 diabetes mellitus",
    nameAr: "داء السكري من النوع الثاني",
    synonyms: [
      "diabetes",
      "type 2 diabetes",
      "diabetes mellitus",
      "سكري",
      "السكري",
    ],
  },

  {
    id: "cc-hypertension",
    type: CLINICAL_TYPES.CHRONIC_CONDITION,
    codeSystem: "ICD-10",
    code: "I10",
    nameEn: "Essential hypertension",
    nameAr: "ارتفاع ضغط الدم الأساسي",
    synonyms: [
      "hypertension",
      "high blood pressure",
      "ضغط الدم",
      "ارتفاع ضغط الدم",
    ],
  },
];

/**
 * Search clinical catalog by:
 * - code
 * - English name
 * - Arabic name
 * - synonyms
 */
export function searchClinicalItems(
  query,
  type = null,
  limit = 10
) {
  const q = String(query || "").trim().toLowerCase();

  if (!q) {
    return [];
  }

  return clinicalCatalog
    .map((item) => {
      const searchableFields = [
        item.code,
        item.nameEn,
        item.nameAr,
        ...(item.synonyms || []),
      ].map((value) => String(value).toLowerCase());

      let score = 0;

      if (searchableFields.some((value) => value === q)) {
        score = 100;
      } else if (
        searchableFields.some((value) => value.startsWith(q))
      ) {
        score = 80;
      } else if (
        searchableFields.some((value) => value.includes(q))
      ) {
        score = 50;
      }

      return {
        item,
        score,
      };
    })
    .filter(
      ({ item, score }) =>
        score > 0 &&
        (!type || item.type === type)
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}