# Performance measurements — September 5, 2026

Compared the original `8aa51f4` revision with the reviewed, uncommitted changes in separate detached worktrees. The main working copy was not changed by the benchmark harnesses.

## Results

| Measurement                                    |            Before |             After | Interpretation                                                               |
| ---------------------------------------------- | ----------------: | ----------------: | ---------------------------------------------------------------------------- |
| Cold production build                          |           12.56 s |           12.29 s | 2.2% less time; overlapping ranges, no convincing general build improvement  |
| Full unit/UI suite                             | 5.29 s, 135 tests | 5.88 s, 167 tests | 11.2% more elapsed time for a larger suite; not an equal-workload comparison |
| Stock loader: 200 ms suggestions, 300 ms chart |         501.23 ms |         302.26 ms | 39.7% less time in a controlled upstream simulation                          |
| Stock loader: 500 ms suggestions, 100 ms chart |         601.53 ms |         501.09 ms | 16.7% less time in a controlled upstream simulation                          |
| Stock loader: no search, 100 ms chart          |         100.53 ms |         100.53 ms | Unchanged                                                                    |
| JSON: 100,000 numbers, 200,001 input bytes     |          3.770 ms |          0.995 ms | 73.6% less processing time; 3.8× throughput for this input                   |
| JSON: 1,000 nested arrays                      |          3.570 ms |          0.065 ms | 98.2% less processing time; 54.9× throughput for this input                  |
| JSON: 20,000 nested arrays                     |    Stack overflow |          1.158 ms | Correctness/resource-limit improvement; no valid before/after speed ratio    |
| Typical JSON: 100 records, 7,031 input bytes   |         0.0934 ms |         0.0889 ms | Very small absolute difference; about 0.0045 ms                              |
| Small JSON: 52 input bytes                     |        0.00115 ms |        0.00116 ms | Essentially unchanged                                                        |

The large/deep JSON gains come from skipping formatting and serialization of trees already outside the preview limits. Both versions mark those trees as unpreviewable. The updated version leaves that input unformatted and returns a small status response rather than the complete tree. These measurements do not establish an equivalent speedup for ordinary JSON rendering.

## Initial JavaScript size

Summed unique JavaScript files referenced by script tags in each prerendered HTML shell, then compressed each file using gzip. Decimal kB. This excludes dynamic chunks loaded after interaction, CSS, HTML/RSC payloads, and browser cache reuse; it is not a complete page-load transfer measurement.

| Page   | Before gzip kB | After gzip kB | Change |
| ------ | -------------: | ------------: | -----: |
| Home   |        253.472 |       257.315 | +1.52% |
| JSON   |        268.728 |       272.579 | +1.43% |
| Stocks |        280.021 |       283.965 | +1.41% |
| PDF    |        274.553 |       278.419 | +1.41% |
| Image  |        270.765 |       274.606 | +1.42% |

The update does not reduce the initial JavaScript footprint. The roughly 3.8–3.9 kB compressed increase is similar across these routes; its exact dependency/module attribution was not measured.

## Method

- Same machine and Node 24.20.0 for both revisions; dependencies installed from each revision's frozen lockfile.
- Builds and complete test suites: three sequential runs per revision, alternating order. Reported values are medians. Removed `.next` before every measured cold build and invoked the installed Next/Vitest binaries directly, excluding pnpm/Turbo startup and result caching. Generated vendor assets had already been prepared for both revisions.
- Cold-build ranges: before 12.27–13.07 s; after 12.25–12.57 s. Each build generated 138 routes/pages.
- Suite ranges: before 5.08–5.33 s; after 5.84–6.11 s. Both suites passed in every measured run.
- Stock loader: ran each revision's actual `StockDashboardLoader` through Vitest. Mocked only upstream market-data functions with fixed timers; five observations per scenario. Timed the loader itself, excluding test startup. These are simulated upstream latencies, not live market-provider or production response measurements.
- JSON: executed the original `parseJson` and `processJson` functions after stripping TypeScript syntax, on the same Node runtime. Ten warm-up operations per version/input, then 15 alternating batches. Batch sizes were 5,000 for small input, 100 for typical input, and 10 for large/deep inputs. Explicit GC ran before each timed batch, outside the timing. Reported values are medians of batch time divided by operation count.
- Raw final observations are in `benchmark-results.json`. JSON result-size fields use JSON serialization as a size proxy, not actual browser structured-clone transport bytes.

Exploratory pnpm command timings were discarded because the old pinned package-manager invocation added substantial startup overhead in this environment. A comparative typecheck timing was also discarded after an environment/runtime failure. Neither is used to claim a speedup.

## Limits

No browser LCP, INP, hydration, device-memory usage, production throughput, or live MTA cache-hit rate was measured. Local browser preview access was unavailable. The results demonstrate specific processing and request-scheduling improvements, not a blanket site-wide performance increase. No application code was changed during this measurement pass.
