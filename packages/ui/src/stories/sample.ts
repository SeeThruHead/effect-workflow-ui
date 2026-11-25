import type { Execution } from "../workflow/model.ts"

export const sampleCapturedAt = 1795585210119

export const sampleRuns: ReadonlyArray<Execution> = [
  {
    id: "130d16e24e48a39def3f4e0c0efe0259",
    workflow: "PlaceOrder",
    status: "waiting",
    startedAt: 1795583989928,
    endedAt: null,
    trigger: "api",
    boot: "",
    boots: [],
    input: { orderId: "1795583989", sku: "mug", quantity: 2, card: "flaky" },
    currentDetails: "durable sleep cooling-off, wakes at 2026-11-25T05:21:20.036Z",
    payloads: "decoded",
    traceId: "f320c45a34593fe08be4d39546545ca4",
    groups: [
      {
        id: "activity:reserve stock",
        kind: "activity",
        name: "reserve stock",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583989942,
            startedAt: 1795583989942,
            endedAt: 1795583989956,
            boot: "",
            outcome: { _tag: "success", output: { reservationId: "res-1795583989", sku: "mug", quantity: 2 } }
          }
        ],
        start: 1795583989942,
        end: 1795583989956
      },
      {
        id: "activity:charge card",
        kind: "activity",
        name: "charge card",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583989962,
            startedAt: 1795583989962,
            endedAt: 1795583989976,
            boot: "",
            outcome: {
              _tag: "failure",
              error: {
                tag: "CardTimeout",
                message: "attempt: 1",
                kind: "failure",
                retryable: true,
                detail: { _tag: "CardTimeout", attempt: 1 }
              }
            }
          },
          {
            n: 2,
            reason: "retry",
            scheduledAt: 1795583989983,
            startedAt: 1795583989983,
            endedAt: 1795583989998,
            boot: "",
            outcome: {
              _tag: "failure",
              error: {
                tag: "CardTimeout",
                message: "attempt: 2",
                kind: "failure",
                retryable: true,
                detail: { _tag: "CardTimeout", attempt: 2 }
              }
            }
          },
          {
            n: 3,
            reason: "retry",
            scheduledAt: 1795583990005,
            startedAt: 1795583990005,
            endedAt: 1795583990030,
            boot: "",
            outcome: { _tag: "success", output: { chargeId: "ch-1795583989" } }
          }
        ],
        start: 1795583989962,
        end: 1795583990030
      },
      {
        id: "clock:cooling-off",
        kind: "clock",
        name: "cooling-off",
        summary: "wakes at 2026-11-25T05:21:20.036Z",
        status: "waiting",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583990036,
            startedAt: 1795583990036,
            endedAt: null,
            boot: "",
            outcome: { _tag: "pending" }
          }
        ],
        start: 1795583990036,
        end: 1795584080036
      }
    ],
    events: [
      { n: 1, at: 1795583989928, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583989942,
        kind: "attempt started",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583989956,
        kind: "completed",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 4,
        at: 1795583989962,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 5,
        at: 1795583989976,
        kind: "attempt failed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 6,
        at: 1795583989983,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #2" },
        fields: {}
      },
      {
        n: 7,
        at: 1795583989998,
        kind: "attempt failed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #2" },
        fields: {}
      },
      {
        n: 8,
        at: 1795583990005,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #3" },
        fields: {}
      },
      {
        n: 9,
        at: 1795583990030,
        kind: "completed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #3" },
        fields: {}
      },
      {
        n: 10,
        at: 1795583990036,
        kind: "clock set",
        group: "clock:cooling-off",
        key: { label: "step", value: "cooling-off" },
        fields: {}
      }
    ]
  },
  {
    id: "f6ba36b2623f9566d11e6bf2349b281f",
    workflow: "ApproveRefund",
    status: "waiting",
    startedAt: 1795583869918,
    endedAt: null,
    trigger: "api",
    boot: "",
    boots: [],
    input: { refundId: "r-77", amount: 240 },
    currentDetails: "waiting on a signal (a DurableDeferred); storage names it only once it arrives",
    payloads: "decoded",
    traceId: "cd72ad3c8b82db801c74c281d34d6f48",
    groups: [
      {
        id: "activity:check refund",
        kind: "activity",
        name: "check refund",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869975,
            startedAt: 1795583869975,
            endedAt: 1795583870077,
            boot: "",
            outcome: { _tag: "success", output: { refundId: "r-77", needsApproval: true } }
          }
        ],
        start: 1795583869975,
        end: 1795583870077
      }
    ],
    events: [
      { n: 1, at: 1795583869918, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583869975,
        kind: "attempt started",
        group: "activity:check refund",
        key: { label: "step", value: "check refund #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583870077,
        kind: "completed",
        group: "activity:check refund",
        key: { label: "step", value: "check refund #1" },
        fields: {}
      }
    ]
  },
  {
    id: "192855a134991f4cb2d900df427d2738",
    workflow: "Reconcile",
    status: "failed",
    startedAt: 1795583869911,
    endedAt: 1795583870064,
    trigger: "api",
    boot: "",
    boots: [],
    input: { ledger: "nightly-2026-11-20" },
    failure: {
      tag: "Error",
      message: "ledger nightly-2026-11-20 is corrupt at line 4812",
      kind: "defect",
      retryable: false
    },
    payloads: "decoded",
    traceId: "3c57d699a43e603db2323c526b89650d",
    groups: [
      {
        id: "activity:load ledger",
        kind: "activity",
        name: "load ledger",
        status: "failed",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869967,
            startedAt: 1795583869967,
            endedAt: 1795583870057,
            boot: "",
            outcome: {
              _tag: "failure",
              error: {
                tag: "Error",
                message: "ledger nightly-2026-11-20 is corrupt at line 4812",
                kind: "defect",
                retryable: false
              }
            }
          }
        ],
        start: 1795583869967,
        end: 1795583870057
      }
    ],
    events: [
      { n: 1, at: 1795583869911, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583869967,
        kind: "attempt started",
        group: "activity:load ledger",
        key: { label: "step", value: "load ledger #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583870057,
        kind: "attempt failed",
        group: "activity:load ledger",
        key: { label: "step", value: "load ledger #1" },
        fields: {}
      },
      { n: 4, at: 1795583870064, kind: "failed", key: { label: "step", value: "run" }, fields: {} }
    ]
  },
  {
    id: "726e31d20154cc1fb35d00b9bb47a217",
    workflow: "DailyReport",
    status: "done",
    startedAt: 1795583869904,
    endedAt: 1795583873115,
    trigger: "api",
    boot: "",
    boots: [],
    input: { day: "2026-11-20" },
    result: { orders: 42, revenue: 819 },
    payloads: "decoded",
    traceId: "35435f01466399148d6d329ed9d80393",
    groups: [
      {
        id: "activity:gather orders",
        kind: "activity",
        name: "gather orders",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869960,
            startedAt: 1795583869960,
            endedAt: 1795583872073,
            boot: "",
            outcome: { _tag: "success", output: { day: "2026-11-20", orders: 42 } }
          }
        ],
        start: 1795583869960,
        end: 1795583872073
      },
      {
        id: "activity:render report",
        kind: "activity",
        name: "render report",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583872080,
            startedAt: 1795583872080,
            endedAt: 1795583873108,
            boot: "",
            outcome: { _tag: "success", output: { orders: 42, revenue: 819 } }
          }
        ],
        start: 1795583872080,
        end: 1795583873108
      }
    ],
    events: [
      { n: 1, at: 1795583869904, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583869960,
        kind: "attempt started",
        group: "activity:gather orders",
        key: { label: "step", value: "gather orders #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583872073,
        kind: "completed",
        group: "activity:gather orders",
        key: { label: "step", value: "gather orders #1" },
        fields: {}
      },
      {
        n: 4,
        at: 1795583872080,
        kind: "attempt started",
        group: "activity:render report",
        key: { label: "step", value: "render report #1" },
        fields: {}
      },
      {
        n: 5,
        at: 1795583873108,
        kind: "completed",
        group: "activity:render report",
        key: { label: "step", value: "render report #1" },
        fields: {}
      },
      { n: 6, at: 1795583873115, kind: "finished", key: { label: "step", value: "run" }, fields: {} }
    ]
  },
  {
    id: "c32f99a7e9644106208ae0ce4b82074f",
    workflow: "PlaceOrder",
    status: "failed",
    startedAt: 1795583869898,
    endedAt: 1795583870161,
    trigger: "api",
    boot: "",
    boots: [],
    input: { orderId: "1003", sku: "chair", quantity: 4, card: "declined" },
    failure: {
      tag: "OrderFailed",
      message: "order 1003 failed: the card for order 1003 was declined",
      kind: "failure",
      retryable: false,
      detail: { _tag: "OrderFailed", orderId: "1003", reason: "the card for order 1003 was declined" }
    },
    payloads: "decoded",
    traceId: "7553453e72cf62ce9d439406c3971d71",
    groups: [
      {
        id: "activity:reserve stock",
        kind: "activity",
        name: "reserve stock",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869953,
            startedAt: 1795583869953,
            endedAt: 1795583870036,
            boot: "",
            outcome: { _tag: "success", output: { reservationId: "res-1003", sku: "chair", quantity: 4 } }
          }
        ],
        start: 1795583869953,
        end: 1795583870036
      },
      {
        id: "activity:charge card",
        kind: "activity",
        name: "charge card",
        status: "failed",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583870043,
            startedAt: 1795583870043,
            endedAt: 1795583870134,
            boot: "",
            outcome: {
              _tag: "failure",
              error: {
                tag: "CardDeclined",
                message: "orderId: 1003",
                kind: "failure",
                retryable: false,
                detail: { _tag: "CardDeclined", orderId: "1003" }
              }
            }
          }
        ],
        start: 1795583870043,
        end: 1795583870134
      },
      {
        id: "activity:release stock",
        kind: "compensation",
        name: "release stock",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583870141,
            startedAt: 1795583870141,
            endedAt: 1795583870154,
            boot: "",
            outcome: { _tag: "success", output: { released: "res-1003" } }
          }
        ],
        start: 1795583870141,
        end: 1795583870154,
        summary: "ran after charge card failed"
      }
    ],
    events: [
      { n: 1, at: 1795583869898, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583869953,
        kind: "attempt started",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583870036,
        kind: "completed",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 4,
        at: 1795583870043,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 5,
        at: 1795583870134,
        kind: "attempt failed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 6,
        at: 1795583870141,
        kind: "compensation started",
        group: "activity:release stock",
        key: { label: "step", value: "release stock" },
        fields: {}
      },
      {
        n: 7,
        at: 1795583870154,
        kind: "compensation done",
        group: "activity:release stock",
        key: { label: "step", value: "release stock" },
        fields: {}
      },
      { n: 8, at: 1795583870161, kind: "failed", key: { label: "step", value: "run" }, fields: {} }
    ]
  },
  {
    id: "b5f1ee506fad77a81594a6201d91a33f",
    workflow: "PlaceOrder",
    status: "done",
    startedAt: 1795583869891,
    endedAt: 1795584010183,
    trigger: "api",
    boot: "",
    boots: [],
    input: { orderId: "1002", sku: "desk", quantity: 1, card: "flaky" },
    result: { orderId: "1002", trackingNumber: "TRK-1002" },
    payloads: "decoded",
    traceId: "e0e965a76cc1f3b35fa31a07db693352",
    groups: [
      {
        id: "activity:reserve stock",
        kind: "activity",
        name: "reserve stock",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869946,
            startedAt: 1795583869946,
            endedAt: 1795583870016,
            boot: "",
            outcome: { _tag: "success", output: { reservationId: "res-1002", sku: "desk", quantity: 1 } }
          }
        ],
        start: 1795583869946,
        end: 1795583870016
      },
      {
        id: "activity:charge card",
        kind: "activity",
        name: "charge card",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583870023,
            startedAt: 1795583870023,
            endedAt: 1795583870127,
            boot: "",
            outcome: {
              _tag: "failure",
              error: {
                tag: "CardTimeout",
                message: "attempt: 1",
                kind: "failure",
                retryable: true,
                detail: { _tag: "CardTimeout", attempt: 1 }
              }
            }
          },
          {
            n: 2,
            reason: "retry",
            scheduledAt: 1795583870169,
            startedAt: 1795583870169,
            endedAt: 1795583870182,
            boot: "",
            outcome: {
              _tag: "failure",
              error: {
                tag: "CardTimeout",
                message: "attempt: 2",
                kind: "failure",
                retryable: true,
                detail: { _tag: "CardTimeout", attempt: 2 }
              }
            }
          },
          {
            n: 3,
            reason: "retry",
            scheduledAt: 1795583870189,
            startedAt: 1795583870189,
            endedAt: 1795583870202,
            boot: "",
            outcome: { _tag: "success", output: { chargeId: "ch-1002" } }
          }
        ],
        start: 1795583870023,
        end: 1795583870202
      },
      {
        id: "clock:cooling-off",
        kind: "clock",
        name: "cooling-off",
        summary: "wakes at 2026-11-25T05:19:20.208Z",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583870208,
            startedAt: 1795583870208,
            endedAt: 1795583969926,
            boot: "",
            outcome: { _tag: "success", output: null }
          }
        ],
        start: 1795583870208,
        end: 1795583960208
      },
      {
        id: "activity:request shipment",
        kind: "activity",
        name: "request shipment",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583970059,
            startedAt: 1795583970059,
            endedAt: 1795583970087,
            boot: "",
            outcome: { _tag: "success", output: null }
          }
        ],
        start: 1795583970059,
        end: 1795583970087
      },
      {
        id: "deferred:shipped",
        kind: "deferred",
        name: "shipped",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795584010119,
            startedAt: 1795584010119,
            endedAt: 1795584010119,
            boot: "",
            outcome: { _tag: "success", output: { trackingNumber: "TRK-1002" } }
          }
        ],
        start: 1795584010119,
        end: 1795584010119
      }
    ],
    events: [
      { n: 1, at: 1795583869891, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583869946,
        kind: "attempt started",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583870016,
        kind: "completed",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 4,
        at: 1795583870023,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 5,
        at: 1795583870127,
        kind: "attempt failed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 6,
        at: 1795583870169,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #2" },
        fields: {}
      },
      {
        n: 7,
        at: 1795583870182,
        kind: "attempt failed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #2" },
        fields: {}
      },
      {
        n: 8,
        at: 1795583870189,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #3" },
        fields: {}
      },
      {
        n: 9,
        at: 1795583870202,
        kind: "completed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #3" },
        fields: {}
      },
      {
        n: 10,
        at: 1795583870208,
        kind: "clock set",
        group: "clock:cooling-off",
        key: { label: "step", value: "cooling-off" },
        fields: {}
      },
      {
        n: 11,
        at: 1795583960208,
        kind: "clock fired",
        group: "clock:cooling-off",
        key: { label: "step", value: "cooling-off" },
        fields: {}
      },
      {
        n: 12,
        at: 1795583970059,
        kind: "attempt started",
        group: "activity:request shipment",
        key: { label: "step", value: "request shipment #1" },
        fields: {}
      },
      {
        n: 13,
        at: 1795583970087,
        kind: "completed",
        group: "activity:request shipment",
        key: { label: "step", value: "request shipment #1" },
        fields: {}
      },
      {
        n: 14,
        at: 1795584010119,
        kind: "deferred completed",
        group: "deferred:shipped",
        key: { label: "step", value: "shipped" },
        fields: {}
      },
      { n: 15, at: 1795584010183, kind: "finished", key: { label: "step", value: "run" }, fields: {} }
    ]
  },
  {
    id: "c7dfc1bcc2f45da5008c41a94340fa52",
    workflow: "PlaceOrder",
    status: "done",
    startedAt: 1795583869882,
    endedAt: 1795583990112,
    trigger: "api",
    boot: "",
    boots: [],
    input: { orderId: "1001", sku: "lamp", quantity: 1, card: "ok" },
    result: { orderId: "1001", trackingNumber: "TRK-1001" },
    payloads: "decoded",
    traceId: "0d235b8fa25a89554d07bf8910645e2e",
    groups: [
      {
        id: "activity:reserve stock",
        kind: "activity",
        name: "reserve stock",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869939,
            startedAt: 1795583869939,
            endedAt: 1795583869989,
            boot: "",
            outcome: { _tag: "success", output: { reservationId: "res-1001", sku: "lamp", quantity: 1 } }
          }
        ],
        start: 1795583869939,
        end: 1795583869989
      },
      {
        id: "activity:charge card",
        kind: "activity",
        name: "charge card",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583869997,
            startedAt: 1795583869997,
            endedAt: 1795583870106,
            boot: "",
            outcome: { _tag: "success", output: { chargeId: "ch-1001" } }
          }
        ],
        start: 1795583869997,
        end: 1795583870106
      },
      {
        id: "clock:cooling-off",
        kind: "clock",
        name: "cooling-off",
        summary: "wakes at 2026-11-25T05:19:20.112Z",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583870113,
            startedAt: 1795583870113,
            endedAt: 1795583969912,
            boot: "",
            outcome: { _tag: "success", output: null }
          }
        ],
        start: 1795583870113,
        end: 1795583960112
      },
      {
        id: "activity:request shipment",
        kind: "activity",
        name: "request shipment",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583970003,
            startedAt: 1795583970003,
            endedAt: 1795583970036,
            boot: "",
            outcome: { _tag: "success", output: null }
          }
        ],
        start: 1795583970003,
        end: 1795583970036
      },
      {
        id: "deferred:shipped",
        kind: "deferred",
        name: "shipped",
        status: "done",
        attempts: [
          {
            n: 1,
            reason: "first",
            scheduledAt: 1795583990058,
            startedAt: 1795583990058,
            endedAt: 1795583990058,
            boot: "",
            outcome: { _tag: "success", output: { trackingNumber: "TRK-1001" } }
          }
        ],
        start: 1795583990058,
        end: 1795583990058
      }
    ],
    events: [
      { n: 1, at: 1795583869882, kind: "started", key: { label: "step", value: "run" }, fields: {} },
      {
        n: 2,
        at: 1795583869939,
        kind: "attempt started",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 3,
        at: 1795583869989,
        kind: "completed",
        group: "activity:reserve stock",
        key: { label: "step", value: "reserve stock #1" },
        fields: {}
      },
      {
        n: 4,
        at: 1795583869997,
        kind: "attempt started",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 5,
        at: 1795583870106,
        kind: "completed",
        group: "activity:charge card",
        key: { label: "step", value: "charge card #1" },
        fields: {}
      },
      {
        n: 6,
        at: 1795583870113,
        kind: "clock set",
        group: "clock:cooling-off",
        key: { label: "step", value: "cooling-off" },
        fields: {}
      },
      {
        n: 7,
        at: 1795583960112,
        kind: "clock fired",
        group: "clock:cooling-off",
        key: { label: "step", value: "cooling-off" },
        fields: {}
      },
      {
        n: 8,
        at: 1795583970003,
        kind: "attempt started",
        group: "activity:request shipment",
        key: { label: "step", value: "request shipment #1" },
        fields: {}
      },
      {
        n: 9,
        at: 1795583970036,
        kind: "completed",
        group: "activity:request shipment",
        key: { label: "step", value: "request shipment #1" },
        fields: {}
      },
      {
        n: 10,
        at: 1795583990058,
        kind: "deferred completed",
        group: "deferred:shipped",
        key: { label: "step", value: "shipped" },
        fields: {}
      },
      { n: 11, at: 1795583990112, kind: "finished", key: { label: "step", value: "run" }, fields: {} }
    ]
  }
]
