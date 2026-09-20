# Lighthouse — mobile, on the live URL

Measured on **https://pugtox.github.io/cookery-practice/** after the first successful
Pages deployment. The raw JSON (`final.json`) is gitignored because it is ~500 kB;
regenerate it with:

```bash
npx lighthouse https://pugtox.github.io/cookery-practice/ \
  --form-factor=mobile --throttling-method=simulate \
  --output=json --output-path=docs/lighthouse/final.json \
  --chrome-flags="--headless=new --no-sandbox"
```

| | |
|---|---|
| Lighthouse | 13.5.0 |
| URL | `https://pugtox.github.io/cookery-practice/` (`finalDisplayedUrl`, checked, not assumed) |
| form factor | mobile |
| throttling | simulate |

## Scores

| Category | Score |
|---|---|
| Performance | **98** |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

## Metrics

| Metric | Value |
|---|---|
| First Contentful Paint | 1.3 s |
| Largest Contentful Paint | 1.3 s |
| Total Blocking Time | 10 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 4.0 s |
| Total transfer | **10 KiB** |

## Two things this table does not prove

**1. SEO = 100 does not mean the technical SEO is done.** In Lighthouse 13.5 the
`canonical`, `structured-data` and `robots-txt` audits all carry a weight of 0 — they
show as `null` / `notApplicable`, so a site missing all three still scores 100. The
real acceptance for that work is
`node ../web-gzliu/seo-check.mjs .` (198 checks, all passing), not this score. The
same trap is recorded in `web-gzliu/workflow.md` stage 4.

**2. The Performance number is not a contract.** It moves between runs on the same
build — the sibling project measured 97 and 99 on the same day. Judge the individual
metrics (LCP 1.3 s, TBT 10 ms, CLS 0), not the rounded score.

## Not yet measured

Real-device testing on an actual phone, and behaviour on a slow mobile network. Both
are on the stage-9/10 checklist in `SPEC.md` and neither is claimed here.
