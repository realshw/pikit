---
name: qualcomm
description: Inspect a Qualcomm SoC from userspace with the icc helper — live bandwidth votes per interconnect node, the clients behind one, and the SMMUs and IOMMU groups that translate device DMA. Use when diagnosing memory or bus bandwidth, finding which master saturates the fabric, or tracing a device to its IOMMU.
---

# Qualcomm SoC fabric

A Qualcomm SoC exposes its network-on-chip through the Linux **interconnect
framework**, and its DMA through the **IOMMU**. The `icc` helper next to this
file reads both. Run it from this skill directory.

```bash
./icc top                       # live bandwidth votes, busiest nodes, once a second
./icc top -i 0.2 -n 50          # 5 Hz for 50 samples, for a short capture
./icc top -f 'llcc|ebi|ddr'     # only the DRAM path
./icc top -s peak               # rank by reserved ceiling instead of current ask
./icc read                      # one-shot: avg, peak, node as TSV (kB/s)
./icc clients llcc_mc           # which masters are asking for that bandwidth
./icc iommu                     # SMMU, then IOMMU group, then master devices
./icc raw [summary|graph]       # the kernel debugfs files, verbatim
```

- Reads `/sys/kernel/debug/interconnect/interconnect_summary` and
  `.../interconnect_graph`, which are root-only.
  - On Android/Termux `icc` re-executes itself through `su` once; run it as root
    elsewhere.
  - It mounts debugfs itself when it is not already up
    (`mount -t debugfs none /sys/kernel/debug`).
- `avg` and `peak` are **bandwidth votes in kB/s**, not measured throughput:
  the sum of every client's average request and the maximum of their peak
  requests. Movement tracks real load; the magnitude is what the fabric
  reserved.
- A top-level node aggregates its indented clients, so `top` shows top-levels
  only and never double-counts. `clients NODE` drills into one.
- Node names encode the fabric: `llcc_mc` and `ebi` are the DRAM paths,
  `qnm_*`/`qns_*` are QoS masters/slaves, `qhs_*` are peripheral hardware
  ports, and `*_disp`/`*_cam_ife_*` mark display and camera QoS partitions.
  The `*_qtb` platform devices are per-flow hardware throttle blocks.
- `iommu` resolves each group member's `iommu` link to its SMMU, so a PCI
  endpoint, a GPU context bank and a storage controller each land under their
  translating SMMU.
- Override the debugfs paths with `ICC_SUMMARY` and `ICC_GRAPH`.
- For anything `icc` does not cover, read the files directly:
  `cat /sys/kernel/debug/interconnect/interconnect_summary`.
