import type { ListingAttributes } from "./types";
import type { TaxonomyField, TaxonomyNode, TaxonomyOption } from "./gaming-taxonomy";

const option = (value: string, label: string): TaxonomyOption => ({ value, label });
const select = (key: string, label: string, options: readonly TaxonomyOption[], required = false): TaxonomyField => ({ key, label, type: "select", options, required });
const text = (key: string, label: string, required = false, placeholder?: string): TaxonomyField => ({ key, label, type: "text", required, ...(placeholder ? { placeholder } : {}) });
const number = (key: string, label: string, min: number, max: number, required = false): TaxonomyField => ({ key, label, type: "number", min, max, required });
const boolean = (key: string, label: string): TaxonomyField => ({ key, label, type: "boolean" });
const multiselect = (key: string, label: string, options: readonly TaxonomyOption[], required = false): TaxonomyField => ({ key, label, type: "multiselect", options, required });

const MANUFACTURERS = {
  cpu: [option("intel", "Intel"), option("amd", "AMD")],
  gpuChipset: [option("nvidia", "NVIDIA"), option("amd", "AMD"), option("intel", "Intel")],
  gpuBoard: ["ASUS", "MSI", "Gigabyte", "ASRock", "Sapphire", "PowerColor", "XFX", "Zotac", "Palit", "PNY", "Gainward", "Inno3D", "Intel", "Other"].map((label) => option(label.toLowerCase().replaceAll(" ", "-"), label)),
  motherboard: ["ASUS", "MSI", "Gigabyte", "ASRock", "Biostar", "NZXT", "Sapphire", "Supermicro", "Other"].map((label) => option(label.toLowerCase(), label)),
} as const;

const SOCKETS = [
  option("lga775", "Intel LGA 775"), option("lga1150", "Intel LGA 1150"), option("lga1151", "Intel LGA 1151"), option("lga1151-v2", "Intel LGA 1151 rev. 2"), option("lga1200", "Intel LGA 1200"), option("lga1700", "Intel LGA 1700"), option("lga1851", "Intel LGA 1851"), option("lga2011", "Intel LGA 2011"), option("lga2011-3", "Intel LGA 2011-3"), option("lga2066", "Intel LGA 2066"), option("lga3647", "Intel LGA 3647"), option("lga4189", "Intel LGA 4189"),
  option("am2", "AMD AM2 / AM2+"), option("am3", "AMD AM3"), option("am3-plus", "AMD AM3+"), option("fm1", "AMD FM1"), option("fm2", "AMD FM2 / FM2+"), option("am4", "AMD AM4"), option("am5", "AMD AM5"), option("tr4", "AMD TR4"), option("strx4", "AMD sTRX4"), option("str5", "AMD sTR5"), option("sp3", "AMD SP3"), option("sp5", "AMD SP5"),
] as const;
const INTEL_SOCKETS = new Set(SOCKETS.filter((item) => item.value.startsWith("lga")).map((item) => item.value));
const AMD_SOCKETS = new Set(SOCKETS.filter((item) => !item.value.startsWith("lga")).map((item) => item.value));

type CpuFamily = { value: string; label: string; manufacturer: "intel" | "amd"; sockets: readonly string[] };
const CPU_FAMILIES: readonly CpuFamily[] = [
  { value: "core-i3", label: "Intel Core i3", manufacturer: "intel", sockets: ["lga1151", "lga1151-v2", "lga1200", "lga1700"] },
  { value: "core-i5", label: "Intel Core i5", manufacturer: "intel", sockets: ["lga1151", "lga1151-v2", "lga1200", "lga1700"] },
  { value: "core-i7", label: "Intel Core i7", manufacturer: "intel", sockets: ["lga1151", "lga1151-v2", "lga1200", "lga1700"] },
  { value: "core-i9", label: "Intel Core i9", manufacturer: "intel", sockets: ["lga1151-v2", "lga1200", "lga1700"] },
  { value: "core-ultra-5", label: "Intel Core Ultra 5", manufacturer: "intel", sockets: ["lga1851"] },
  { value: "core-ultra-7", label: "Intel Core Ultra 7", manufacturer: "intel", sockets: ["lga1851"] },
  { value: "core-ultra-9", label: "Intel Core Ultra 9", manufacturer: "intel", sockets: ["lga1851"] },
  { value: "pentium", label: "Intel Pentium", manufacturer: "intel", sockets: ["lga775", "lga1150", "lga1151", "lga1200"] },
  { value: "celeron", label: "Intel Celeron", manufacturer: "intel", sockets: ["lga775", "lga1150", "lga1151", "lga1200", "lga1700"] },
  { value: "xeon", label: "Intel Xeon", manufacturer: "intel", sockets: ["lga2011", "lga2011-3", "lga2066", "lga3647", "lga4189"] },
  { value: "older-intel", label: "Older Intel family", manufacturer: "intel", sockets: ["lga775", "lga1150", "lga1151"] },
  { value: "ryzen-3", label: "AMD Ryzen 3", manufacturer: "amd", sockets: ["am4", "am5"] },
  { value: "ryzen-5", label: "AMD Ryzen 5", manufacturer: "amd", sockets: ["am4", "am5"] },
  { value: "ryzen-7", label: "AMD Ryzen 7", manufacturer: "amd", sockets: ["am4", "am5"] },
  { value: "ryzen-9", label: "AMD Ryzen 9", manufacturer: "amd", sockets: ["am4", "am5"] },
  { value: "ryzen-pro", label: "AMD Ryzen PRO", manufacturer: "amd", sockets: ["am4", "am5"] },
  { value: "threadripper", label: "AMD Ryzen Threadripper", manufacturer: "amd", sockets: ["tr4", "strx4", "str5"] },
  { value: "epyc", label: "AMD EPYC", manufacturer: "amd", sockets: ["sp3", "sp5"] },
  { value: "fx", label: "AMD FX", manufacturer: "amd", sockets: ["am3-plus"] },
  { value: "athlon", label: "AMD Athlon", manufacturer: "amd", sockets: ["am2", "am3", "am3-plus", "fm1", "fm2", "am4"] },
  { value: "a-series", label: "AMD A-Series", manufacturer: "amd", sockets: ["fm1", "fm2"] },
] as const;

type CpuGeneration = { value: string; label: string; manufacturer: "intel" | "amd"; families: readonly string[]; sockets: readonly string[]; architecture: readonly TaxonomyOption[] };
const coreFamilies = ["core-i3", "core-i5", "core-i7", "core-i9"];
const ryzenFamilies = ["ryzen-3", "ryzen-5", "ryzen-7", "ryzen-9", "ryzen-pro"];
const CPU_GENERATIONS: readonly CpuGeneration[] = [
  { value: "6th-gen", label: "6th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1151"], architecture: [option("skylake", "Skylake")] },
  { value: "7th-gen", label: "7th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1151"], architecture: [option("kaby-lake", "Kaby Lake")] },
  { value: "8th-gen", label: "8th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1151-v2"], architecture: [option("coffee-lake", "Coffee Lake")] },
  { value: "9th-gen", label: "9th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1151-v2"], architecture: [option("coffee-lake-refresh", "Coffee Lake Refresh")] },
  { value: "10th-gen", label: "10th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1200"], architecture: [option("comet-lake", "Comet Lake")] },
  { value: "11th-gen", label: "11th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1200"], architecture: [option("rocket-lake", "Rocket Lake")] },
  { value: "12th-gen", label: "12th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1700"], architecture: [option("alder-lake", "Alder Lake")] },
  { value: "13th-gen", label: "13th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1700"], architecture: [option("raptor-lake", "Raptor Lake")] },
  { value: "14th-gen", label: "14th Generation", manufacturer: "intel", families: coreFamilies, sockets: ["lga1700"], architecture: [option("raptor-lake-refresh", "Raptor Lake Refresh")] },
  { value: "core-ultra-series-2", label: "Core Ultra Series 2 / 200S", manufacturer: "intel", families: ["core-ultra-5", "core-ultra-7", "core-ultra-9"], sockets: ["lga1851"], architecture: [option("arrow-lake", "Arrow Lake")] },
  { value: "intel-legacy", label: "Legacy / workstation generation", manufacturer: "intel", families: ["pentium", "celeron", "xeon", "older-intel"], sockets: [...INTEL_SOCKETS], architecture: [option("other-intel", "Other / specify in model")] },
  { value: "ryzen-1000", label: "Ryzen 1000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am4"], architecture: [option("zen", "Zen")] },
  { value: "ryzen-2000", label: "Ryzen 2000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am4"], architecture: [option("zen-plus", "Zen+")] },
  { value: "ryzen-3000", label: "Ryzen 3000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am4"], architecture: [option("zen-2", "Zen 2")] },
  { value: "ryzen-4000", label: "Ryzen 4000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am4"], architecture: [option("zen-2", "Zen 2")] },
  { value: "ryzen-5000", label: "Ryzen 5000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am4"], architecture: [option("zen-3", "Zen 3")] },
  { value: "ryzen-7000", label: "Ryzen 7000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am5"], architecture: [option("zen-4", "Zen 4")] },
  { value: "ryzen-8000", label: "Ryzen 8000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am5"], architecture: [option("zen-4", "Zen 4")] },
  { value: "ryzen-9000", label: "Ryzen 9000 Series", manufacturer: "amd", families: ryzenFamilies, sockets: ["am5"], architecture: [option("zen-5", "Zen 5")] },
  { value: "amd-legacy", label: "Legacy AMD generation", manufacturer: "amd", families: ["fx", "athlon", "a-series"], sockets: ["am2", "am3", "am3-plus", "fm1", "fm2", "am4"], architecture: [option("other-amd", "Other / specify in model")] },
  { value: "amd-workstation", label: "Threadripper / EPYC generation", manufacturer: "amd", families: ["threadripper", "epyc"], sockets: ["tr4", "strx4", "str5", "sp3", "sp5"], architecture: [option("zen", "Zen"), option("zen-2", "Zen 2"), option("zen-3", "Zen 3"), option("zen-4", "Zen 4"), option("zen-5", "Zen 5")] },
] as const;

type CpuModel = { value: string; label: string; family: string; generation: string; socket: string };
const CPU_MODELS: readonly CpuModel[] = [
  { value: "core-i7-6700", label: "Core i7-6700", family: "core-i7", generation: "6th-gen", socket: "lga1151" },
  { value: "core-i7-7700k", label: "Core i7-7700K", family: "core-i7", generation: "7th-gen", socket: "lga1151" },
  { value: "core-i7-8700k", label: "Core i7-8700K", family: "core-i7", generation: "8th-gen", socket: "lga1151-v2" },
  { value: "core-i7-9700k", label: "Core i7-9700K", family: "core-i7", generation: "9th-gen", socket: "lga1151-v2" },
  { value: "core-i7-10700k", label: "Core i7-10700K", family: "core-i7", generation: "10th-gen", socket: "lga1200" },
  { value: "core-i7-11700k", label: "Core i7-11700K", family: "core-i7", generation: "11th-gen", socket: "lga1200" },
  { value: "core-i5-12400f", label: "Core i5-12400F", family: "core-i5", generation: "12th-gen", socket: "lga1700" },
  { value: "core-i7-12700k", label: "Core i7-12700K", family: "core-i7", generation: "12th-gen", socket: "lga1700" },
  { value: "core-i5-13600k", label: "Core i5-13600K", family: "core-i5", generation: "13th-gen", socket: "lga1700" },
  { value: "core-i7-13700k", label: "Core i7-13700K", family: "core-i7", generation: "13th-gen", socket: "lga1700" },
  { value: "core-i9-13900k", label: "Core i9-13900K", family: "core-i9", generation: "13th-gen", socket: "lga1700" },
  { value: "core-i5-14600k", label: "Core i5-14600K", family: "core-i5", generation: "14th-gen", socket: "lga1700" },
  { value: "core-i7-14700k", label: "Core i7-14700K", family: "core-i7", generation: "14th-gen", socket: "lga1700" },
  { value: "core-i9-14900k", label: "Core i9-14900K", family: "core-i9", generation: "14th-gen", socket: "lga1700" },
  { value: "core-ultra-5-245k", label: "Core Ultra 5 245K", family: "core-ultra-5", generation: "core-ultra-series-2", socket: "lga1851" },
  { value: "core-ultra-7-265k", label: "Core Ultra 7 265K", family: "core-ultra-7", generation: "core-ultra-series-2", socket: "lga1851" },
  { value: "core-ultra-9-285k", label: "Core Ultra 9 285K", family: "core-ultra-9", generation: "core-ultra-series-2", socket: "lga1851" },
  { value: "ryzen-5-1600", label: "Ryzen 5 1600", family: "ryzen-5", generation: "ryzen-1000", socket: "am4" },
  { value: "ryzen-7-2700x", label: "Ryzen 7 2700X", family: "ryzen-7", generation: "ryzen-2000", socket: "am4" },
  { value: "ryzen-7-3700x", label: "Ryzen 7 3700X", family: "ryzen-7", generation: "ryzen-3000", socket: "am4" },
  { value: "ryzen-5-5600x", label: "Ryzen 5 5600X", family: "ryzen-5", generation: "ryzen-5000", socket: "am4" },
  { value: "ryzen-7-5700x", label: "Ryzen 7 5700X", family: "ryzen-7", generation: "ryzen-5000", socket: "am4" },
  { value: "ryzen-7-5800x", label: "Ryzen 7 5800X", family: "ryzen-7", generation: "ryzen-5000", socket: "am4" },
  { value: "ryzen-7-5800x3d", label: "Ryzen 7 5800X3D", family: "ryzen-7", generation: "ryzen-5000", socket: "am4" },
  { value: "ryzen-5-7600x", label: "Ryzen 5 7600X", family: "ryzen-5", generation: "ryzen-7000", socket: "am5" },
  { value: "ryzen-7-7700x", label: "Ryzen 7 7700X", family: "ryzen-7", generation: "ryzen-7000", socket: "am5" },
  { value: "ryzen-7-7800x3d", label: "Ryzen 7 7800X3D", family: "ryzen-7", generation: "ryzen-7000", socket: "am5" },
  { value: "ryzen-7-8700g", label: "Ryzen 7 8700G", family: "ryzen-7", generation: "ryzen-8000", socket: "am5" },
  { value: "ryzen-7-9700x", label: "Ryzen 7 9700X", family: "ryzen-7", generation: "ryzen-9000", socket: "am5" },
  { value: "ryzen-7-9800x3d", label: "Ryzen 7 9800X3D", family: "ryzen-7", generation: "ryzen-9000", socket: "am5" },
] as const;

const GPU_SERIES = {
  nvidia: [option("rtx-50", "GeForce RTX 50 Series"), option("rtx-40", "GeForce RTX 40 Series"), option("rtx-30", "GeForce RTX 30 Series"), option("rtx-20", "GeForce RTX 20 Series"), option("gtx-16", "GeForce GTX 16 Series"), option("gtx-10", "GeForce GTX 10 Series"), option("gtx-900", "GeForce GTX 900 Series"), option("nvidia-legacy", "Older GeForce / Quadro")],
  amd: [option("rx-9000", "Radeon RX 9000 Series"), option("rx-7000", "Radeon RX 7000 Series"), option("rx-6000", "Radeon RX 6000 Series"), option("rx-5000", "Radeon RX 5000 Series"), option("rx-500", "Radeon RX 500 Series"), option("radeon-legacy", "Older Radeon / Radeon Pro")],
  intel: [option("arc-b", "Intel Arc B-Series"), option("arc-a", "Intel Arc A-Series"), option("intel-pro", "Intel professional discrete graphics")],
} as const;
const GPU_MODELS: Record<string, readonly TaxonomyOption[]> = {
  "rtx-50": ["5090", "5080", "5070-ti", "5070", "5060-ti", "5060", "5050"].map((id) => option(`rtx-${id}`, `GeForce RTX ${id.toUpperCase().replace("-TI", " Ti")}`)),
  "rtx-40": ["4090", "4080-super", "4080", "4070-ti-super", "4070-ti", "4070-super", "4070", "4060-ti", "4060"].map((id) => option(`rtx-${id}`, `GeForce RTX ${id.toUpperCase().replace("-TI", " Ti").replace("-SUPER", " SUPER")}`)),
  "rtx-30": ["3090-ti", "3090", "3080-ti", "3080", "3070-ti", "3070", "3060-ti", "3060", "3050"].map((id) => option(`rtx-${id}`, `GeForce RTX ${id.toUpperCase().replace("-TI", " Ti")}`)),
  "rtx-20": [option("rtx-2080-ti", "GeForce RTX 2080 Ti"), option("rtx-2080", "GeForce RTX 2080"), option("rtx-2070", "GeForce RTX 2070"), option("rtx-2060", "GeForce RTX 2060")],
  "gtx-16": [option("gtx-1660-ti", "GeForce GTX 1660 Ti"), option("gtx-1660-super", "GeForce GTX 1660 SUPER"), option("gtx-1660", "GeForce GTX 1660"), option("gtx-1650", "GeForce GTX 1650")],
  "gtx-10": [option("gtx-1080-ti", "GeForce GTX 1080 Ti"), option("gtx-1080", "GeForce GTX 1080"), option("gtx-1070", "GeForce GTX 1070"), option("gtx-1060", "GeForce GTX 1060")],
  "gtx-900": [option("gtx-980-ti", "GeForce GTX 980 Ti"), option("gtx-980", "GeForce GTX 980"), option("gtx-970", "GeForce GTX 970"), option("gtx-960", "GeForce GTX 960")],
  "rx-9000": [option("rx-9070-xt", "Radeon RX 9070 XT"), option("rx-9070", "Radeon RX 9070"), option("rx-9060-xt", "Radeon RX 9060 XT")],
  "rx-7000": [option("rx-7900-xtx", "Radeon RX 7900 XTX"), option("rx-7900-xt", "Radeon RX 7900 XT"), option("rx-7800-xt", "Radeon RX 7800 XT"), option("rx-7700-xt", "Radeon RX 7700 XT"), option("rx-7600", "Radeon RX 7600")],
  "rx-6000": [option("rx-6950-xt", "Radeon RX 6950 XT"), option("rx-6900-xt", "Radeon RX 6900 XT"), option("rx-6800-xt", "Radeon RX 6800 XT"), option("rx-6700-xt", "Radeon RX 6700 XT"), option("rx-6600", "Radeon RX 6600")],
  "rx-5000": [option("rx-5700-xt", "Radeon RX 5700 XT"), option("rx-5700", "Radeon RX 5700"), option("rx-5600-xt", "Radeon RX 5600 XT"), option("rx-5500-xt", "Radeon RX 5500 XT")],
  "rx-500": [option("rx-590", "Radeon RX 590"), option("rx-580", "Radeon RX 580"), option("rx-570", "Radeon RX 570"), option("rx-560", "Radeon RX 560")],
  "arc-b": [option("arc-b580", "Intel Arc B580"), option("arc-b570", "Intel Arc B570")],
  "arc-a": [option("arc-a770", "Intel Arc A770"), option("arc-a750", "Intel Arc A750"), option("arc-a580", "Intel Arc A580"), option("arc-a380", "Intel Arc A380")],
};

const MEMORY_TYPES = [option("ddr2", "DDR2"), option("ddr3", "DDR3"), option("ddr4", "DDR4"), option("ddr5", "DDR5"), option("other", "Other / legacy memory")];
const FORM_FACTORS = [option("atx", "ATX"), option("micro-atx", "Micro ATX"), option("mini-itx", "Mini ITX"), option("e-atx", "Extended ATX"), option("ssi", "SSI")];
const MOTHERBOARD_CHIPSETS: Record<string, readonly TaxonomyOption[]> = {
  am4: ["a320", "a520", "b350", "b450", "b550", "x370", "x470", "x570"].map((id) => option(id, `AMD ${id.toUpperCase()}`)),
  am5: ["a620", "b650", "b650e", "b840", "b850", "x670", "x670e", "x870", "x870e"].map((id) => option(id, `AMD ${id.toUpperCase()}`)),
  lga1200: ["h410", "b460", "z490", "h510", "b560", "z590"].map((id) => option(id, `Intel ${id.toUpperCase()}`)),
  lga1700: ["h610", "b660", "h670", "z690", "b760", "h770", "z790"].map((id) => option(id, `Intel ${id.toUpperCase()}`)),
  lga1851: ["h810", "b860", "z890"].map((id) => option(id, `Intel ${id.toUpperCase()}`)),
  lga2066: [option("x299", "Intel X299")], lga3647: [option("c621", "Intel C621")],
};

const EFFICIENCY = [option("80-plus-standard", "80 PLUS Standard"), option("80-plus-bronze", "80 PLUS Bronze"), option("80-plus-silver", "80 PLUS Silver"), option("80-plus-gold", "80 PLUS Gold"), option("80-plus-platinum", "80 PLUS Platinum"), option("80-plus-titanium", "80 PLUS Titanium"), option("unrated", "Not certified / Unknown")];
const PSU_FORMS = [option("atx", "ATX"), option("sfx", "SFX"), option("sfx-l", "SFX-L"), option("tfx", "TFX"), option("other", "Other")];

const EXACT_MODEL = text("exact_model", "Exact model", true, "Enter the model printed on the product");
const MANUFACTURER_TEXT = text("manufacturer", "Manufacturer", false, "e.g. Corsair, Samsung, Noctua");

function cpuFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  const manufacturer = typeof attributes.manufacturer === "string" ? attributes.manufacturer : "";
  const socket = typeof attributes.socket === "string" ? attributes.socket : "";
  const family = typeof attributes.cpu_family === "string" ? attributes.cpu_family : "";
  const generation = typeof attributes.cpu_generation === "string" ? attributes.cpu_generation : "";
  const model = typeof attributes.cpu_model === "string" ? attributes.cpu_model : "";
  const fields: TaxonomyField[] = [select("manufacturer", "Processor manufacturer", MANUFACTURERS.cpu, true)];
  if (!manufacturer) return fields;
  const socketSet = manufacturer === "intel" ? INTEL_SOCKETS : manufacturer === "amd" ? AMD_SOCKETS : new Set<string>();
  fields.push(select("socket", "Socket", SOCKETS.filter((item) => socketSet.has(item.value)), true));
  if (!socket) return fields;
  fields.push(select("cpu_family", "Processor family", CPU_FAMILIES.filter((item) => item.manufacturer === manufacturer && item.sockets.includes(socket)).map((item) => option(item.value, item.label)), true));
  if (!family) return fields;
  const generations = CPU_GENERATIONS.filter((item) => item.manufacturer === manufacturer && item.families.includes(family) && item.sockets.includes(socket));
  fields.push(select("cpu_generation", manufacturer === "intel" && family.startsWith("core-ultra") ? "Core Ultra generation" : "Generation / series", generations.map((item) => option(item.value, item.label)), true));
  if (!generation) return fields;
  const generationDefinition = generations.find((item) => item.value === generation);
  fields.push(select("cpu_architecture", "Architecture", generationDefinition?.architecture ?? [], false));
  const models = CPU_MODELS.filter((item) => item.socket === socket && item.family === family && item.generation === generation).map((item) => option(item.value, item.label));
  fields.push(select("cpu_model", "Processor model", [...models, option("other", "Other / specify model")], true));
  if (!model) return fields;
  if (model === "other") fields.push(EXACT_MODEL);
  fields.push(number("cores", "Core count", 1, 256), number("threads", "Thread count", 1, 512), number("base_clock_ghz", "Base frequency (GHz)", 0.1, 10), number("boost_clock_ghz", "Boost frequency (GHz)", 0.1, 10), boolean("integrated_graphics", "Integrated graphics"), boolean("unlocked", "Unlocked / overclockable"), boolean("cooler_included", "Cooler included"), select("cpu_packaging", "Packaging", [option("box", "Box"), option("tray", "Tray / OEM")]));
  return fields;
}

function gpuFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  const vendor = typeof attributes.gpu_chipset_vendor === "string" ? attributes.gpu_chipset_vendor : "";
  const series = typeof attributes.gpu_series === "string" ? attributes.gpu_series : "";
  const model = typeof attributes.gpu_model === "string" ? attributes.gpu_model : "";
  const fields: TaxonomyField[] = [select("gpu_chipset_vendor", "GPU chipset manufacturer", MANUFACTURERS.gpuChipset, true)];
  if (!vendor) return fields;
  fields.push(select("gpu_series", "GPU family / generation", GPU_SERIES[vendor as keyof typeof GPU_SERIES] ?? [], true));
  if (!series) return fields;
  fields.push(select("gpu_model", "GPU model", [...(GPU_MODELS[series] ?? []), option("other", "Other / specify GPU")], true));
  if (!model) return fields;
  if (model === "other") fields.push(text("gpu_model_other", "Other GPU model", true, "Enter the chipset model"));
  fields.push(select("manufacturer", "Board manufacturer", MANUFACTURERS.gpuBoard, true), EXACT_MODEL, number("vram_gb", "VRAM (GB)", 1, 128), select("memory_type", "Graphics memory type", [option("gddr3", "GDDR3"), option("gddr5", "GDDR5"), option("gddr5x", "GDDR5X"), option("gddr6", "GDDR6"), option("gddr6x", "GDDR6X"), option("gddr7", "GDDR7"), option("hbm", "HBM / HBM2")]), number("memory_bus_bit", "Memory bus (bit)", 32, 4096), text("display_outputs", "Display outputs", false, "e.g. 3× DisplayPort, 1× HDMI"), number("card_length_mm", "Card length (mm)", 50, 600), text("power_connectors", "Power connectors", false, "e.g. 2× 8-pin or 12V-2x6"), select("cooling_configuration", "Cooling configuration", [option("passive", "Passive"), option("single-fan", "Single fan"), option("dual-fan", "Dual fan"), option("triple-fan", "Triple fan"), option("blower", "Blower"), option("water-block", "Water block")]), boolean("used_for_mining", "Used for mining"));
  return fields;
}

function ramFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  const use = typeof attributes.memory_use === "string" ? attributes.memory_use : "";
  const formOptions = use === "laptop" ? [option("so-dimm", "SO-DIMM")] : use === "desktop" ? [option("dimm", "DIMM")] : use === "server" ? [option("dimm", "DIMM"), option("so-dimm", "SO-DIMM")] : [];
  const fields: TaxonomyField[] = [select("memory_use", "Computer type", [option("desktop", "Desktop"), option("laptop", "Laptop"), option("server", "Server / workstation")], true)];
  if (!use) return fields;
  fields.push(select("ram_form_factor", "Memory form factor", formOptions, true), select("ram_type", "DDR generation", MEMORY_TYPES, true), number("capacity_gb", "Total capacity (GB)", 1, 2048, true), number("module_count", "Number of modules", 1, 16, true), number("module_capacity_gb", "Capacity per module (GB)", 1, 256, true), number("speed_mts", "Speed (MT/s)", 200, 20000, true), number("cas_latency", "CAS latency (CL)", 2, 100), boolean("ecc", "ECC memory"), boolean("registered", "Registered / buffered"), select("memory_profile", "Overclocking profile", [option("none", "None / standard"), option("xmp", "Intel XMP"), option("expo", "AMD EXPO"), option("xmp-expo", "XMP & EXPO")]), boolean("rgb", "RGB lighting"), MANUFACTURER_TEXT, text("exact_model", "Exact model / kit number", false));
  return fields;
}

function motherboardFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  const platform = typeof attributes.platform_vendor === "string" ? attributes.platform_vendor : "";
  const socket = typeof attributes.socket === "string" ? attributes.socket : "";
  const fields: TaxonomyField[] = [select("platform_vendor", "CPU platform", [option("amd", "AMD"), option("intel", "Intel")], true)];
  if (!platform) return fields;
  const allowed = platform === "amd" ? AMD_SOCKETS : INTEL_SOCKETS;
  fields.push(select("socket", "Socket", SOCKETS.filter((item) => allowed.has(item.value) && (MOTHERBOARD_CHIPSETS[item.value]?.length ?? 0) > 0), true));
  if (!socket) return fields;
  fields.push(select("chipset", "Chipset", MOTHERBOARD_CHIPSETS[socket] ?? [], true), select("manufacturer", "Motherboard manufacturer", MANUFACTURERS.motherboard, false), EXACT_MODEL, select("form_factor", "Form factor", FORM_FACTORS, true));
  const ramOptions = socket === "am4" || socket === "lga1200" ? [option("ddr4", "DDR4")] : socket === "am5" || socket === "lga1851" ? [option("ddr5", "DDR5")] : socket === "lga1700" ? [option("ddr4", "DDR4"), option("ddr5", "DDR5")] : MEMORY_TYPES;
  fields.push(select("ram_type", "Supported memory", ramOptions, true), number("memory_slots", "Memory slots", 1, 16), number("m2_slots", "M.2 slots", 0, 10), select("pcie_generation", "Primary PCIe generation", [option("pcie-3", "PCIe 3.0"), option("pcie-4", "PCIe 4.0"), option("pcie-5", "PCIe 5.0")]), boolean("wifi", "Built-in Wi-Fi"), boolean("bluetooth", "Built-in Bluetooth"));
  return fields;
}

const simpleFields: Record<string, (attributes: ListingAttributes) => readonly TaxonomyField[]> = {
  psu: () => [MANUFACTURER_TEXT, number("wattage", "Power rating (W)", 100, 3000, true), select("modularity", "Modularity", [option("non-modular", "Non-modular / fully wired"), option("semi-modular", "Semi-modular"), option("fully-modular", "Fully modular")], true), select("efficiency", "80 PLUS certification", EFFICIENCY, true), select("cybenetics_efficiency", "Cybenetics efficiency", [option("cybenetics-bronze", "Cybenetics Bronze"), option("cybenetics-silver", "Cybenetics Silver"), option("cybenetics-gold", "Cybenetics Gold"), option("cybenetics-platinum", "Cybenetics Platinum"), option("cybenetics-titanium", "Cybenetics Titanium"), option("not-listed", "Not listed / unknown")]), select("psu_form_factor", "PSU form factor", PSU_FORMS, true), select("atx_version", "ATX standard", [option("atx-2", "ATX 2.x"), option("atx-3-0", "ATX 3.0"), option("atx-3-1", "ATX 3.1"), option("unknown", "Unknown")]), text("gpu_power_connectors", "GPU power connectors"), EXACT_MODEL],
  ssd: (attributes) => {
    const form = typeof attributes.storage_form_factor === "string" ? attributes.storage_form_factor : "";
    const protocolOptions = form === "m2" ? [option("nvme", "NVMe"), option("ahci", "AHCI / SATA")] : form === "u2" ? [option("nvme", "NVMe")] : [option("ahci", "AHCI / SATA")];
    const protocol = typeof attributes.storage_protocol === "string" ? attributes.storage_protocol : "";
    const interfaceOptions = protocol === "nvme" ? [option("pcie-3", "PCIe 3.0"), option("pcie-4", "PCIe 4.0"), option("pcie-5", "PCIe 5.0")] : [option("sata-ii", "SATA II"), option("sata-iii", "SATA III")];
    const fields: TaxonomyField[] = [select("storage_form_factor", "Form factor", [option("m2", "M.2"), option("2-5-inch", "2.5-inch"), option("msata", "mSATA"), option("u2", "U.2"), option("add-in-card", "PCIe add-in card")], true)];
    if (!form) return fields;
    fields.push(select("storage_protocol", "Protocol", protocolOptions, true));
    if (!protocol) return fields;
    fields.push(select("interface", "Interface / PCIe generation", interfaceOptions, true), number("capacity_gb", "Capacity (GB)", 1, 100000, true), MANUFACTURER_TEXT, EXACT_MODEL, number("sequential_read_mbps", "Sequential read (MB/s)", 1, 30000), number("ssd_health_percent", "SSD health (%)", 0, 100), number("tbw_remaining", "Verified TBW remaining", 0, 100000));
    return fields;
  },
  hdd: () => [select("storage_form_factor", "Drive size", [option("2-5-inch", "2.5-inch"), option("3-5-inch", "3.5-inch")], true), select("interface", "Interface", [option("sata-ii", "SATA II"), option("sata-iii", "SATA III"), option("sas-6", "SAS 6 Gb/s"), option("sas-12", "SAS 12 Gb/s")], true), number("capacity_gb", "Capacity (GB)", 1, 100000, true), number("rpm", "Rotational speed (RPM)", 1000, 20000, true), number("cache_mb", "Cache (MB)", 1, 2048), select("drive_use", "Intended use", [option("desktop", "Desktop"), option("laptop", "Laptop"), option("nas", "NAS"), option("enterprise", "Enterprise / server"), option("surveillance", "Surveillance / recorder")], true), MANUFACTURER_TEXT, EXACT_MODEL, number("drive_health_percent", "Drive health (%)", 0, 100)],
  case: () => [select("case_size", "Case size", [option("full-tower", "Full Tower"), option("mid-tower", "Mid Tower"), option("mini-tower", "Mini Tower"), option("sff", "Small Form Factor"), option("itx", "ITX case"), option("cube", "Cube"), option("htpc", "Home Theater / HTPC")], true), multiselect("motherboard_support", "Motherboard compatibility", FORM_FACTORS, true), number("max_gpu_length_mm", "Maximum GPU length (mm)", 100, 700), number("max_cooler_height_mm", "Maximum CPU cooler height (mm)", 30, 300), select("psu_form_factor", "Supported PSU format", PSU_FORMS), text("drive_bays", "Drive bays"), text("fan_support", "Fan support"), text("radiator_support", "Radiator support"), select("side_panel", "Side panel", [option("solid", "Solid"), option("tempered-glass", "Tempered glass"), option("acrylic", "Acrylic"), option("mesh", "Mesh")]), boolean("rgb", "RGB / ARGB lighting"), MANUFACTURER_TEXT, EXACT_MODEL],
};

const COOLER_SOCKETS = SOCKETS.filter((item) => !["lga3647", "lga4189", "sp3", "sp5"].includes(item.value));
const COOLING_FIELDS: Record<string, readonly TaxonomyField[]> = {
  "air-cooler": [multiselect("compatible_sockets", "Compatible CPU sockets", COOLER_SOCKETS, true), number("fan_size_mm", "Fan size (mm)", 40, 240), number("tdp_w", "Verified cooling capacity (W)", 20, 1000), boolean("rgb", "RGB / ARGB lighting"), number("noise_dba", "Noise level (dBA)", 1, 100), MANUFACTURER_TEXT, EXACT_MODEL],
  "aio-cooler": [multiselect("compatible_sockets", "Compatible CPU sockets", COOLER_SOCKETS, true), select("radiator_size_mm", "Radiator size", [120, 140, 240, 280, 360, 420].map((value) => option(String(value), `${value} mm`)), true), select("fan_size_mm", "Fan size", [option("120", "120 mm"), option("140", "140 mm")]), number("tdp_w", "Verified cooling capacity (W)", 20, 1000), boolean("rgb", "RGB / ARGB lighting"), number("noise_dba", "Noise level (dBA)", 1, 100), MANUFACTURER_TEXT, EXACT_MODEL],
  "custom-loop": [select("cooling_part_type", "Custom-loop part", [option("cpu-block", "CPU water block"), option("gpu-block", "GPU water block"), option("radiator", "Radiator"), option("pump", "Pump"), option("reservoir", "Reservoir"), option("pump-reservoir", "Pump / reservoir combo"), option("fitting", "Fitting"), option("tubing", "Tubing"), option("coolant", "Coolant"), option("other", "Other custom-loop part")], true), multiselect("compatible_sockets", "Compatible CPU sockets", COOLER_SOCKETS), MANUFACTURER_TEXT, EXACT_MODEL],
  "case-fan": [select("fan_size_mm", "Fan size", [40, 60, 80, 92, 120, 140, 180, 200].map((value) => option(String(value), `${value} mm`)), true), select("fan_connector", "Connector", [option("3-pin", "3-pin DC"), option("4-pin-pwm", "4-pin PWM"), option("proprietary", "Proprietary")]), boolean("rgb", "RGB / ARGB lighting"), number("noise_dba", "Noise level (dBA)", 1, 100), MANUFACTURER_TEXT, EXACT_MODEL],
  "fan-controller": [number("fan_channels", "Fan channels", 1, 32), select("fan_connector", "Fan connector", [option("3-pin", "3-pin DC"), option("4-pin-pwm", "4-pin PWM"), option("mixed", "Mixed")]), select("lighting_connector", "Lighting control", [option("none", "None"), option("rgb-12v", "12V RGB"), option("argb-5v", "5V ARGB"), option("proprietary", "Proprietary")]), MANUFACTURER_TEXT, EXACT_MODEL],
};

const ADDITIONAL_FIELDS: Record<string, readonly TaxonomyField[]> = {
  "network-card": [select("network_type", "Network type", [option("ethernet", "Ethernet"), option("wifi", "Wi-Fi"), option("combo", "Wi-Fi & Bluetooth")], true), select("interface", "Interface", [option("pcie", "PCIe"), option("m2", "M.2"), option("usb", "USB")], true), text("network_speed", "Maximum speed"), MANUFACTURER_TEXT, EXACT_MODEL],
  "sound-card": [select("interface", "Interface", [option("pcie", "PCIe"), option("usb", "USB"), option("thunderbolt", "Thunderbolt")], true), text("audio_channels", "Audio channels"), MANUFACTURER_TEXT, EXACT_MODEL],
  "capture-card": [select("interface", "Interface", [option("pcie", "PCIe"), option("usb", "USB"), option("thunderbolt", "Thunderbolt")], true), text("capture_resolution", "Maximum capture resolution"), boolean("passthrough", "Video passthrough"), MANUFACTURER_TEXT, EXACT_MODEL],
  "expansion-card": [select("expansion_type", "Expansion type", [option("usb-controller", "USB controller"), option("sata-controller", "SATA controller"), option("sas-controller", "SAS / RAID controller"), option("serial-parallel", "Serial / parallel card"), option("m2-adapter", "M.2 adapter"), option("other", "Other expansion card")], true), select("interface", "Host interface", [option("pcie-x1", "PCIe x1"), option("pcie-x4", "PCIe x4"), option("pcie-x8", "PCIe x8"), option("pcie-x16", "PCIe x16"), option("pci", "PCI")], true), MANUFACTURER_TEXT, EXACT_MODEL],
  "optical-drive": [select("optical_type", "Drive type", [option("dvd-rom", "DVD-ROM"), option("dvd-writer", "DVD writer"), option("blu-ray-reader", "Blu-ray reader"), option("blu-ray-writer", "Blu-ray writer"), option("cd-rom", "CD-ROM / legacy")], true), select("interface", "Interface", [option("sata", "SATA"), option("ide", "IDE / PATA"), option("usb", "USB")], true), select("storage_form_factor", "Form factor", [option("5-25-inch", "5.25-inch"), option("slimline", "Slimline"), option("external", "External")]), MANUFACTURER_TEXT, EXACT_MODEL],
  "internal-adapter": [select("adapter_type", "Adapter type", [option("power", "Power adapter"), option("storage", "Storage adapter"), option("display", "Internal display adapter"), option("riser", "PCIe riser"), option("other", "Other internal adapter")], true), MANUFACTURER_TEXT, EXACT_MODEL],
  "other-pc-component": [text("component_type", "Component type", true), MANUFACTURER_TEXT, EXACT_MODEL],
};

const PRODUCT_TYPES = [
  ["cpu", "Processors"], ["gpu", "Graphics cards"], ["ram", "Memory (RAM)"], ["motherboard", "Motherboards"], ["psu", "Power supplies"], ["ssd", "Solid-state drives (SSD)"], ["hdd", "Hard drives (HDD)"], ["case", "PC cases"], ["air-cooler", "Air CPU coolers"], ["aio-cooler", "AIO liquid coolers"], ["custom-loop", "Custom liquid cooling"], ["case-fan", "Case fans"], ["fan-controller", "Fan controllers"], ["network-card", "Network / Wi-Fi cards"], ["sound-card", "Sound cards"], ["capture-card", "Capture cards"], ["expansion-card", "Expansion cards"], ["optical-drive", "Optical drives"], ["internal-adapter", "Internal adapters"], ["other-pc-component", "Other PC component"],
] as const;

export const PC_HARDWARE_ROOT: TaxonomyNode = {
  id: "pc-components",
  label: "PC Components",
  kind: "root",
  categorySlug: "pc-components",
  children: PRODUCT_TYPES.map(([id, label]) => ({ id, label, kind: "subcategory" as const, categorySlug: "pc-components" })),
};

export function getPcHardwareFields(attributes: ListingAttributes): readonly TaxonomyField[] {
  const subcategory = typeof attributes.subcategory === "string" ? attributes.subcategory : "";
  if (subcategory === "cpu") return cpuFields(attributes);
  if (subcategory === "gpu") return gpuFields(attributes);
  if (subcategory === "ram") return ramFields(attributes);
  if (subcategory === "motherboard") return motherboardFields(attributes);
  if (simpleFields[subcategory]) return simpleFields[subcategory](attributes);
  if (COOLING_FIELDS[subcategory]) return COOLING_FIELDS[subcategory];
  return ADDITIONAL_FIELDS[subcategory] ?? [];
}

const allFields = [
  ...cpuFields({ manufacturer: "intel", socket: "lga1700", cpu_family: "core-i7", cpu_generation: "12th-gen", cpu_model: "other" }),
  ...cpuFields({ manufacturer: "amd", socket: "am5", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "other" }),
  ...gpuFields({ gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "other" }),
  ...ramFields({ memory_use: "desktop" }), ...motherboardFields({ platform_vendor: "amd", socket: "am5" }), ...motherboardFields({ platform_vendor: "intel", socket: "lga1700" }),
  ...Object.values(simpleFields).flatMap((resolver) => resolver({ storage_form_factor: "m2", storage_protocol: "nvme" })),
  ...Object.values(COOLING_FIELDS).flat(), ...Object.values(ADDITIONAL_FIELDS).flat(),
];
export const PC_HARDWARE_FIELDS: readonly TaxonomyField[] = [...new Map(allFields.map((field) => [field.key, field])).values()];
export const PC_HARDWARE_FIELD_KEYS = new Set(PC_HARDWARE_FIELDS.map((field) => field.key));
export const PC_HARDWARE_MULTISELECT_KEYS = new Set(PC_HARDWARE_FIELDS.filter((field) => field.type === "multiselect").map((field) => field.key));
export const PC_HARDWARE_FILTER_KEYS = [...PC_HARDWARE_FIELD_KEYS];
export const PC_HARDWARE_OPTIONS: readonly TaxonomyOption[] = [...new Map(allFields.flatMap((field) => field.options ?? []).map((item) => [item.value, item])).values()];

const DEPENDENCIES: Record<string, Record<string, readonly string[]>> = {
  cpu: { manufacturer: ["socket", "cpu_family", "cpu_generation", "cpu_architecture", "cpu_model", "exact_model"], socket: ["cpu_family", "cpu_generation", "cpu_architecture", "cpu_model", "exact_model"], cpu_family: ["cpu_generation", "cpu_architecture", "cpu_model", "exact_model"], cpu_generation: ["cpu_architecture", "cpu_model", "exact_model"], cpu_model: ["exact_model"] },
  gpu: { gpu_chipset_vendor: ["gpu_series", "gpu_model", "gpu_model_other"], gpu_series: ["gpu_model", "gpu_model_other"], gpu_model: ["gpu_model_other"] },
  ram: { memory_use: ["ram_form_factor"] },
  motherboard: { platform_vendor: ["socket", "chipset", "ram_type"], socket: ["chipset", "ram_type"] },
  ssd: { storage_form_factor: ["storage_protocol", "interface"], storage_protocol: ["interface"] },
};

export function pcHardwareDependentKeys(subcategory: string, key: string): readonly string[] {
  return DEPENDENCIES[subcategory]?.[key] ?? [];
}

export function updatePcHardwareAttribute(attributes: ListingAttributes, key: string, value: string | number | boolean | string[] | undefined): ListingAttributes {
  const next = { ...attributes };
  if (key === "subcategory") {
    for (const fieldKey of PC_HARDWARE_FIELD_KEYS) delete next[fieldKey];
  }
  if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) delete next[key];
  else next[key] = value;
  const subcategory = typeof next.subcategory === "string" ? next.subcategory : "";
  for (const dependent of pcHardwareDependentKeys(subcategory, key)) delete next[dependent];
  return next;
}

export function validatePcHardwareAttributes(attributes: ListingAttributes): { success: true } | { success: false; error: string } {
  if (attributes.taxonomy_version !== "1") return { success: false, error: "Choose a complete PC hardware category." };
  const subcategory = typeof attributes.subcategory === "string" ? attributes.subcategory : "";
  if (!PC_HARDWARE_ROOT.children?.some((item) => item.id === subcategory)) return { success: false, error: "Choose a valid PC component type." };
  const fields = getPcHardwareFields(attributes);
  const visibleFields = new Map(fields.map((field) => [field.key, field]));
  for (const [key, value] of Object.entries(attributes)) {
    if (!PC_HARDWARE_FIELD_KEYS.has(key)) continue;
    const field = visibleFields.get(key);
    if (!field) return { success: false, error: `${key.replaceAll("_", " ")} is not valid for this selection.` };
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.length === 0 || value.some((item) => !field.options?.some((candidate) => candidate.value === item))) return { success: false, error: `Choose valid ${field.label.toLowerCase()}.` };
    } else if (Array.isArray(value)) return { success: false, error: `${field.label} cannot contain multiple values.` };
    else if (field.type === "select" && (typeof value !== "string" || !field.options?.some((candidate) => candidate.value === value))) return { success: false, error: `Choose a valid ${field.label.toLowerCase()}.` };
    else if (field.type === "text" && (typeof value !== "string" || value.trim().length === 0 || value.length > 160)) return { success: false, error: `Enter a valid ${field.label.toLowerCase()}.` };
    else if (field.type === "number" && (typeof value !== "number" || !Number.isFinite(value) || (field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max))) return { success: false, error: `Enter a valid ${field.label.toLowerCase()}.` };
    else if (field.type === "boolean" && typeof value !== "boolean") return { success: false, error: `${field.label} must be yes or no.` };
  }
  for (const field of fields) {
    const value = attributes[field.key];
    if (field.required && (value === undefined || value === "" || (Array.isArray(value) && value.length === 0))) return { success: false, error: `Enter ${field.label.toLowerCase()}.` };
  }
  if (subcategory === "ram" && typeof attributes.capacity_gb === "number" && typeof attributes.module_count === "number" && typeof attributes.module_capacity_gb === "number" && attributes.module_count * attributes.module_capacity_gb !== attributes.capacity_gb) return { success: false, error: "RAM module count and per-module capacity must equal the total capacity." };
  return { success: true };
}

const SEARCH_INTENTS = [
  { pattern: /\brtx\s*4070\b/i, attributes: { subcategory: "gpu", gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "rtx-4070" } },
  { pattern: /\bradeon\s+(?:rx\s*)?7800\s*xt\b/i, attributes: { subcategory: "gpu", gpu_chipset_vendor: "amd", gpu_series: "rx-7000", gpu_model: "rx-7800-xt" } },
  { pattern: /\barc\s*b580\b/i, attributes: { subcategory: "gpu", gpu_chipset_vendor: "intel", gpu_series: "arc-b", gpu_model: "arc-b580" } },
  { pattern: /\b(?:amd\s+)?ryzen\s*7\s*7700x\b/i, attributes: { subcategory: "cpu", manufacturer: "amd", socket: "am5", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "ryzen-7-7700x" } },
  { pattern: /\b(?:amd\s+)?ryzen\s*7\s*5800x\b/i, attributes: { subcategory: "cpu", manufacturer: "amd", socket: "am4", cpu_family: "ryzen-7", cpu_generation: "ryzen-5000", cpu_model: "ryzen-7-5800x" } },
  { pattern: /\b(?:intel\s+)?(?:core\s+)?i7[-\s]?12700k\b/i, attributes: { subcategory: "cpu", manufacturer: "intel", socket: "lga1700", cpu_family: "core-i7", cpu_generation: "12th-gen", cpu_model: "core-i7-12700k" } },
] as const;

export function inferPcHardwareIntent(query: string): { category?: string; attributes: Record<string, string>; residualQuery: string } | undefined {
  const normalized = query.trim().replace(/\s+/g, " ");
  const match = SEARCH_INTENTS.find((candidate) => candidate.pattern.test(normalized));
  if (!match) return undefined;
  const residualQuery = normalized.replace(match.pattern, " ").replace(/\s+/g, " ").trim();
  return { category: "pc-components", attributes: { ...match.attributes }, residualQuery };
}
