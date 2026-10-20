# PC Hardware Taxonomy Design

## Intent

Extend GGMarket's existing JSONB-backed gaming taxonomy into a technically accurate PC-hardware classification shared by sellers, buyers, listing display, validation, and URL-driven search. The system must be deep enough for current and second-hand hardware without pretending that a finite in-repository catalog contains every commercial SKU.

## Research matrix

Research was performed on 2026-10-16. Skroutz was used only to study category hierarchy and buyer-facing filters; manufacturer sources were used for compatibility-sensitive facts.

| Area | Verified classification and filters | Sources |
| --- | --- | --- |
| PC hardware root | Graphics cards, RAM, storage, processors, motherboards, cases, PSUs, cooling/modding, optical drives, sound cards, expansion cards, and video/capture cards are distinct product groups. | [Skroutz PC Hardware](https://www.skroutz.gr/c/27/pc-hardware.html) |
| CPU | Family and socket are separate filters. Current marketplace values include Intel Core/Core Ultra/Pentium/Celeron/Xeon and AMD Ryzen/Ryzen PRO/Threadripper/EPYC; sockets include AM4, AM5, LGA1200, LGA1700, LGA1851, and workstation sockets. Core Ultra desktop Series 2 uses LGA1851 and is not a numbered Core-i generation. Ryzen 7000 is Zen 4/AM5. | [Skroutz CPUs](https://www.skroutz.gr/c/32/cpu-epeksergastes.html), [Intel Core Ultra Series 2 compatibility](https://www.intel.com/content/www/us/en/support/articles/000099656/processors.html), [AMD Ryzen 5 7600](https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html), [AMD AM5 chipsets](https://www.amd.com/en/products/processors/chipsets/am5.html), [AMD AM4 chipsets](https://www.amd.com/en/products/processors/chipsets/am4.html) |
| GPU | Chipset vendor, GPU model, VRAM, and board manufacturer are separate dimensions. Skroutz separates NVIDIA, AMD, and Intel chipset vendors; NVIDIA documents RTX 50/40 families, AMD documents RX 9000/7000/6000, and Intel supports Arc B/A series. | [Skroutz GPUs](https://www.skroutz.gr/c/55/kartes-grafikwn.html), [NVIDIA graphics families](https://www.nvidia.com/en-us/geforce/graphics-cards/), [AMD Radeon graphics](https://www.amd.com/en/products/graphics/desktops/radeon.html), [Intel Arc support](https://www.intel.com/content/www/us/en/support/products/237605/graphics/processor-graphics/intel-arc-graphics.html) |
| RAM | Useful filters are DDR generation, total capacity, desktop/laptop/server use, and module count. DIMM and SO-DIMM must not mix. Effective DDR speed is measured in MT/s, not MHz; capacity and module count must agree. | [Skroutz RAM](https://www.skroutz.gr/c/56/mnhmes-pc-ram.html), [Kingston MT/s vs MHz](https://www.kingston.com/en/blog/pc-performance/mts-vs-mhz) |
| Motherboard | Socket, chipset, form factor, memory generation, and manufacturer are independent. Socket constrains chipset; even matching sockets can still require a BIOS/vendor support check. | [Skroutz motherboards](https://www.skroutz.gr/c/31/motherboards-mhtrikes.html), [Intel LGA1851 incompatibility](https://www.intel.com/content/www/us/en/support/articles/000099723/processors.html), [AMD AM5 chipsets](https://www.amd.com/en/products/processors/chipsets/am5.html) |
| PSU | Wattage, 80 PLUS certification, modularity, form factor, and ATX generation are distinct. Cybenetics data must remain a separate certification dimension. | [Skroutz PSUs](https://www.skroutz.gr/c/30/psu-trofodotika.html), [Cybenetics methodology](https://www.cybenetics.com/attachs/85.pdf) |
| SSD/HDD | Capacity and form factor are core filters. M.2 is a form factor; NVMe is a protocol. HDD adds 2.5/3.5-inch, SATA/SAS, RPM, cache, and intended use. | [Skroutz SSDs](https://www.skroutz.gr/c/88/ssd-sklhroi-diskoi.html), [Skroutz HDDs](https://www.skroutz.gr/c/1715/hdd-hard-drives.html) |
| Cases | Case size, motherboard compatibility, cooling support, and manufacturer are separate filters. Multiple motherboard sizes may be compatible with one case. | [Skroutz cases](https://www.skroutz.gr/c/28/computer-cases.html) |
| Cooling | Air coolers, AIOs, custom-loop parts, case fans, and controllers are distinct. CPU coolers commonly support multiple Intel and AMD sockets; AIOs add radiator/fan size. | [Skroutz CPU coolers](https://www.skroutz.gr/c/673/cpu-fans.html), [Skroutz AIO cooling](https://www.skroutz.gr/c/677/water-cooling.html) |

## Architecture

- `lib/pc-hardware-taxonomy.ts` owns PC component data, compatibility maps, stable controlled values, dependency ordering, validation, pruning, and search aliases.
- `lib/gaming-taxonomy.ts` remains the public taxonomy facade. It composes the PC root into the established taxonomy and exposes shared field/path/filter functions.
- Existing coarse database category `pc-components` remains unchanged. Product type and technical dimensions remain in `listings.attributes` with `taxonomy_version: "1"`.
- No migration is required. Existing JSONB containment queries and the current GIN-backed storage contract remain authoritative.
- Seller fields and buyer filters are generated from the same resolved field definitions. A dependency-changing selection removes incompatible descendants before submission or URL navigation.
- Exact-model catalogs contain only verified representative models. Every model-driven category offers `other`, which reveals a bounded `exact_model` field. Free text is trimmed and validated but never treated as verified compatibility data.
- Legacy listings without structured PC fields stay visible through top-level browsing and text search. Ordinary edits preserve their unknown attributes. Narrow exact filters match only structured metadata.

## Stable PC product types

`cpu`, `gpu`, `ram`, `motherboard`, `psu`, `ssd`, `hdd`, `case`, `air-cooler`, `aio-cooler`, `custom-loop`, `case-fan`, `fan-controller`, `network-card`, `sound-card`, `capture-card`, `expansion-card`, `optical-drive`, `internal-adapter`, and `other-pc-component`.

## Dependency rules

- CPU: manufacturer → socket → family → generation/series → verified model. Intel Core Ultra Series 2 is limited to LGA1851; numbered 12th–14th-generation Core is LGA1700. AMD Ryzen 1000–5000 uses AM4 where applicable; Ryzen 7000–9000 uses AM5. Legacy/workstation families expose their own sockets and a controlled fallback.
- GPU: chipset manufacturer → generation/family → GPU model. Board manufacturer and exact board model remain separate.
- RAM: device class constrains form factor. Total capacity, module count, and per-module capacity must multiply consistently. Speed uses MT/s.
- Motherboard: platform → socket → chipset. Memory generation is constrained where unambiguous, while LGA1700 permits DDR4 or DDR5 variants.
- Storage: SSD form factor and protocol are independent; HDD form factor, interface, RPM, cache, and use remain separate.
- Cooling: compatible sockets and case motherboard compatibility are controlled multi-value fields.

## Seller behavior

- Product type remains the first PC-specific choice.
- Technical fields appear progressively as prerequisites are chosen.
- Required identity fields are concise; advanced specifications are optional.
- Changing a parent immediately clears incompatible descendants while preserving unrelated listing content.
- Create, edit, preview, API validation, and detail display all use the same stable keys and labels.

## Buyer behavior

- Desktop sidebar and mobile sheet use the same dependent definitions.
- Dependency changes update the URL immediately, remove invalid descendants, preserve search/price/condition/location, and retain back/forward history.
- Active chips and breadcrumbs use human-readable labels.
- JSONB filters preserve scalar, numeric, boolean, and controlled-array types.
- Structured search recognizes verified representative CPU/GPU models without inferring compatibility from arbitrary listing titles.

## Security and compatibility

- Attribute strings are bounded and trimmed; arrays are accepted only for fields declared `multiselect`.
- API authentication, seller scoping, product lookup, RLS, and current database category rows remain unchanged.
- No background recategorization, production write, migration, RLS change, service-role test, fake listing, or secret access is part of this work.

## Acceptance

Pure tests must cover the requested CPU, GPU, RAM, motherboard, PSU, storage, cooling, fallback, pruning, search, filtering, and legacy-preservation cases. Browser tests must cover URL-driven dependent filters in Chromium and WebKit, including narrow mobile sheets and hydration reliability. Authenticated persistence remains fixture-driven unless a disposable Supabase project is separately authorized.
