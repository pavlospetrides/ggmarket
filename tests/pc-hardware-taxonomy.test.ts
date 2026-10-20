import { describe, expect, it } from "vitest";
import {
  PC_HARDWARE_ROOT,
  getPcHardwareFields,
  inferPcHardwareIntent,
  updatePcHardwareAttribute,
  validatePcHardwareAttributes,
} from "../lib/pc-hardware-taxonomy";

const valid = (attributes: Record<string, string | number | boolean | string[]>) =>
  validatePcHardwareAttributes({ taxonomy_version: "1", ...attributes });

describe("PC hardware taxonomy", () => {
  it("covers the internal hardware categories used by current and second-hand sellers", () => {
    expect(PC_HARDWARE_ROOT.children?.map((item) => item.id)).toEqual([
      "cpu", "gpu", "ram", "motherboard", "psu", "ssd", "hdd", "case",
      "air-cooler", "aio-cooler", "custom-loop", "case-fan", "fan-controller",
      "network-card", "sound-card", "capture-card", "expansion-card", "optical-drive",
      "internal-adapter", "other-pc-component",
    ]);
  });

  it.each([
    ["Intel Core i7 12th generation", { subcategory: "cpu", manufacturer: "intel", socket: "lga1700", cpu_family: "core-i7", cpu_generation: "12th-gen", cpu_model: "core-i7-12700k" }],
    ["Intel Core Ultra Series 2", { subcategory: "cpu", manufacturer: "intel", socket: "lga1851", cpu_family: "core-ultra-7", cpu_generation: "core-ultra-series-2", cpu_model: "core-ultra-7-265k" }],
    ["AMD Ryzen 7 AM4", { subcategory: "cpu", manufacturer: "amd", socket: "am4", cpu_family: "ryzen-7", cpu_generation: "ryzen-5000", cpu_model: "ryzen-7-5800x" }],
    ["AMD Ryzen 7 AM5", { subcategory: "cpu", manufacturer: "amd", socket: "am5", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "ryzen-7-7700x" }],
  ])("accepts %s as a verified processor path", (_label, attributes) => {
    expect(valid(attributes)).toEqual({ success: true });
  });

  it("does not treat Intel generations and AMD sockets as interchangeable dimensions", () => {
    expect(valid({ subcategory: "cpu", manufacturer: "intel", socket: "am4", cpu_family: "core-i7", cpu_generation: "12th-gen", cpu_model: "core-i7-12700k" }).success).toBe(false);
    expect(valid({ subcategory: "cpu", manufacturer: "intel", socket: "lga1700", cpu_family: "core-ultra-7", cpu_generation: "core-ultra-series-2", cpu_model: "core-ultra-7-265k" }).success).toBe(false);
    expect(valid({ subcategory: "cpu", manufacturer: "amd", socket: "am4", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "ryzen-7-7700x" }).success).toBe(false);
  });

  it.each([
    ["NVIDIA RTX 4070", { subcategory: "gpu", gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "rtx-4070", manufacturer: "asus", exact_model: "TUF Gaming RTX 4070" }],
    ["AMD Radeon RX 7800 XT", { subcategory: "gpu", gpu_chipset_vendor: "amd", gpu_series: "rx-7000", gpu_model: "rx-7800-xt", manufacturer: "sapphire", exact_model: "Pulse RX 7800 XT" }],
    ["Intel Arc B580", { subcategory: "gpu", gpu_chipset_vendor: "intel", gpu_series: "arc-b", gpu_model: "arc-b580", manufacturer: "intel", exact_model: "Limited Edition" }],
  ])("keeps GPU chipset and board manufacturer separate for %s", (_label, attributes) => {
    expect(valid(attributes)).toEqual({ success: true });
  });

  it("rejects a GPU model from another chipset generation", () => {
    expect(valid({ subcategory: "gpu", gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "rx-7800-xt", manufacturer: "asus", exact_model: "Impossible card" }).success).toBe(false);
  });

  it("validates desktop and laptop RAM form factors and kit arithmetic", () => {
    expect(valid({ subcategory: "ram", memory_use: "desktop", ram_form_factor: "dimm", ram_type: "ddr5", capacity_gb: 32, module_count: 2, module_capacity_gb: 16, speed_mts: 6000 })).toEqual({ success: true });
    expect(valid({ subcategory: "ram", memory_use: "laptop", ram_form_factor: "so-dimm", ram_type: "ddr4", capacity_gb: 16, module_count: 2, module_capacity_gb: 8, speed_mts: 3200 })).toEqual({ success: true });
    expect(valid({ subcategory: "ram", memory_use: "laptop", ram_form_factor: "dimm", ram_type: "ddr4", capacity_gb: 16, module_count: 2, module_capacity_gb: 8, speed_mts: 3200 }).success).toBe(false);
    expect(valid({ subcategory: "ram", memory_use: "desktop", ram_form_factor: "dimm", ram_type: "ddr5", capacity_gb: 32, module_count: 2, module_capacity_gb: 8, speed_mts: 6000 }).success).toBe(false);
  });

  it("offers only chipsets valid for the selected motherboard socket", () => {
    const am5Chipsets = getPcHardwareFields({ subcategory: "motherboard", platform_vendor: "amd", socket: "am5" }).find((field) => field.key === "chipset")?.options?.map((item) => item.value);
    const lga1700Chipsets = getPcHardwareFields({ subcategory: "motherboard", platform_vendor: "intel", socket: "lga1700" }).find((field) => field.key === "chipset")?.options?.map((item) => item.value);
    expect(am5Chipsets).toEqual(expect.arrayContaining(["a620", "b650", "b650e", "b850", "x670", "x670e", "x870", "x870e"]));
    expect(am5Chipsets).not.toContain("z790");
    expect(lga1700Chipsets).toEqual(expect.arrayContaining(["h610", "b660", "z690", "b760", "z790"]));
    expect(lga1700Chipsets).not.toContain("b650");
    expect(valid({ subcategory: "motherboard", platform_vendor: "amd", socket: "am5", chipset: "z790", form_factor: "atx", ram_type: "ddr5", exact_model: "Invalid board" }).success).toBe(false);
  });

  it("keeps PSU efficiency and Cybenetics certification as separate systems", () => {
    expect(valid({ subcategory: "psu", wattage: 850, modularity: "fully-modular", efficiency: "80-plus-gold", cybenetics_efficiency: "cybenetics-platinum", psu_form_factor: "atx", exact_model: "RM850x" })).toEqual({ success: true });
  });

  it.each([
    ["M.2 NVMe SSD", { subcategory: "ssd", storage_form_factor: "m2", storage_protocol: "nvme", interface: "pcie-4", capacity_gb: 1000, exact_model: "990 PRO" }],
    ["2.5-inch SATA SSD", { subcategory: "ssd", storage_form_factor: "2-5-inch", storage_protocol: "ahci", interface: "sata-iii", capacity_gb: 1000, exact_model: "870 EVO" }],
    ["legacy HDD", { subcategory: "hdd", storage_form_factor: "3-5-inch", interface: "sata-iii", capacity_gb: 2000, rpm: 7200, drive_use: "desktop", exact_model: "Barracuda" }],
  ])("models %s without conflating form factor and protocol", (_label, attributes) => {
    expect(valid(attributes)).toEqual({ success: true });
  });

  it("supports multi-socket coolers and multi-format cases", () => {
    expect(valid({ subcategory: "air-cooler", compatible_sockets: ["am4", "am5", "lga1700", "lga1851"], fan_size_mm: 120, exact_model: "Freezer 36" })).toEqual({ success: true });
    expect(valid({ subcategory: "case", case_size: "mid-tower", motherboard_support: ["atx", "micro-atx", "mini-itx"], psu_form_factor: "atx", exact_model: "North" })).toEqual({ success: true });
  });

  it("clears every incompatible CPU descendant when the manufacturer changes", () => {
    expect(updatePcHardwareAttribute({
      subcategory: "cpu", manufacturer: "intel", socket: "lga1700", cpu_family: "core-i7",
      cpu_generation: "12th-gen", cpu_architecture: "alder-lake", cpu_model: "core-i7-12700k",
      cores: 12, seller_note: "Receipt included",
    }, "manufacturer", "amd")).toEqual({
      subcategory: "cpu", manufacturer: "amd", cores: 12, seller_note: "Receipt included",
    });
  });

  it("recognizes verified CPU and GPU model searches as structured intent", () => {
    expect(inferPcHardwareIntent("RTX 4070")).toEqual({
      category: "pc-components",
      attributes: { subcategory: "gpu", gpu_chipset_vendor: "nvidia", gpu_series: "rtx-40", gpu_model: "rtx-4070" },
      residualQuery: "",
    });
    expect(inferPcHardwareIntent("Ryzen 7 7700X")).toEqual({
      category: "pc-components",
      attributes: { subcategory: "cpu", manufacturer: "amd", socket: "am5", cpu_family: "ryzen-7", cpu_generation: "ryzen-7000", cpu_model: "ryzen-7-7700x" },
      residualQuery: "",
    });
  });
});
