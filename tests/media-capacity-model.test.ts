import { describe, expect, it } from "vitest";
// @ts-expect-error Directly executable ESM operations model.
import { modelR2ImageCapacity } from "../scripts/media-capacity-model.mjs";

describe("R2 image capacity model", () => {
  it.each([
    [10000, 30000, 8.9, 3600, 84500, 0],
    [50000, 150000, 44.5, 18000, 422500, 0.53],
    [100000, 300000, 89, 36000, 845000, 1.19],
  ])("models %i source images rather than listings", (images, objects, gb, writes, reads, dollars) => {
    expect(modelR2ImageCapacity(images)).toMatchObject({ sourceImages: images, storedObjects: objects, storageGb: gb, monthlyClassAWrites: writes, monthlyClassBReads: reads, estimatedMonthlyR2Usd: dollars });
  });
});
