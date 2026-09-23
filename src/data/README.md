# Public reference snapshot

`colvir-snapshot.json` is a sanitized capture of public BCC Leasing reference responses taken on 2026-09-23. Each capture retains its original timestamp. It includes no prices, customer data, credentials, or partner contact/legal details.

Catalog fields are limited to model/brand/partner identifiers and names, passenger vehicle classification, and available years. Tariffs are saved for model 2875 and six separately researched passenger model IDs (2769, 2059, 2488, 2715, 2717, 2637), for both IP and TOO.

The server adapter identifies fallback data with `source: "snapshot"`. Unknown offline model tariffs remain empty. `checkedAt` is the earliest timestamp of the source records used, not the time the fallback was served. No quote from a snapshot is an approved contract or confirmation of current availability.

Set `COLVIR_MODE=snapshot` to avoid network requests for repeatable local demos. The default mode attempts allowlisted reference API reads and falls back to this snapshot on service errors.
