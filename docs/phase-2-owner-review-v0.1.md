# Siomai Street franchise requirements and owner review pack

**Version:** 0.1.0 · **Prepared:** 27 October 2026 · **Status:** PROPOSED — OWNER REVIEW REQUIRED

**Purpose:** Agree on one set of franchise business requirements before changing the website, backend or reviewer workflow. The fast-food owner is the final business approver, as confirmed by the project lead. The project team prepares the proposals; the classmate owns website–app integration. Neither delegation nor this document authorizes production database changes.

This document is the single requirements matrix for Phase 2. Pricing, timing, retention periods and collection changes below are proposals, not verified commercial facts, legal conclusions or public promises. Current behavior is recorded separately. Blank approval cells mean no approval. Nothing in the live application has been changed by preparing this pack.

## 1. How to approve this document

Use **Approve / Revise / Reject / Not applicable** against the decision IDs. A revision must state the replacement rule. The owner signs the resulting version after commercial costing and privacy/legal review. Approval of the general direction does not fill missing prices, legal entity names or contact details.

| Record | Value |
|---|---|
| Business/legal entity operating Siomai Street | OWNER TO PROVIDE exact registered name |
| Owner/authorized business approver | OWNER TO PROVIDE name and authority |
| Franchise review lead and backup | OWNER TO NOMINATE |
| Privacy contact / designated DPO where applicable | OWNER TO NOMINATE; legal reviewer confirms designation |
| Legal reviewer | OWNER TO NOMINATE |
| Website delivery owner | Project lead; individual to record |
| App/database integration owner | Classmate, delegated by project lead; individual to record |
| Owner approval date / evidence | NOT YET APPROVED |
| Effective business date | NOT SET |
| Implementation release / test report | NOT IMPLEMENTED; this is a proposal |

**Confirmed project facts:** website intake and app-based administrator review belong to one connected S.I.O.M.A.I. system; Administrator, Staff and Franchisee are the stated authenticated roles. A prospective applicant is not automatically an operational Franchisee account. Integration is delegated, not verified complete.

## 2. Conflicts requiring explicit decisions

| ID | Observed evidence | Proposed resolution | Owner decision |
|---|---|---|---|
| C01 | Home: Starter PHP 39,999; Kiosk PHP 149,999; Full Store PHP 299,999. Application: Food Cart PHP 150,000; Kiosk PHP 300,000; Casual Dining PHP 500,000. | Adopt one costed catalogue; do not pick a price just because it appears in code. Use section 3 as the costing and approval sheet. | Pending |
| C02 | FAQ says no monthly royalties; supplied app requirements include royalty tracking. | Default proposal is no percentage royalty for these three packages, subject to owner confirmation. Keep royalty tracking configurable for other/future agreements; do not impose a fee merely because the module exists. | Pending |
| C03 | Home says all-inclusive/no hidden fees; inclusions do not define rent, permits, taxes or working capital. | Publish package subtotal, itemized inclusions and exclusions; use written site-specific quotations. | Pending |
| C04 | Journey promises review within 24 hours; FAQ says opening in 2–4 weeks. | Replace with measured working-day targets and a conditional launch plan in section 8. | Pending |
| C05 | FAQ accepts beginners; validation always requires job title/company. | Support never-employed, self-employed and employed histories without fictional answers. | Pending |
| C06 | Five sensitive documents are mandatory at initial submission; no staged verification workflow. | Initial interest assessment first; request necessary evidence from shortlisted applicants through a private verification task. | Pending |
| C07 | Privacy page specifies two years from submission or agreement duration; no confirmed deletion workflow. | Approve per-category schedule in section 9 and implement deletion before promising it. | Pending |
| C08 | Final checklist claims an NDA/background authorization has been signed; form stores booleans, not a complete signing process. | Use accurate acknowledgment wording, versioned acceptance records and separate reviewed agreements when needed. | Pending |
| C09 | Broad background-check wording mentions employment/consumer reports. | Franchise-specific, purpose-limited checks with named sources/providers and separate authorization. | Pending |
| C10 | Public contacts, privacy mailbox and office hours exist in code but have not been verified. | Verify ownership, delivery and staffing before publication. No invented contact replacements. | Pending |
| C11 | FAQ promotes ROI in 3–6 months; other copy implies strong returns. | Remove unsubstantiated performance claims after approval; publish only supported, qualified figures with period, costs and assumptions. | Pending |

## 3. Package pricing sheet and commercial terms

### 3.1 Draft catalogue

The lower figures below are **existing homepage figures carried forward solely as costing candidates**. They are not a market valuation, sustainable-price assessment or recommendation to sell at that amount. The owner may replace them after costing. Proposed names standardize formats without claiming that the conflicting packages have identical contents.

| ID / code | Proposed customer name | Existing home candidate | Conflicting application amount | Approved price / tax treatment / effective date |
|---|---|---:|---:|---|
| P01 / `food-cart` | Food Cart Package | PHP 39,999 | PHP 150,000 | UNAPPROVED; owner must complete |
| P02 / `kiosk` | Kiosk Package | PHP 149,999 | PHP 300,000 | UNAPPROVED; owner must complete |
| P03 / `casual-dining` | Store / Casual Dining Package | PHP 299,999 | PHP 500,000 | UNAPPROVED; owner must confirm format/name and amount |

**Proposed advertised amount:** package price only, not total startup funding. A quotation must state whether tax is included, the issuing legal entity, validity date, territory and exact package revision. Never display a blank or unknown fee as zero.

### 3.2 Proposed inclusion schedule

These scopes are drafted from existing claims. Quantities, suppliers, sizes and costs require the owner's signed bill of materials before a price is approved.

| Item | Food Cart | Kiosk | Store / Casual Dining | Specification required before sale |
|---|---|---|---|---|
| Structure | Standard branded cart | Standard kiosk fabrication | Standard approved store fit-out scope | Dimensions, material, drawings, site assumptions, exclusions; do not promise unlimited construction |
| Equipment | Serving/preparation equipment schedule | Equipment schedule matched to kiosk capacity | Equipment schedule matched to store capacity | Item, brand/model or equivalent, quantity, warranty and replacement responsibility |
| Opening stock | Itemized starter stock | Itemized starter stock | Itemized starter stock | SKU, quantity, expiry, delivery condition; avoid undefined basic/extended/maximum stock |
| Packaging | Starter branded packaging | Starter branded packaging | Starter branded packaging | Quantity per SKU; replenishment price list |
| Training | Initial operator training | Initial operator/manager training | Initial operator/manager training | Proposed two attendees and up to three training days per location, subject to actual curriculum/capacity approval |
| Operating materials | Current operations manual | Same | Same | Access period, revision distribution, language, confidentiality and return obligations |
| Site support | Initial remote location review | Remote review and scheduled site assessment | Remote review and scheduled site assessment | Included visits, travel charges, scope of feasibility advice; no sales guarantee |
| Opening marketing | Digital starter materials | Starter materials and opening plan | Starter materials and opening plan | Deliverables, approval process, paid advertising allowance if any |
| Opening assistance | Remote checklist support | Scheduled assistance | Scheduled assistance | Personnel, hours, travel and rescheduling limits |
| Software | Access terms stated separately | Access terms stated separately | Access terms stated separately | App availability, user limits, devices, internet, support, subscription amount and term; development scope is not delivered service evidence |
| Hiring assistance | Not proposed as recruitment service | Guidance only | Guidance only | Franchisee remains employer; any actual recruitment service needs separate scope |

### 3.3 Proposed exclusions and payment rules

| ID | Proposed rule | Owner evidence / decision needed |
|---|---|---|
| P04 | Exclude rent, lease deposits, site acquisition, permits, local professional fees, utilities/deposits, payroll, working capital and owner living expenses unless explicitly itemized as included. | Approve each exclusion; reconcile marketing copy |
| P05 | Nonstandard construction, electrical/plumbing/fire works, mall bonds, transport outside quoted area and staff travel/accommodation require separate estimates. | Site assumptions and service-area map |
| P06 | Application and preliminary screening fee: PHP 0 proposed. No payment card, bank-login, OTP or payment proof in initial application. | Owner accepts free intake |
| P07 | Recurring percentage royalty: 0% proposed, reflecting current FAQ only. Marketing fund: PHP 0 proposed. Software/support charges: not priced; publish only after owner fixes amount or explicitly includes them. Supply purchases, delivery and taxes remain separately disclosed. | Owner signs complete fee schedule; finance confirms sustainability |
| P08 | No reservation/payment collection before a written quotation, applicable disclosures and reviewed agreement are provided. | Authorized payment stage and payee |
| P09 | Payment milestones, cancellation/refund rules, renewals, transfer, relocation and termination fees must be priced/defined in the signed agreement; until then the system does not collect money or imply nonrefundable terms. | Owner and legal reviewer finalize; cannot infer from code |
| P10 | Proposed quote validity: 30 calendar days. No automatic price substitution after acceptance; expired quotes require reconfirmation. | Owner approval and supplier price stability |
| P11 | Franchise rights term, renewal rights and exclusivity are NOT SET. No exclusivity is promised before a written approved territory schedule. | Legal agreement and map |
| P12 | Require a funding plan for package + site costs + opening costs + proposed three months' operating reserve. The reserve is planning guidance, not a guaranteed sufficiency threshold. | Finance approves local cost assumptions; alternatives reviewed individually |

**Costing worksheet for each package:** equipment + fabrication/fit-out + opening stock + packaging + training labor + delivery + launch support + software/service commitments + warranty provision + overhead allocation + applicable taxes = fully loaded cost. Record supplier quotation/date, unit quantity, cost owner and exclusions for every line. Calculate margin as `(net selling price − fully loaded cost) / net selling price`; the owner sets the target. No margin or ROI has been verified here.

**Release rule:** P01–P12 must be resolved or explicitly nonapplicable before package claims are published. A quote-only interim display is acceptable if the owner approves it; it must not imply the candidate prices are confirmed.

## 4. Eligibility, applicant types and operator expectations

| ID | Current state | Proposed business rule | Approval / acceptance evidence |
|---|---|---|---|
| E01 | Primary applicant must be 18+ by DOB validation | Adult representative, able to enter the relevant agreements; age threshold remains 18. Identity/legal capacity reviewed at verification. | Owner/legal approval; underage test rejected without collecting ID images |
| E02 | Individual and co-applicant Yes path | Support individual/sole proprietor and joint applicants. Proposed partnership/corporation path needs legal entity and authorized representative. Do not treat a company as a person or require marital status for an entity. | Owner approves types; integration team defines entity schema |
| E03 | Citizenship includes foreign/dual/other | Accept an inquiry without promising eligibility. Route foreign ownership/representation issues to qualified review; nationality alone must not silently approve or reject. | Legal reviewer documents criteria |
| E04 | No prior business experience required in FAQ | Beginners welcome; allow no employment history and self-employment; request relevant experience only where applicable. | Owner approval; blank history valid for explicit no-history choice |
| E05 | Full-time, passive-with-manager and multi-unit options exist | Require an accountable operator before onboarding. Passive investors nominate a trained manager; multi-unit applicants receive capacity/site review for each location. | Owner defines operator availability and training completion |
| E06 | Capital ranges are collected, not a package-specific qualification gate | No automated rejection based solely on a range. Assess available funding and actual approved site budget; distinguish available savings from unapproved borrowing. | Written human evaluation rubric |
| E07 | No-site and exploring paths exist | A site is not required for initial application. Lease commitments should wait for site evaluation; no location or opening date is guaranteed by submission. | No-site test can complete |
| E08 | Yes/No bankruptcy and pending-case statements | Do not automatically reject based on a disclosure. Assess relevant, verified information with correction opportunity. Approve whether these questions are necessary at all before retaining them. | Privacy/legal scope and reasoned decision criteria |
| E09 | Training/support claims without attendance rules | Operator must complete approved training and opening checklist before activation. Accessibility or scheduling accommodations can be reviewed by a named lead. | Training curriculum, competency criteria and escalation owner |
| E10 | Same data serves website and admin app | Approval of an application does not itself grant branch, POS or financial access. Operational access follows onboarding and explicit role/branch assignment. | Authorization tests in classmate's integration |

## 5. Field requirements matrix

**Legend:** R required; O optional; C conditional; V verification; N onboarding; X omit from initial intake. Current status means validation in `shared/application.js`, not approved policy. All proposed statuses below await owner approval. A field listed O is still validated when supplied. New fields are proposals, not currently implemented.

| ID | Field keys / information | Current rule | Proposed rule and purpose | Approval dependency |
|---|---|---|---|---|
| F01 | `liquidCapital` | R | R range for package discussion; not automatic eligibility decision | P12, E06 |
| F02 | `ownedBusiness` | R | R Yes/No; reuse in business history rather than ask twice | E04 |
| F03 | `franchiseType` | R, unsure allowed | R, preserve unsure; later package may remain undecided at initial intake | P01–P03 |
| F04 | `territory` | R listed region | R preferred service region; distinguish supported operations from all selectable regions | E07 |
| F05 | `ownershipIntention` | R | R operator/passive/multi-unit; conditionally request manager plan | E05 |
| F06 | `openingTimeline` | R, exploring allowed | R, preserve exploring; no deadline guarantee | E07 |
| F07 | `firstName`, `lastName` | R, 100 characters each | R for representative identity/contact; support legitimate naming exceptions through review | E01–E02 |
| F08 | `middleName` | O | O; never require invented middle name | E01 |
| F09 | `dateOfBirth` | R, age 18+ | Initial R adult declaration; full DOB C at V if needed for identity/age verification | E01, privacy |
| F10 | `citizenship` | R | C at V where legal eligibility assessment needs it; initial entity/jurisdiction routing instead | E03, legal |
| F11 | `address` | R full residential address | Initial R city/province only; full address C at V/contract stage | Privacy/document policy |
| F12 | `primaryPhone` | R, 7–15 digits after normalization | R phone with country code; support international formats. Do not claim format validation proves ownership. | Contact verification design |
| F13 | `secondaryPhone` | O | O; remove if no operational purpose | Privacy |
| F14 | `email`, `confirmEmail` | R; normalized match | R; confirm matches; later verify mailbox ownership through a separate link/OTP flow | Integration |
| F15 | `govIdType`, `govIdNumber` | R | X at initial intake; C at V. Prefer verification result and limited reference over retaining complete ID number. | D01, legal/privacy |
| F16 | `emergencyName`, `emergencyRelationship`, `emergencyPhone` | O | X initially; C at N only for defined training/site-safety purpose. Inform third-party contact; separate from financial eligibility. | Privacy and training owner |
| F17 | `hasCoApplicant` | O; Yes activates fields | R explicit Yes/No proposed; define co-applicant's role and invitation before collecting their data | E02 |
| F18 | `coApplicant` with `firstName`, `lastName`, `email`, `phone` | C R when Yes | C; invitation/contact first, participant supplies or confirms own details and notices | Privacy; invitation flow |
| F19 | `maritalStatus` | R | X initially. C later only if reviewer documents a specific legal/contract purpose; not a general eligibility score | Legal/privacy |
| F20 | `jobTitle`, `company` | R | C R for each declared employment/self-employment record; no-history branch exempt | E04 |
| F21 | `jobStartDate`, `jobEndDate`, `currentEmployment` | O; supplied dates checked | C dates for declared history; current employment means no end date. Allow month/year precision if owner accepts it | E04; schema change |
| F22 | `industry`, `keyResponsibilities` | O | O relevant work context; avoid mandatory essay for every job | E04 |
| F23 | `additionalPositions[]` | O, max 20; title/company R when added | O repeatable history; same conditional rules as first position; removal must remove review/payload data | E04 |
| F24 | `additionalPositions[].id` | Technical row identifier | System generated; not an applicant question or business eligibility criterion | Engineering |
| F25 | `priorBusinessOwned`, `priorBusinessDescription` | O | Reuse F02; C brief description when Yes; no fabricated trading history | E04 |
| F26 | `foodIndustryExperience` | O | O; No remains valid | E04 |
| F27 | `largestTeamSize`, `managementYears`, `operationalExperience[]` | O | O, zero/none acceptable; nonnegative numeric count where supplied | E04 |
| F28 | `personallyOperate`, `weeklyHours` | O | R proposed for operational plan; C named manager plan when not personally operating | E05 |
| F29 | `totalLiquidCapital` | R positive PHP amount | R proposed available-funds estimate at detailed application; allow an explicitly pending funding path rather than invented positive funds | E06; finance approval |
| F30 | `investmentSources[]` | R nonempty | R; C explanation for Other/loan/partner funding; do not request bank account access | E06 |
| F31 | `activeIncome`, `primaryIncomeSource`, `existingDebts` | O | O initially; if necessary, ask ability to fund reserve rather than broad debt details; relevant verification later | Finance/privacy |
| F32 | `neverBankruptcy`, `noPendingCases` | O | X initially; C at V only after approved scope. Replace negative statements with unambiguous question if retained | E08, L02 |
| F33 | `whyInterested` | R, minimum 100 words | R short explanation; propose 50–300 words rather than 100 minimum alone | Owner editorial approval |
| F34 | `personalValues` | R, minimum 50 words | O short answer, proposed maximum 200 words; avoid unnecessary duplicate essays | Owner editorial approval |
| F35 | `brandValues[]` | R exactly 3 | Retain exactly 3 for now; make limit visible | Owner confirmation |
| F36 | `brandValuesExplanation` | R, minimum 100 words | C when values selected, proposed 50–300 words | Owner editorial approval |
| F37 | `discoveryDayInterest` | R | R preference; remote/not-now remain valid; no automatic rejection | E09 |
| F38 | `selectedPackage` | R one of 3 | R preference or undecided at initial stage; final package confirmed in quote | P01–P03; new option approval |
| F39 | `targetRegion`, `targetCity` | R | R, prefill prior region and permit correction | E07 |
| F40 | `siteTypes[]` | R nonempty | C when a site/type is known; no-site-yet applicant may request help | E07 |
| F41 | `hasSpecificLocation` | R | R; C site city/address, approximate size, tenure and availability when Yes; no lease required initially | E07; proposed new fields |
| F42 | `openToAlternative` | R | R; respect No without auto-rejection | E07 |
| F43 | `planOpeningTimeline` | R | Reuse F06 and confirm; distinguish desired date from committed launch | Section 8 |
| F44 | `multipleUnits` | O | C R if multi-unit intention; request indicative count and phased plan | E05 |
| F45 | `additionalPlanDetails` | O | O, proposed 2,000-character cap; warn against pasting sensitive documents | Privacy |
| F46 | `documents` and all ten document keys | 5 R, 5 O | Governed individually by section 6; stage-aware enforcement | D01–D10 |
| F47 | `consent_nda` | R true | Move formal NDA to pre-disclosure stage; no universal initial NDA checkbox | L01 |
| F48 | `consent_backgroundCheck` | R true | Separate, scoped authorization at V when checks are actually requested | L02 |
| F49 | `consent_accuracy` | R true | Retain explicit accuracy declaration; permit correction through controlled workflow | L03 |
| F50 | `consent_privacy` | R true | Notice acknowledgment plus purpose-specific consent only where legally appropriate; do not bundle marketing | L04; legal/privacy |
| F51 | `checklist_accurate` | R true | Retain as final confirmation or consolidate with F49 after owner approval | L03 |
| F52 | `checklist_nda` | R true, claims signed documents | C only if a separate agreement was actually executed; otherwise remove this claim | L01–L02 |
| F53 | `checklist_documents` | R true | C confirms only documents required at the current stage; not five universal initial uploads | D01–D10 |
| F54 | `checklist_noGuarantee` | R true | Retain explicit no-approval/no-income guarantee acknowledgment | L03 |
| F55 | Proposed `applicantType`, `entityName`, `registrationJurisdiction`, `representativeRole` | Absent | R applicant type; C entity/representative details; authority documents at V | E02 |
| F56 | Proposed `operatorPlan`, `fundingStatus`, `siteDetails`, `coApplicantInvitation` | Absent | C by ownership/funding/site/co-applicant branch; specify keys in implementation contract after approval | E05–E07 |

**Cross-field policy:** no hidden mandatory question; no visual default without a stored answer; only applicable branches required. If a branch is disabled, remove unnecessary associated personal data from the submission rather than merely hiding it. Requiredness, accepted options, limits and review labels must be mirrored in shared validation and the app's reviewer view. Store a requirements version with every application; do not retroactively reject old applications under newer rules.

**Proposed format rules:** trim surrounding whitespace; do not remove meaningful punctuation from names. Name parts: maximum 100 characters each; email maximum 320 with normalized comparison; short free text such as company/city/role maximum 200; full address maximum 500; responsibilities and conditional explanations maximum 2,000. Accept non-English names and international phone numbers. Currency is PHP, nonnegative with at most two decimal places; zero is acceptable only in an approved pending-funding path, never silently converted into positive funds. Dates must be real calendar dates; no future employment dates; present employment has no end date. Essay word bounds are specified in F33–F36. Selection values must belong to the approved option catalogue; optional arrays allow zero selections and reject duplicates. These proposed per-field caps differ from some existing technical limits and require coordinated implementation after approval.

**Option catalogue rule:** preserve current choices until their decision row is approved. The approved version must record additions such as no-history, undecided-package, entity type and pending-funding alongside stored codes and display labels. Existing region options do not establish the actual service territory. A business-approved supported-region list is required before the system uses region selection as an eligibility gate.

## 6. Document policy matrix

**Stage definitions:** A initial application; V shortlisted verification; N approved onboarding before activation. “Conditional” means the reviewer records the purpose and the applicant sees the request and accepted alternatives. The recency windows below are operational proposals, not statutory periods.

| ID / current key | Current | Proposed stage and requirement | Acceptable evidence / alternatives | Proposed recency and redaction | Decision owner |
|---|---|---|---|---|---|
| D01 `govIdFront` | A required | V conditional required for identity verification | Government-issued ID accepted under a legal-reviewed list; accommodate official digital IDs only through approved verification; do not demand a fictional card format | Unexpired where expiry applies. Retain necessary identity fields only; permit purpose watermark not obscuring them. Do not store barcodes/complete identifier unless necessary and approved | Privacy/legal + owner |
| D02 `govIdBack` | A required universally | V only if reverse contains information required for the selected ID | Single-page passport/digital ID can satisfy identity request without a nonexistent back image | Same validity rule; redact unrelated reverse-side data when verification does not need it | Privacy/legal |
| D03 `proofOfBilling` | A required | V conditional for address verification | Utility bill, bank address page, lease or appropriate official address certification; if not in applicant name, explain relationship/occupancy through approved alternative | Proposed issued within 90 days, or current lease; retain name/address/issuer/date; redact account numbers, usage and unrelated transactions | Reviewer + privacy |
| D04 `proofOfFunds` | A required | V required only when financial capacity is being verified | Bank certificate preferred; statement balance page; documented financing approval or partner commitment with supporting evidence. Pending financing is not represented as cash available | Proposed within 90 days; retain holder, issuer, date and relevant balance/approved facility. Redact unrelated transactions/full account number; never passwords/OTPs | Finance + privacy |
| D05 `idPhoto` | A required, recent unspecified | X initially; N only if a badge/profile has an approved purpose; otherwise do not collect | Suitable recent photo; do not use face recognition or attractiveness scoring | Proposed within 6 months if actually needed; remove location/device metadata | Operations + privacy |
| D06 `dtiSecCert` | A optional, if business owner | V C for applicant entity; N updated registered contracting entity | Appropriate registration record for sole proprietor, partnership or corporation; owner/legal reviewer defines entity alternatives | Current record; include relevant amendments; registration is not by itself proof of signatory authority | Legal/reviewer |
| D07 `businessPermit` | A optional latest | N C before operating where applicable; not required for an applicant who has no operating business/site yet | Applicable current business/site permits; legal/operations maintain a jurisdiction checklist | Valid for relevant operating period/site; renewal deadline recorded | Operations/legal |
| D08 `resumeCv` | A optional | O at A or V; equivalent structured experience answers accepted | Relevant CV or no-history declaration; no duplicate demand when form already supplies sufficient history | Proposed updated within 12 months; redact religion, unrelated family details, sensitive identifiers and third-party contacts unless needed | Reviewer/privacy |
| D09 `characterRef` | A optional | V only where a defined reference check is necessary | Consenting professional reference or approved alternative; not automatic rejection for lack of a letter | Proposed within 6 months; obtain reference participation/notice; omit unnecessary third-party data | Reviewer/privacy |
| D10 `siteProposal` | A optional | A O; V C when site approval sought | Site description, layout/photos, location map and authority to propose; assistance path if no site | Current conditions; proposed photos within 90 days; blur bystanders/plates and remove unnecessary geolocation metadata | Site reviewer |
| D11 new entity authority | Absent | V C for representative/joint entity | Appropriate authorization/board resolution/partnership authority and ownership information limited to decision purpose | Current and effective on decision date; separate from D06 | Legal |
| D12 agreement and notices | Only checkboxes currently | V/N as applicable before rights/payment/activation | Executed reviewed franchise agreement, applicable NDA, fee schedule, approved quote and acceptance evidence | Version/date/signatories retained; do not collect a scan where secure execution evidence suffices | Legal/owner |
| D13 opening verification | Absent | N C before opening | Site approval, applicable permits, training completion, operational checklist and equipment acceptance | Current at activation; replacement/renewal recorded | Operations |

**File handling proposal:** PDF/JPG/PNG; nonempty up to 10 MiB each; one logical item per request, multipage PDF allowed. The current ten-slot/one-file model must be extended deliberately for extra documents; do not silently overload existing keys. Provide view, replace and remove; errors persist until corrected. Reject mismatched signatures, executables, password-protected files that cannot be checked, and malicious content. Private quarantine and malware scanning are implementation requirements, not currently verified capabilities.

Applicants may use clearly labeled redactions, not alter identities, balances or dates. Reviewer should request only missing verification fields and explain why. No uploads through public comments, ordinary chat, shared public links or notification attachments. Request replacement through an authenticated/secure applicant flow. Review access must be authorized, logged and time-limited for download links.

## 7. Background checks, legal wording and privacy

The principles informing this proposal are purpose limitation, transparency and proportionality. Personal data should be retained only as needed for a documented purpose; sensitive-data processing requires its applicable legal basis. These principles do not prescribe a universal franchise document list or the numeric retention periods below. See the [NPC Data Privacy Act](https://privacy.gov.ph/data-privacy-act/) and [IRR, sections 18–22](https://privacy.gov.ph/implementing-rules%20regulations-data-privacy-act-2012/).

| ID | Proposed requirement | Review and approval needed |
|---|---|---|
| L01 | NDA only before disclosure of actual confidential materials. Define parties, purpose, covered information, exclusions, permitted disclosure, duration, return/deletion and dispute handling. | Owner identifies materials; legal reviewer drafts full agreement. A checkbox is not a substitute for missing terms |
| L02 | Initial background scope: identity, relevant entity/representative authority, declared business experience/reference and funding evidence. Criminal, credit, litigation or other intrusive checks are excluded from the default process until a separate necessity/legal/provider assessment is approved. | Owner/legal/privacy approve exact checks, sources, recipients, timing, correction route and consequences of refusal |
| L03 | Keep truthful-information and no-guarantee notices; allow applicant correction before a final adverse decision. No automated approval/rejection solely from demographic attributes or unverified reports. | Owner signs rubric and authority; legal checks wording |
| L04 | Privacy notice names actual controller, purposes/bases, categories, recipients/processors, transfers, retention, rights and real contact. Record version and acceptance timestamp only to the extent necessary. | Privacy/legal verify actual deployments/providers; no generic compliance claim as proof |
| L05 | Marketing, unrelated analytics and optional contact permissions are separate from franchise processing, not preselected and not a condition of applying. | Owner/privacy approve purposes and withdrawal method |
| L06 | Co-applicant gives their own applicable notice/authorization. Primary applicant cannot grant unlimited consent for partners, references or emergency contacts. | Invitation/confirmation process |
| L07 | Restrict ID, funding and background evidence to named verification roles; branch Staff do not get these records by default. Do not send raw application files to the operational AI agent by default. | Owner access matrix; classmate enforces server authorization and audit logs |

### Proposed applicant-facing text for review (not published)

**Intake notice:** “We use the information you provide to assess your interest in a Siomai Street franchise and contact you about the next steps. Please do not submit identity documents, bank statements or other sensitive files unless we request them through our secure verification process. Read the privacy notice for the information we collect, who can access it, how long we keep it and how to contact us.”

**Accuracy declaration:** “I confirm that the information I have provided is accurate to the best of my knowledge. I will notify Siomai Street if relevant information changes or needs correction.”

**No-guarantee acknowledgment:** “I understand that submitting this application does not guarantee franchise approval, site approval, an opening date, income or return on investment.”

**Privacy acknowledgment:** “I have read the franchise application privacy notice.” This acknowledgment is not itself a blanket legal basis; legal review determines any additional specific consent needed.

**Verification authorization pattern:** “I authorize [registered controller] to verify [specified information] with [identified sources/provider] for [specified franchise evaluation purpose] during [defined period]. The result will be accessible to [authorized roles]. I can request correction or discuss withdrawal and its effect on my application through [verified contact].” Every bracket must be resolved for the actual check; this is a drafting pattern, not a finished legal agreement.

**Legal agreement checklist:** applicable Philippine MSME franchise agreements require attention to fee disclosure, rights/obligations, duration/renewal, termination, cooling-off, dispute resolution and remedies, with legal review of formalities and registration requirements. The intake screen must not purport to replace the franchise agreement. See [Executive Order No. 169, sections 2–3](https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/5/95014). Counsel must verify applicability and current implementing requirements for this business.

## 8. Support contacts, review targets and applicant notifications

### Contacts to verify, not invent

| ID | Current displayed value | Required verification before approval | Publication rule |
|---|---|---|---|
| S01 | `franchise@siomaistreet.ph` | Owner controls mailbox/domain; inbound/outbound test, primary and backup staff, recovery/MFA | Use only after successful verification |
| S02 | `privacy@siomaistreet.ph` | Verified mailbox, designated responsible person, privacy-request workflow | Do not claim a named DPO exists without confirmation |
| S03 | `+63 912 345 6789` | Owner confirms actual business number, test call, channel purpose and staffing | Treat as unverified, not a confirmed contact |
| S04 | Manila, Philippines | Registered controller address and public support/correspondence address | Publish accurate business address; no staff home address by default |
| S05 | Mon–Sat 8AM–6PM | Staff capacity, holiday calendar, timezone and backup | Proposed service window below replaces only after approval |
| S06 | Social handles in `siteData.js` | Owner confirms account control and official branding | Social channels redirect sensitive applications to secure portal |

**Proposed service window:** Monday–Friday, 9AM–5PM, Asia/Manila, excluding Philippine public holidays. Owner may retain Saturday service if staffing supports it. A business day is measured within the approved calendar; receipt outside business hours starts the review clock next business day. These are planning targets, not measured service levels.

| ID | Event | Proposed target | Clock / escalation |
|---|---|---|---|
| S07 | Submission acknowledgment | Immediately after valid saved receipt; email within 15 minutes when delivery service exists | Email failure must not create another application; portal receipt remains authoritative |
| S08 | Completeness screening | Within 2 business days of receipt | Assigned reviewer; lead notified when overdue |
| S09 | Initial substantive response | Within 5 business days after completeness confirmed | Reply may request information or consultation; not guaranteed approval |
| S10 | Applicant correction window | 14 calendar days; reminder at day 7 | Extension available; no unexplained auto-rejection |
| S11 | Inactivity | Reminder at 30 days; proposed inactive closure at 60 days since last meaningful contact | Notice and reactivation route; retention clock starts at closure |
| S12 | Consultation scheduling | Offer available appointments within 5 business days after shortlist decision | Actual meeting time agreed with applicant |
| S13 | Final review | Target 10 business days after required verification/site inputs complete | If delayed, explain cause and provide next update date; no deemed approval |
| S14 | Status updates while pending | At least every 5 business days for active unresolved cases | Review lead owns notification accuracy |
| S15 | Ordinary support | Acknowledge within 1 business day; target substantive reply within 3 business days | Escalate to lead after target missed |
| S16 | Privacy request | Acknowledge within 2 business days; verify identity proportionately and track applicable legal deadlines | This internal target does not replace legal obligations |
| S17 | Opening readiness | Individual dated plan after site, agreement, permits, equipment and training confirmed | No universal 2–4-week opening promise |

**Notification content:** reference, status, next action, secure link, deadline with timezone and verified support. Exclude ID numbers, financial balances and documents from email/SMS. Do not email staff notes or background findings. Every decision notification records sender/actor, template version and delivery result. No promised notifications should be displayed until implemented.

## 9. Proposed retention and data handling schedule

All periods here are proposals for owner/privacy/legal approval and technical feasibility review. They replace neither tax/contract obligations nor a documented preservation hold. Deletion covers database payloads, private objects, exports, logs and eventually backups under the approved schedule. Use minimum non-sensitive audit metadata after deletion where justified.

| ID | Category | Proposed trigger and period | Action / accountable role |
|---|---|---|---|
| R01 | Unsubmitted browser text draft | 30 days since last edit; immediate user clear option | Expire locally; website owner implements visible expiry and clear control |
| R02 | Unsubmitted browser documents | Avoid persisting by default; if explicit save enabled, same 30-day expiry | IndexedDB deletion and clear confirmation; do not claim browser-session-only storage |
| R03 | Active submitted application | While actively evaluated; inactivity review at 60 days | Review lead closes or records justified extension; no indefinite pending bucket |
| R04 | Declined/withdrawn/inactive application answers | 6 months after closure | Delete/anonymize absent justified hold; do not start clock at initial submission while case remains active |
| R05 | Identity images, raw funding and background evidence | Delete 90 days after verification decision unless a documented ongoing need/hold applies | Retain minimal verification result/date/reviewer rather than full source copy; privacy lead approves exceptions |
| R06 | Approved applicant information | Transfer only needed data to franchise record at onboarding; remove duplicate intake copies within 90 days | Operations + privacy; contract/financial records get separately approved retention |
| R07 | Executed agreements, financial and statutory records | Duration/period to be set by legal/finance for actual record class | No guessed universal statutory period; unresolved schedule blocks deletion policy publication |
| R08 | Consent/notice and decision audit evidence | Proposed 24 months after case closure; longer only on documented necessity | Retain version, actor, event and outcome; minimize raw data in logs |
| R09 | Download links | Proposed 10-minute expiry; no permanent public link | Server authorization on issue; prevent link inclusion in public logs |
| R10 | Reviewer exports | Disabled by default; exceptional approved export expires/deleted within 7 days | Named recipient and purpose, protected storage, no unmanaged personal drives |
| R11 | Technical logs | Proposed 30 days for operational logs; security audit records 180 days | Redact payloads, tokens, ID/funding content; documented incident preservation exception |
| R12 | Backup copies | Proposed rolling 30-day window, subject to verified provider capability | Restricted access; deleted data not restored into active processing; reapply deletion ledger after restore |
| R13 | Failed/ambiguous upload attempts | Reconcile within 24 hours; delete confirmed unreferenced objects after 7 days | Integration owner checks committed references before deletion; never delete from a timeout assumption |
| R14 | Synthetic test records | Delete at test-cycle end, proposed within 30 days | Keep test outcome, not unnecessary test uploads; no real applicant data copied into development |

**Hold procedure:** record approving person, lawful/operational reason, exact categories, review date and release condition. Restrict access, review at least every 90 days, and do not keep the entire database because one case is on hold. Applicant erasure requests require case-specific assessment and communication, not a blind delete or blanket refusal.

## 10. Responsibility, permissions and approval workflow

| ID | Action | Proposed accountable role | Permission boundary / evidence |
|---|---|---|---|
| W01 | Submit and correct own application | Applicant | Own record only; verified access; updates versioned after submission, not silent overwrite |
| W02 | Completeness checks and requests for information | Assigned franchise reviewer (Administrator with scoped permission) | Assigned cases; no role assignment or final approval unless separately granted |
| W03 | View identity/funding documents | Designated verification reviewer | Purpose-limited access, logged downloads; unrelated administrators denied by default |
| W04 | Approve/decline | Owner or explicitly delegated final approver | Required reason, evidence, actor/time; no self-approval of a reviewer’s own application; escalation for conflicts |
| W05 | Create operational Franchisee account and assign branch | Authorized account administrator after approval/onboarding | Application approval alone grants no POS/branch privileges; separate auditable action |
| W06 | Branch Staff | No application review rights | POS/operational scope only, as supplied system requirements define |
| W07 | Existing Franchisee | Own authorized franchise operations; own application if applicable | No other applicants' data; business partner access requires explicit authority |
| W08 | Privacy requests and deletion | Designated privacy lead plus authorized technical operator | Identity verification, scoped action and deletion evidence |
| W09 | Website/app integration and deployment | Classmate with project lead coordination | Technical implementer is not automatically business approver or unrestricted production reviewer |
| W10 | AI support | No approval/decline authority proposed | No raw ID/funding input by default; any future assistance needs defined purpose, permissions and human accountability |

**State mapping proposal:** local `draft` → server `submitted` → `under_review` ↔ `more_information_requested` → `approved` / `declined` / `withdrawn`. Preserve existing database values where possible. Inactive closure needs an approved reason/substatus or an explicit new status migration; do not silently map inactivity to applicant withdrawal. Onboarding status is a separate record/state and must not imply application approval equals operational activation. Reopening/correction/appeal is assigned to the lead with recorded reasons.

**Decision record:** application ID, requirements/package/notice versions, reviewer, final approver, checklist results, evidence references, decision reason, applicant-facing explanation, timestamps, next action and any exception. Do not base decisions on unsupported ROI expectations or irrelevant demographic information.

**Proposed correction/appeal route:** allow a clarification request within 30 calendar days of decision, reviewed by the owner or a different authorized reviewer where available. This is a service proposal, not a statement of statutory appeal rights.

## 11. Owner decision sheet

Each line requires a recorded choice and any exact replacement values. These are the minimum decisions needed to release version 1.0.

- [ ] **A01 Commercial catalogue:** approve/revise P01–P12; attach costed item quantities, final tax-inclusive/exclusive prices, exclusions, recurring fees, payment/refund schedule, term and territory rules.
- [ ] **A02 Applicant eligibility:** approve/revise E01–E10, including beginners, entities, passive operators, no-site and foreign-representative review paths.
- [ ] **A03 Field collection:** approve/revise F01–F56, especially DOB/address timing, marital status, emergency contacts, essays and legal/financial questions.
- [ ] **A04 Documents:** approve/revise D01–D13 including each stage, alternatives, recency, redactions and reviewers.
- [ ] **A05 Legal/privacy:** provide registered controller and responsible contact; approve scoped checks and obtain reviewed agreement/notice versions for L01–L07.
- [ ] **A06 Support:** verify S01–S06; approve/revise S07–S17 against staffing and holiday calendar.
- [ ] **A07 Retention:** approve/revise R01–R14; legal/finance fill R07; confirm deletion/backups can meet the stated periods.
- [ ] **A08 Accountability:** name the primary and backup roles for W01–W10, final approver, conflict handling and escalation.
- [ ] **A09 Public claims:** resolve C01–C11 before publishing revised fees, timelines, returns or privacy promises.
- [ ] **A10 Implementation release:** project lead and classmate accept the same signed requirements version and integration test checklist.

Approval record format: `Decision IDs | Approve/Revise/Reject/Not applicable | Exact rule/exception | Approver + role | Date | Evidence/attachment | Effective date`. A row cannot be marked approved from silence or a developer assumption.

## 12. Implementation handoff and Phase 2 exit gate

| Consumer | Must use approved version | Required acceptance evidence |
|---|---|---|
| Public website | Package catalogue, claims, support, timeline and notices | No conflicting price/fee/name/time promise across home, FAQ, application and legal pages |
| Application UI | Field/document conditions, stage, help text and review labels | All supported branches complete; no unnecessary sensitive fields in initial intake |
| Shared validator/backend | Same requiredness/options, stages, file rules and legal versions | Valid and invalid cases per branch; old-version drafts handled explicitly; no silent new requirements |
| Admin app | Permission matrix, reviewer checklist, statuses, exceptions and retention | Authorized review/approval; unauthorized access denied; private files; complete decision audit |
| Operations | Support ownership, target calendar, privacy requests and retention tasks | Staff runbook, backup assignee, measured pilot results and overdue escalation |

After approval: freeze this file as version 1.0, record approval evidence, create a release changelog and map requirement IDs to implementation/tests. Keep a separate schema/contract version from the business requirements version. For in-progress applications, choose grandfathering or explicit re-consent/revision; never silently apply a new legal text or price.

**Pilot before launch:** run individual, joint, never-employed, company representative, passive-operator, no-site, uncertain-package and declined/withdrawn cases; verify document alternatives and redactions; check role boundaries, notifications, missed deadlines, correction, retention/deletion and receipt retry. Use synthetic data. Classmate performs actual app/database integration verification.

**Phase 2 is complete only when:** the owner has approved the applicable rows and filled factual blanks; privacy/legal review has resolved its flagged items; UI, backend and reviewer workflow are aligned and tested against the signed version. This v0.1 pack completes proposal preparation, not owner approval or implementation.

## 13. Sources and version history

Current source snapshot: HEAD `74d9e414ec404931eeeb00b95927110bfd4f4751` plus the existing working tree inspected 27 October 2026. Git HEAD alone does not reproduce the uncommitted state.

| Evidence | Source |
|---|---|
| Existing public catalogue and inclusions | `src/pages/Home/components/Packages.jsx` |
| Fees, support, ROI and opening claims | `src/pages/Home/components/FAQ.jsx`; `Journey.jsx`; `Requirements.jsx` |
| Conflicting package amounts | `src/pages/Application/steps/FranchisePlan.jsx` |
| Current requiredness, fields, options and limits | `shared/application.js`; nine step components |
| Document labels and current requirements | `src/pages/Application/steps/DocumentUpload.jsx` |
| Current consent wording and final claims | `LegalConsents.jsx`; `ReviewSubmit.jsx` |
| Contacts and existing retention statements | `src/data/siteData.js`; `src/pages/Legal/PrivacyPolicy.jsx`; `CookiePolicy.jsx` |
| App roles and integration expectations | Three project-requirements attachments supplied in this conversation; user confirmed classmate owns integration |
| Business approval authority | User confirmed fast-food owner approves team-prepared proposals |

External sources checked 27 October 2026: NPC Act and IRR linked in section 7; Executive Order 169 linked there. They inform review questions, not package costs, mandatory document recency, operational targets or a declaration that this system is compliant.

| Version | Status | Change |
|---|---|---|
| 0.1.0 | Proposed, not approved | Current-state comparison; proposed commercial, field, document, legal/privacy, support, retention and role matrices; owner decision sheet |
| 1.0.0 | Not issued | Reserved for signed requirements after all release-blocking decisions are resolved |
