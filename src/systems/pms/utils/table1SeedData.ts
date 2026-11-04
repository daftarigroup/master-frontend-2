// @ts-nocheck
// Auto-generated from Table 1 of Qty Abst PDN Km 0 to 10 Surewada working 28-8-2025.xlsx
// Sheet: Table 1 (Exclusive single source of truth)

export interface MinorMeta {
  id: string;
  name: string;
  rd: string;
  tenderCol: string;
  designCol: string;
  tenderCca: number;
  designCca: number;
}

export const TABLE_1_MINORS: MinorMeta[] = [
  {
    "id": "injewada",
    "name": "Injewada",
    "rd": "RD 120 M",
    "tenderCol": "F",
    "designCol": "G",
    "tenderCca": 124.95,
    "designCca": 149.42
  },
  {
    "id": "sarpewada",
    "name": "Sarpewada",
    "rd": "RD 1110 M",
    "tenderCol": "H",
    "designCol": "I",
    "tenderCca": 47.611,
    "designCca": 58.72
  },
  {
    "id": "koka1",
    "name": "Koka-1",
    "rd": "RD 3240 M",
    "tenderCol": "J",
    "designCol": "K",
    "tenderCca": 454.04,
    "designCca": 530.14
  },
  {
    "id": "koka2",
    "name": "Koka-2",
    "rd": "RD 4645 M",
    "tenderCol": "L",
    "designCol": "M",
    "tenderCca": 52.19,
    "designCca": 77.92
  },
  {
    "id": "sonkund",
    "name": "Sonkund",
    "rd": "RD 6030 M",
    "tenderCol": "N",
    "designCol": "O",
    "tenderCca": 164.88,
    "designCca": 221.79
  },
  {
    "id": "palora",
    "name": "Palora",
    "rd": "RD 6850 M",
    "tenderCol": "P",
    "designCol": "Q",
    "tenderCca": 493.502,
    "designCca": 612.33
  },
  {
    "id": "kesalwada",
    "name": "Kesalwada",
    "rd": "RD 8770 M",
    "tenderCol": "R",
    "designCol": "S",
    "tenderCca": 133.58,
    "designCca": 162.07
  },
  {
    "id": "dudhara",
    "name": "Dudhara",
    "rd": "RD 1300 m",
    "tenderCol": "T",
    "designCol": "U",
    "tenderCca": 0,
    "designCca": 33.86
  }
];

export interface Table1Item {
  row: number;
  itemNo: string;
  subItem: string;
  pipeDiaMm?: number;
  description: string;
  unit: string;
  rate: number;
  category: string;
  feedsGrandTotal: boolean;
  tenderQty: number;
  tenderAmount: number;
  designQty: number;
  designAmount: number;
  diffAmount: number;
  pctDiff: number;
  minors: Record<string, { tenderQty: number; designQty: number; executedQty?: number; actualQty?: number }>;
}

export const TABLE_1_ITEMS: Table1Item[] = [
  {
    "row": 5,
    "itemNo": "Area CCA",
    "subItem": "",
    "description": "Area CCA (Culturable Command Area)",
    "unit": "HA",
    "rate": 0,
    "category": "CCA",
    "feedsGrandTotal": false,
    "tenderQty": 1470.75,
    "tenderAmount": 114004.66540880501,
    "designQty": 1812.39,
    "designAmount": 99849.38948653435,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 124.95,
        "designQty": 149.42
      },
      "sarpewada": {
        "tenderQty": 47.611,
        "designQty": 58.72
      },
      "koka1": {
        "tenderQty": 454.04,
        "designQty": 530.14
      },
      "koka2": {
        "tenderQty": 52.19,
        "designQty": 77.92
      },
      "sonkund": {
        "tenderQty": 164.88,
        "designQty": 221.79
      },
      "palora": {
        "tenderQty": 493.502,
        "designQty": 612.33
      },
      "kesalwada": {
        "tenderQty": 133.58,
        "designQty": 162.07
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 33.86
      }
    }
  },
  {
    "row": 6,
    "itemNo": "HDPE 4 Kg /Cm2",
    "subItem": "",
    "description": "HDPE 4 Kg /Cm2 Pipe Supply",
    "unit": "",
    "rate": 0,
    "category": "OTHER",
    "feedsGrandTotal": false,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 7,
    "itemNo": "a",
    "subItem": "110",
    "pipeDiaMm": 110,
    "description": "Supply of HDPE 4 kg/cm² Pipe 110 mm",
    "unit": "Rmt",
    "rate": 329.2,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1092,
    "tenderAmount": 359486.39999999997,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": -359486.39999999997,
    "pctDiff": -1,
    "minors": {
      "injewada": {
        "tenderQty": 884,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 208,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 8,
    "itemNo": "b",
    "subItem": "125",
    "pipeDiaMm": 125,
    "description": "Supply of HDPE 4 kg/cm² Pipe 125 mm",
    "unit": "Rmt",
    "rate": 394.9,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 4637,
    "tenderAmount": 1831151.2999999998,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": -1831151.2999999998,
    "pctDiff": -1,
    "minors": {
      "injewada": {
        "tenderQty": 1542,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 2239,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 856,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 9,
    "itemNo": "c",
    "subItem": "140",
    "pipeDiaMm": 140,
    "description": "Supply of HDPE 4 kg/cm² Pipe 140 mm",
    "unit": "Rmt",
    "rate": 487.35,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 16431,
    "tenderAmount": 8007647.850000001,
    "designQty": 22452.3,
    "designAmount": 10942128.405,
    "diffAmount": 2934480.554999999,
    "pctDiff": 0.3664597407339783,
    "minors": {
      "injewada": {
        "tenderQty": 327,
        "designQty": 1291.3
      },
      "sarpewada": {
        "tenderQty": 476,
        "designQty": 1216
      },
      "koka1": {
        "tenderQty": 4731,
        "designQty": 6810
      },
      "koka2": {
        "tenderQty": 447,
        "designQty": 1587
      },
      "sonkund": {
        "tenderQty": 3205,
        "designQty": 2527
      },
      "palora": {
        "tenderQty": 6659,
        "designQty": 7194
      },
      "kesalwada": {
        "tenderQty": 586,
        "designQty": 1827
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 112
      }
    }
  },
  {
    "row": 10,
    "itemNo": "d",
    "subItem": "160",
    "pipeDiaMm": 160,
    "description": "Supply of HDPE 4 kg/cm² Pipe 160 mm",
    "unit": "Rmt",
    "rate": 616.95,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 5189,
    "tenderAmount": 3201353.5500000003,
    "designQty": 4331.03,
    "designAmount": 2672028.9585,
    "diffAmount": -529324.5915000001,
    "pctDiff": -0.16534399691655427,
    "minors": {
      "injewada": {
        "tenderQty": 664,
        "designQty": 383.03
      },
      "sarpewada": {
        "tenderQty": 888,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 780,
        "designQty": 1458
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 944,
        "designQty": 705
      },
      "palora": {
        "tenderQty": 589,
        "designQty": 919
      },
      "kesalwada": {
        "tenderQty": 1324,
        "designQty": 866
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 297
      }
    }
  },
  {
    "row": 11,
    "itemNo": "e",
    "subItem": "180",
    "pipeDiaMm": 180,
    "description": "Supply of HDPE 4 kg/cm² Pipe 180 mm",
    "unit": "Rmt",
    "rate": 757.95,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 3811,
    "tenderAmount": 2888547.45,
    "designQty": 4085.01,
    "designAmount": 3096233.3295000005,
    "diffAmount": 207685.87950000027,
    "pctDiff": 0.0718997638415115,
    "minors": {
      "injewada": {
        "tenderQty": 1043,
        "designQty": 610.01
      },
      "sarpewada": {
        "tenderQty": 465,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 993,
        "designQty": 1336
      },
      "koka2": {
        "tenderQty": 322,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 350,
        "designQty": 227
      },
      "palora": {
        "tenderQty": 529,
        "designQty": 1712
      },
      "kesalwada": {
        "tenderQty": 109,
        "designQty": 200
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 12,
    "itemNo": "f",
    "subItem": "200",
    "pipeDiaMm": 200,
    "description": "Supply of HDPE 4 kg/cm² Pipe 200 mm",
    "unit": "Rmt",
    "rate": 922.4,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1883,
    "tenderAmount": 1736879.2,
    "designQty": 3984.52,
    "designAmount": 3675321.2479999997,
    "diffAmount": 1938442.0479999997,
    "pctDiff": 1.116048858204992,
    "minors": {
      "injewada": {
        "tenderQty": 836,
        "designQty": 417.52
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 355
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 583
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 94
      },
      "sonkund": {
        "tenderQty": 287,
        "designQty": 1250
      },
      "palora": {
        "tenderQty": 591,
        "designQty": 824
      },
      "kesalwada": {
        "tenderQty": 169,
        "designQty": 461
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 10
      }
    }
  },
  {
    "row": 13,
    "itemNo": "g",
    "subItem": "225",
    "pipeDiaMm": 225,
    "description": "Supply of HDPE 4 kg/cm² Pipe 225 mm",
    "unit": "Rmt",
    "rate": 1171,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 2842,
    "tenderAmount": 3327982,
    "designQty": 2868.35,
    "designAmount": 3358837.85,
    "diffAmount": 30855.850000000093,
    "pctDiff": 0.00927163969035893,
    "minors": {
      "injewada": {
        "tenderQty": 264,
        "designQty": 114.35
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 90
      },
      "koka1": {
        "tenderQty": 484,
        "designQty": 720
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 584
      },
      "palora": {
        "tenderQty": 1272,
        "designQty": 1360
      },
      "kesalwada": {
        "tenderQty": 822,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 609
      }
    }
  },
  {
    "row": 14,
    "itemNo": "h",
    "subItem": "250",
    "pipeDiaMm": 250,
    "description": "Supply of HDPE 4 kg/cm² Pipe 250 mm",
    "unit": "Rmt",
    "rate": 1411.8,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1525,
    "tenderAmount": 2152995,
    "designQty": 2464.37,
    "designAmount": 3479197.5659999996,
    "diffAmount": 1326202.5659999996,
    "pctDiff": 0.6159803278688523,
    "minors": {
      "injewada": {
        "tenderQty": 175,
        "designQty": 133.37
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 472
      },
      "koka1": {
        "tenderQty": 127,
        "designQty": 478
      },
      "koka2": {
        "tenderQty": 219,
        "designQty": 211
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 236
      },
      "palora": {
        "tenderQty": 860,
        "designQty": 635
      },
      "kesalwada": {
        "tenderQty": 144,
        "designQty": 299
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 15,
    "itemNo": "i",
    "subItem": "280",
    "pipeDiaMm": 280,
    "description": "Supply of HDPE 4 kg/cm² Pipe 280 mm",
    "unit": "Rmt",
    "rate": 1762.25,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 2399,
    "tenderAmount": 4227637.75,
    "designQty": 2609.39,
    "designAmount": 4598397.5275,
    "diffAmount": 370759.77749999985,
    "pctDiff": 0.08769904126719463,
    "minors": {
      "injewada": {
        "tenderQty": 232,
        "designQty": 1008.39
      },
      "sarpewada": {
        "tenderQty": 313,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 439,
        "designQty": 388
      },
      "koka2": {
        "tenderQty": 140,
        "designQty": 232
      },
      "sonkund": {
        "tenderQty": 235,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1040,
        "designQty": 744
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 237
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 371
      }
    }
  },
  {
    "row": 16,
    "itemNo": "j",
    "subItem": "315",
    "pipeDiaMm": 315,
    "description": "Supply of HDPE 4 kg/cm² Pipe 315 mm",
    "unit": "Rmt",
    "rate": 2218.75,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 2509,
    "tenderAmount": 5566843.75,
    "designQty": 2429,
    "designAmount": 5389343.75,
    "diffAmount": -177500,
    "pctDiff": -0.03188521323236349,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 268
      },
      "koka1": {
        "tenderQty": 348,
        "designQty": 169
      },
      "koka2": {
        "tenderQty": 609,
        "designQty": 168
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 184
      },
      "palora": {
        "tenderQty": 1429,
        "designQty": 1640
      },
      "kesalwada": {
        "tenderQty": 123,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 19
      }
    }
  },
  {
    "row": 17,
    "itemNo": "k",
    "subItem": "355",
    "pipeDiaMm": 355,
    "description": "Supply of HDPE 4 kg/cm² Pipe 355 mm",
    "unit": "Rmt",
    "rate": 2779.4,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 2195,
    "tenderAmount": 6100783,
    "designQty": 3278.7,
    "designAmount": 9112818.78,
    "diffAmount": 3012035.7799999993,
    "pctDiff": 0.49371298405466957,
    "minors": {
      "injewada": {
        "tenderQty": 380,
        "designQty": 225.7
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 40
      },
      "koka1": {
        "tenderQty": 557,
        "designQty": 133
      },
      "koka2": {
        "tenderQty": 875,
        "designQty": 282
      },
      "sonkund": {
        "tenderQty": 139,
        "designQty": 383
      },
      "palora": {
        "tenderQty": 244,
        "designQty": 2215
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 18,
    "itemNo": "l",
    "subItem": "400",
    "pipeDiaMm": 400,
    "description": "Supply of HDPE 4 kg/cm² Pipe 400 mm",
    "unit": "Rmt",
    "rate": 3463.05,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 2058,
    "tenderAmount": 7126956.9,
    "designQty": 2901,
    "designAmount": 10046308.05,
    "diffAmount": 2919351.1500000004,
    "pctDiff": 0.4096209912536444,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 905,
        "designQty": 928
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 843
      },
      "sonkund": {
        "tenderQty": 127,
        "designQty": 207
      },
      "palora": {
        "tenderQty": 550,
        "designQty": 923
      },
      "kesalwada": {
        "tenderQty": 476,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 19,
    "itemNo": "m",
    "subItem": "450",
    "pipeDiaMm": 450,
    "description": "Supply of HDPE 4 kg/cm² Pipe 450 mm",
    "unit": "Rmt",
    "rate": 4297.2,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1334,
    "tenderAmount": 5732464.8,
    "designQty": 515.94,
    "designAmount": 2217097.3680000002,
    "diffAmount": -3515367.4319999996,
    "pctDiff": -0.6132383808095951,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 141.94
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 165
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 329,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1005,
        "designQty": 209
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 20,
    "itemNo": "n",
    "subItem": "500",
    "pipeDiaMm": 500,
    "description": "Supply of HDPE 4 kg/cm² Pipe 500 mm",
    "unit": "Rmt",
    "rate": 5265.45,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 3671,
    "tenderAmount": 19329466.95,
    "designQty": 1845.46,
    "designAmount": 9717177.357,
    "diffAmount": -9612289.592999998,
    "pctDiff": -0.49728684282211927,
    "minors": {
      "injewada": {
        "tenderQty": 935,
        "designQty": 517.46
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 920,
        "designQty": 259
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1527,
        "designQty": 136
      },
      "kesalwada": {
        "tenderQty": 289,
        "designQty": 933
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 21,
    "itemNo": "o",
    "subItem": "560",
    "pipeDiaMm": 560,
    "description": "Supply of HDPE 4 kg/cm² Pipe 560 mm",
    "unit": "Rmt",
    "rate": 6515.7,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1933,
    "tenderAmount": 12594848.1,
    "designQty": 2769.33,
    "designAmount": 18044123.481,
    "diffAmount": 5449275.380999999,
    "pctDiff": 0.4326590791515778,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 1366.33
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 963,
        "designQty": 920
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 66
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 243
      },
      "kesalwada": {
        "tenderQty": 970,
        "designQty": 174
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 22,
    "itemNo": "p",
    "subItem": "630",
    "pipeDiaMm": 630,
    "description": "Supply of HDPE 4 kg/cm² Pipe 630 mm",
    "unit": "Rmt",
    "rate": 8256.05,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 3142,
    "tenderAmount": 25940509.099999998,
    "designQty": 2964.42,
    "designAmount": 24474399.740999997,
    "diffAmount": -1466109.359000001,
    "pctDiff": -0.056518141311266756,
    "minors": {
      "injewada": {
        "tenderQty": 438,
        "designQty": 106.42
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1173,
        "designQty": 1138
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 1531,
        "designQty": 681
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 516
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 523
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 23,
    "itemNo": "q",
    "subItem": "710",
    "pipeDiaMm": 710,
    "description": "Supply of HDPE 4 kg/cm² Pipe 710 mm",
    "unit": "Rmt",
    "rate": 10397.35,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 2152,
    "tenderAmount": 22375097.2,
    "designQty": 2667,
    "designAmount": 27729732.45,
    "diffAmount": 5354635.25,
    "pctDiff": 0.23931226765799257,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1537,
        "designQty": 1325
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 638
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 522
      },
      "kesalwada": {
        "tenderQty": 615,
        "designQty": 182
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 24,
    "itemNo": "r",
    "subItem": "800",
    "pipeDiaMm": 800,
    "description": "Supply of HDPE 4 kg/cm² Pipe 800 mm",
    "unit": "Rmt",
    "rate": 12273.5,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1062,
    "tenderAmount": 13034457,
    "designQty": 2205,
    "designAmount": 27063067.5,
    "diffAmount": 14028610.5,
    "pctDiff": 1.076271186440678,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 523,
        "designQty": 1045
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 539,
        "designQty": 1160
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 25,
    "itemNo": "PCCP",
    "subItem": "",
    "description": "Subtotal HDPE Pipe Supply (110mm - 800mm)",
    "unit": "",
    "rate": 0,
    "category": "HDPE_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 59865,
    "tenderAmount": 145535107.29999998,
    "designQty": 64370.81999999999,
    "designAmount": 165616213.3615,
    "diffAmount": 20081106.061500013,
    "pctDiff": 0.1379811815447778,
    "minors": {
      "injewada": {
        "tenderQty": 7720,
        "designQty": 6315.82
      },
      "sarpewada": {
        "tenderQty": 2142,
        "designQty": 2441
      },
      "koka1": {
        "tenderQty": 16927,
        "designQty": 17855
      },
      "koka2": {
        "tenderQty": 3468,
        "designQty": 3417
      },
      "sonkund": {
        "tenderQty": 7147,
        "designQty": 7688
      },
      "palora": {
        "tenderQty": 16834,
        "designQty": 20952
      },
      "kesalwada": {
        "tenderQty": 5627,
        "designQty": 5702
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 1418
      }
    }
  },
  {
    "row": 26,
    "itemNo": "Item No. 8:- Providing and supplying Prestressed\r\nConcrete Cylinder Pipes suitable for sliding ovrelap",
    "subItem": "",
    "description": "Average Rate per Metre (HDPE Supply)",
    "unit": "",
    "rate": 0,
    "category": "PCCP_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 0,
    "tenderAmount": 2431.054995406331,
    "designQty": 0,
    "designAmount": 2572.8461026517916,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 27,
    "itemNo": "a",
    "subItem": "900",
    "pipeDiaMm": 900,
    "description": "Item No. 8: Supply of PCCP 900 mm Pipe",
    "unit": "Rmt",
    "rate": 14199.65,
    "category": "PCCP_SUPPLY",
    "feedsGrandTotal": false,
    "tenderQty": 1559,
    "tenderAmount": 22137254.349999998,
    "designQty": 1081,
    "designAmount": 15349821.65,
    "diffAmount": -6787432.699999997,
    "pctDiff": -0.30660679923027573,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 716,
        "designQty": 516
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 843,
        "designQty": 565
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 28,
    "itemNo": "ITEM NO :1A Excavation for deep trenches for laying rising",
    "subItem": "",
    "description": "ITEM NO :1A Excavation for deep trenches for laying rising",
    "unit": "CUM",
    "rate": 158.5,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 98029.56,
    "tenderAmount": 15537685.26,
    "designQty": 102602.73999999999,
    "designAmount": 16262534.29,
    "diffAmount": 724849.0299999993,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 11716.259999999998,
        "designQty": 11513.82
      },
      "sarpewada": {
        "tenderQty": 2671.12,
        "designQty": 3087.3599999999997
      },
      "koka1": {
        "tenderQty": 32587.49,
        "designQty": 31295.64
      },
      "koka2": {
        "tenderQty": 4417.09,
        "designQty": 4366.43
      },
      "sonkund": {
        "tenderQty": 10505.779999999999,
        "designQty": 10805.03
      },
      "palora": {
        "tenderQty": 26946.24,
        "designQty": 33610.380000000005
      },
      "kesalwada": {
        "tenderQty": 9185.58,
        "designQty": 7924.08
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 29,
    "itemNo": "ITEM NO : 1B EXCAVATION FOR DEEP TRENCHES",
    "subItem": "",
    "description": "ITEM NO : 1B EXCAVATION FOR DEEP TRENCHES",
    "unit": "CUM",
    "rate": 647.9,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 11464.950000000004,
    "tenderAmount": 7428141.105000002,
    "designQty": 11932.220000000003,
    "designAmount": 7730885.338000001,
    "diffAmount": 302744.2329999991,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1301.810000000004,
        "designQty": 1279.309999999997
      },
      "sarpewada": {
        "tenderQty": 425.82000000000045,
        "designQty": 492.19000000000034
      },
      "koka1": {
        "tenderQty": 3620.829999999998,
        "designQty": 3477.2900000000072
      },
      "koka2": {
        "tenderQty": 490.7900000000003,
        "designQty": 485.14999999999986
      },
      "sonkund": {
        "tenderQty": 1167.3100000000004,
        "designQty": 1200.5499999999977
      },
      "palora": {
        "tenderQty": 2994.0299999999997,
        "designQty": 3734.4799999999996
      },
      "kesalwada": {
        "tenderQty": 1464.3600000000006,
        "designQty": 1263.25
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 30,
    "itemNo": "ITEM NO :2 EXCAVATION IN SOFT STARTA",
    "subItem": "",
    "description": "ITEM NO :2 EXCAVATION IN SOFT STARTA",
    "unit": "CUM",
    "rate": 106,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 4774.3,
    "tenderAmount": 506075.80000000005,
    "designQty": 4774.3,
    "designAmount": 506075.80000000005,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 440.25,
        "designQty": 440.25
      },
      "sarpewada": {
        "tenderQty": 173.95,
        "designQty": 173.95
      },
      "koka1": {
        "tenderQty": 1079.96,
        "designQty": 1079.96
      },
      "koka2": {
        "tenderQty": 213.11,
        "designQty": 213.11
      },
      "sonkund": {
        "tenderQty": 580.13,
        "designQty": 580.13
      },
      "palora": {
        "tenderQty": 1903.3,
        "designQty": 1903.3
      },
      "kesalwada": {
        "tenderQty": 383.59999999999997,
        "designQty": 383.59999999999997
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 31,
    "itemNo": "ITEM NO :3 MURUM BEDDING",
    "subItem": "",
    "description": "ITEM NO :3 MURUM BEDDING",
    "unit": "CUM",
    "rate": 242.9,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 11026.65,
    "tenderAmount": 2678373.285,
    "designQty": 24374.904,
    "designAmount": 5920664.1816,
    "diffAmount": 3242290.8965999996,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1232.18,
        "designQty": 1162.29
      },
      "sarpewada": {
        "tenderQty": 291.06,
        "designQty": 344.91
      },
      "koka1": {
        "tenderQty": 3475.72,
        "designQty": 3357.1
      },
      "koka2": {
        "tenderQty": 548.26,
        "designQty": 541.6
      },
      "sonkund": {
        "tenderQty": 1236.26,
        "designQty": 1303.58
      },
      "palora": {
        "tenderQty": 3144.86,
        "designQty": 3898.66
      },
      "kesalwada": {
        "tenderQty": 1098.31,
        "designQty": 13766.764000000003
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 32,
    "itemNo": "ITEM NO : 4 BACKFILLING",
    "subItem": "",
    "description": "ITEM NO : 4 BACKFILLING",
    "unit": "CUM",
    "rate": 47.3,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 59901.631824375,
    "tenderAmount": 2833347.1852929373,
    "designQty": 62607.83061137501,
    "designAmount": 2961350.387918038,
    "diffAmount": 128003.2026251005,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 7454.731222499998,
        "designQty": 7315.905187625001
      },
      "sarpewada": {
        "tenderQty": 1751.3999999999999,
        "designQty": 2011.4700000000003
      },
      "koka1": {
        "tenderQty": 19744.876552125,
        "designQty": 19011.946098375003
      },
      "koka2": {
        "tenderQty": 2633.824914,
        "designQty": 2603.266968000001
      },
      "sonkund": {
        "tenderQty": 6273.536006625,
        "designQty": 6488.739877875
      },
      "palora": {
        "tenderQty": 16362.96,
        "designQty": 20244.75
      },
      "kesalwada": {
        "tenderQty": 5680.303129125001,
        "designQty": 4931.752479500001
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 33,
    "itemNo": "ITEM NO :5 RUBBLE SOLLING BELOW",
    "subItem": "",
    "description": "ITEM NO :5 RUBBLE SOLLING BELOW",
    "unit": "CUM",
    "rate": 1973,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 455.05999999999995,
    "tenderAmount": 897833.3799999999,
    "designQty": 455.05999999999995,
    "designAmount": 897833.3799999999,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 39.94,
        "designQty": 39.94
      },
      "sarpewada": {
        "tenderQty": 20.7,
        "designQty": 20.7
      },
      "koka1": {
        "tenderQty": 98.02,
        "designQty": 98.02
      },
      "koka2": {
        "tenderQty": 24.740000000000002,
        "designQty": 24.740000000000002
      },
      "sonkund": {
        "tenderQty": 58.62,
        "designQty": 58.62
      },
      "palora": {
        "tenderQty": 171.45999999999998,
        "designQty": 171.45999999999998
      },
      "kesalwada": {
        "tenderQty": 41.58,
        "designQty": 41.58
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 34,
    "itemNo": "ITEM NO :6 SAND BEDDING",
    "subItem": "",
    "description": "ITEM NO :6 SAND BEDDING",
    "unit": "CUM",
    "rate": 1276.25,
    "category": "EARTHWORK",
    "feedsGrandTotal": true,
    "tenderQty": 3341.1400000000017,
    "tenderAmount": 4264129.925000003,
    "designQty": 3488.7500000000005,
    "designAmount": 4452517.187500001,
    "diffAmount": 188387.26249999832,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 364.4,
        "designQty": 343.14000000000016
      },
      "sarpewada": {
        "tenderQty": 98.50999999999999,
        "designQty": 111.98000000000008
      },
      "koka1": {
        "tenderQty": 1004.2000000000007,
        "designQty": 974.54
      },
      "koka2": {
        "tenderQty": 168.75000000000006,
        "designQty": 167.07999999999998
      },
      "sonkund": {
        "tenderQty": 382.8399999999999,
        "designQty": 400.93000000000006
      },
      "palora": {
        "tenderQty": 994.9200000000005,
        "designQty": 1192.22
      },
      "kesalwada": {
        "tenderQty": 327.5199999999999,
        "designQty": 298.86000000000007
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 35,
    "itemNo": "",
    "subItem": "",
    "description": "Row 35",
    "unit": "",
    "rate": 0,
    "category": "OTHER",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 36,
    "itemNo": "ITEM NO 7",
    "subItem": "",
    "description": "ITEM NO 7",
    "unit": "",
    "rate": 0,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 37,
    "itemNo": "",
    "subItem": "110",
    "pipeDiaMm": 110,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 110 mm",
    "unit": "Rmt",
    "rate": 329.2,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1092,
    "tenderAmount": 359486.39999999997,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": -359486.39999999997,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 884,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 208,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 38,
    "itemNo": "",
    "subItem": "125",
    "pipeDiaMm": 125,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 125 mm",
    "unit": "Rmt",
    "rate": 394.9,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 4637,
    "tenderAmount": 1831151.2999999998,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": -1831151.2999999998,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1542,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 2239,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 856,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 39,
    "itemNo": "",
    "subItem": "140",
    "pipeDiaMm": 140,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 140 mm",
    "unit": "Rmt",
    "rate": 487.35,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 16431,
    "tenderAmount": 8007647.850000001,
    "designQty": 22452.3,
    "designAmount": 10942128.405,
    "diffAmount": 2934480.554999999,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 327,
        "designQty": 1291.3
      },
      "sarpewada": {
        "tenderQty": 476,
        "designQty": 1216
      },
      "koka1": {
        "tenderQty": 4731,
        "designQty": 6810
      },
      "koka2": {
        "tenderQty": 447,
        "designQty": 1587
      },
      "sonkund": {
        "tenderQty": 3205,
        "designQty": 2527
      },
      "palora": {
        "tenderQty": 6659,
        "designQty": 7194
      },
      "kesalwada": {
        "tenderQty": 586,
        "designQty": 1827
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 40,
    "itemNo": "",
    "subItem": "160",
    "pipeDiaMm": 160,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 160 mm",
    "unit": "Rmt",
    "rate": 616.95,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 5189,
    "tenderAmount": 3201353.5500000003,
    "designQty": 4331.03,
    "designAmount": 2672028.9585,
    "diffAmount": -529324.5915000001,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 664,
        "designQty": 383.03
      },
      "sarpewada": {
        "tenderQty": 888,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 780,
        "designQty": 1458
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 944,
        "designQty": 705
      },
      "palora": {
        "tenderQty": 589,
        "designQty": 919
      },
      "kesalwada": {
        "tenderQty": 1324,
        "designQty": 866
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 41,
    "itemNo": "",
    "subItem": "180",
    "pipeDiaMm": 180,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 180 mm",
    "unit": "Rmt",
    "rate": 757.95,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 3811,
    "tenderAmount": 2888547.45,
    "designQty": 4085.01,
    "designAmount": 3096233.3295000005,
    "diffAmount": 207685.87950000027,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1043,
        "designQty": 610.01
      },
      "sarpewada": {
        "tenderQty": 465,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 993,
        "designQty": 1336
      },
      "koka2": {
        "tenderQty": 322,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 350,
        "designQty": 227
      },
      "palora": {
        "tenderQty": 529,
        "designQty": 1712
      },
      "kesalwada": {
        "tenderQty": 109,
        "designQty": 200
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 42,
    "itemNo": "",
    "subItem": "200",
    "pipeDiaMm": 200,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 200 mm",
    "unit": "Rmt",
    "rate": 922.4,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1883,
    "tenderAmount": 1736879.2,
    "designQty": 3984.52,
    "designAmount": 3675321.2479999997,
    "diffAmount": 1938442.0479999997,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 836,
        "designQty": 417.52
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 355
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 583
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 94
      },
      "sonkund": {
        "tenderQty": 287,
        "designQty": 1250
      },
      "palora": {
        "tenderQty": 591,
        "designQty": 824
      },
      "kesalwada": {
        "tenderQty": 169,
        "designQty": 461
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 43,
    "itemNo": "",
    "subItem": "225",
    "pipeDiaMm": 225,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 225 mm",
    "unit": "Rmt",
    "rate": 1171,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 2842,
    "tenderAmount": 3327982,
    "designQty": 2868.35,
    "designAmount": 3358837.85,
    "diffAmount": 30855.850000000093,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 264,
        "designQty": 114.35
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 90
      },
      "koka1": {
        "tenderQty": 484,
        "designQty": 720
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 584
      },
      "palora": {
        "tenderQty": 1272,
        "designQty": 1360
      },
      "kesalwada": {
        "tenderQty": 822,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 44,
    "itemNo": "",
    "subItem": "250",
    "pipeDiaMm": 250,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 250 mm",
    "unit": "Rmt",
    "rate": 1411.8,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1525,
    "tenderAmount": 2152995,
    "designQty": 2464.37,
    "designAmount": 3479197.5659999996,
    "diffAmount": 1326202.5659999996,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 175,
        "designQty": 133.37
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 472
      },
      "koka1": {
        "tenderQty": 127,
        "designQty": 478
      },
      "koka2": {
        "tenderQty": 219,
        "designQty": 211
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 236
      },
      "palora": {
        "tenderQty": 860,
        "designQty": 635
      },
      "kesalwada": {
        "tenderQty": 144,
        "designQty": 299
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 45,
    "itemNo": "",
    "subItem": "280",
    "pipeDiaMm": 280,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 280 mm",
    "unit": "Rmt",
    "rate": 1762.25,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 2399,
    "tenderAmount": 4227637.75,
    "designQty": 2609.39,
    "designAmount": 4598397.5275,
    "diffAmount": 370759.77749999985,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 232,
        "designQty": 1008.39
      },
      "sarpewada": {
        "tenderQty": 313,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 439,
        "designQty": 388
      },
      "koka2": {
        "tenderQty": 140,
        "designQty": 232
      },
      "sonkund": {
        "tenderQty": 235,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1040,
        "designQty": 744
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 237
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 46,
    "itemNo": "",
    "subItem": "315",
    "pipeDiaMm": 315,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 315 mm",
    "unit": "Rmt",
    "rate": 2218.75,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 2509,
    "tenderAmount": 5566843.75,
    "designQty": 2429,
    "designAmount": 5389343.75,
    "diffAmount": -177500,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 268
      },
      "koka1": {
        "tenderQty": 348,
        "designQty": 169
      },
      "koka2": {
        "tenderQty": 609,
        "designQty": 168
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 184
      },
      "palora": {
        "tenderQty": 1429,
        "designQty": 1640
      },
      "kesalwada": {
        "tenderQty": 123,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 47,
    "itemNo": "",
    "subItem": "355",
    "pipeDiaMm": 355,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 355 mm",
    "unit": "Rmt",
    "rate": 2779.4,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 2195,
    "tenderAmount": 6100783,
    "designQty": 3278.7,
    "designAmount": 9112818.78,
    "diffAmount": 3012035.7799999993,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 380,
        "designQty": 225.7
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 40
      },
      "koka1": {
        "tenderQty": 557,
        "designQty": 133
      },
      "koka2": {
        "tenderQty": 875,
        "designQty": 282
      },
      "sonkund": {
        "tenderQty": 139,
        "designQty": 383
      },
      "palora": {
        "tenderQty": 244,
        "designQty": 2215
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 48,
    "itemNo": "",
    "subItem": "400",
    "pipeDiaMm": 400,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 400 mm",
    "unit": "Rmt",
    "rate": 3463.05,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 2058,
    "tenderAmount": 7126956.9,
    "designQty": 2901,
    "designAmount": 10046308.05,
    "diffAmount": 2919351.1500000004,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 905,
        "designQty": 928
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 843
      },
      "sonkund": {
        "tenderQty": 127,
        "designQty": 207
      },
      "palora": {
        "tenderQty": 550,
        "designQty": 923
      },
      "kesalwada": {
        "tenderQty": 476,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 49,
    "itemNo": "",
    "subItem": "450",
    "pipeDiaMm": 450,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 450 mm",
    "unit": "Rmt",
    "rate": 4297.2,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1334,
    "tenderAmount": 5732464.8,
    "designQty": 515.94,
    "designAmount": 2217097.3680000002,
    "diffAmount": -3515367.4319999996,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 141.94
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 165
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 329,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1005,
        "designQty": 209
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 50,
    "itemNo": "",
    "subItem": "500",
    "pipeDiaMm": 500,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 500 mm",
    "unit": "Rmt",
    "rate": 5265.45,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 3671,
    "tenderAmount": 19329466.95,
    "designQty": 1845.46,
    "designAmount": 9717177.357,
    "diffAmount": -9612289.592999998,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 935,
        "designQty": 517.46
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 920,
        "designQty": 259
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1527,
        "designQty": 136
      },
      "kesalwada": {
        "tenderQty": 289,
        "designQty": 933
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 51,
    "itemNo": "",
    "subItem": "560",
    "pipeDiaMm": 560,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 560 mm",
    "unit": "Rmt",
    "rate": 6515.7,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1933,
    "tenderAmount": 12594848.1,
    "designQty": 2769.33,
    "designAmount": 18044123.481,
    "diffAmount": 5449275.380999999,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 1366.33
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 963,
        "designQty": 920
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 66
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 243
      },
      "kesalwada": {
        "tenderQty": 970,
        "designQty": 174
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 52,
    "itemNo": "",
    "subItem": "630",
    "pipeDiaMm": 630,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 630 mm",
    "unit": "Rmt",
    "rate": 8256.05,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 3142,
    "tenderAmount": 25940509.099999998,
    "designQty": 2964.42,
    "designAmount": 24474399.740999997,
    "diffAmount": -1466109.359000001,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 438,
        "designQty": 106.42
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1173,
        "designQty": 1138
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 1531,
        "designQty": 681
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 516
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 523
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 53,
    "itemNo": "",
    "subItem": "710",
    "pipeDiaMm": 710,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 710 mm",
    "unit": "Rmt",
    "rate": 10397.35,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 2152,
    "tenderAmount": 22375097.2,
    "designQty": 2667,
    "designAmount": 27729732.45,
    "diffAmount": 5354635.25,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1537,
        "designQty": 1325
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 638
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 522
      },
      "kesalwada": {
        "tenderQty": 615,
        "designQty": 182
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 54,
    "itemNo": "",
    "subItem": "800",
    "pipeDiaMm": 800,
    "description": "Item 7: Providing, Laying, Jointing HDPE 4 kg/cm² Pipe 800 mm",
    "unit": "Rmt",
    "rate": 12273.5,
    "category": "HDPE_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1062,
    "tenderAmount": 13034457,
    "designQty": 2205,
    "designAmount": 27063067.5,
    "diffAmount": 14028610.5,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 523,
        "designQty": 1045
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 539,
        "designQty": 1160
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 55,
    "itemNo": "Item No. 8:- Providing and supplying Prestressed\r\nConcrete Cylinder Pipes suitable for sliding ovrelap",
    "subItem": "",
    "description": "Item No. 8:- Providing and supplying Prestressed Concrete Cylinder Pipes suitable for sliding ovrelap",
    "unit": "",
    "rate": 0,
    "category": "PCCP_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 56,
    "itemNo": "a",
    "subItem": "900",
    "pipeDiaMm": 900,
    "description": "Item 8: Providing, Laying, Jointing PCCP 900 mm Pipe",
    "unit": "Rmt",
    "rate": 14199.65,
    "category": "PCCP_LAYING",
    "feedsGrandTotal": true,
    "tenderQty": 1559,
    "tenderAmount": 22137254.349999998,
    "designQty": 1081,
    "designAmount": 15349821.65,
    "diffAmount": -6787432.699999997,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 716,
        "designQty": 516
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 843,
        "designQty": 565
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 57,
    "itemNo": "",
    "subItem": "",
    "description": "Row 57",
    "unit": "",
    "rate": 0,
    "category": "OTHER",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 58,
    "itemNo": "Item No. 9:- Air valves",
    "subItem": "",
    "description": "Item No. 9:- Air valves",
    "unit": "",
    "rate": 0,
    "category": "AIR_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 59,
    "itemNo": "",
    "subItem": "50",
    "pipeDiaMm": 50,
    "description": "50",
    "unit": "No",
    "rate": 11173.650000000001,
    "category": "AIR_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 91,
    "tenderAmount": 1016802.1500000001,
    "designQty": 89,
    "designAmount": 994454.8500000001,
    "diffAmount": -22347.300000000047,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 11,
        "designQty": 5
      },
      "sarpewada": {
        "tenderQty": 5,
        "designQty": 4
      },
      "koka1": {
        "tenderQty": 27,
        "designQty": 25
      },
      "koka2": {
        "tenderQty": 4,
        "designQty": 5
      },
      "sonkund": {
        "tenderQty": 14,
        "designQty": 12
      },
      "palora": {
        "tenderQty": 24,
        "designQty": 29
      },
      "kesalwada": {
        "tenderQty": 6,
        "designQty": 9
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 60,
    "itemNo": "",
    "subItem": "80",
    "pipeDiaMm": 80,
    "description": "80",
    "unit": "No",
    "rate": 13033.050000000001,
    "category": "AIR_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 42,
    "tenderAmount": 547388.1000000001,
    "designQty": 56,
    "designAmount": 729850.8,
    "diffAmount": 182462.69999999995,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 9,
        "designQty": 8
      },
      "sarpewada": {
        "tenderQty": 3,
        "designQty": 4
      },
      "koka1": {
        "tenderQty": 7,
        "designQty": 12
      },
      "koka2": {
        "tenderQty": 2,
        "designQty": 2
      },
      "sonkund": {
        "tenderQty": 3,
        "designQty": 8
      },
      "palora": {
        "tenderQty": 14,
        "designQty": 18
      },
      "kesalwada": {
        "tenderQty": 4,
        "designQty": 4
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 61,
    "itemNo": "",
    "subItem": "100",
    "pipeDiaMm": 100,
    "description": "100",
    "unit": "No",
    "rate": 14297.550000000001,
    "category": "AIR_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 27,
    "tenderAmount": 386033.85000000003,
    "designQty": 29,
    "designAmount": 414628.95,
    "diffAmount": 28595.099999999977,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 2
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 6,
        "designQty": 5
      },
      "koka2": {
        "tenderQty": 5,
        "designQty": 4
      },
      "sonkund": {
        "tenderQty": 2,
        "designQty": 2
      },
      "palora": {
        "tenderQty": 11,
        "designQty": 15
      },
      "kesalwada": {
        "tenderQty": 2,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 62,
    "itemNo": "",
    "subItem": "150",
    "pipeDiaMm": 150,
    "description": "150",
    "unit": "No",
    "rate": 19768.75,
    "category": "AIR_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 29,
    "tenderAmount": 573293.75,
    "designQty": 24,
    "designAmount": 474450,
    "diffAmount": -98843.75,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 5,
        "designQty": 5
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 10,
        "designQty": 7
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 5,
        "designQty": 4
      },
      "palora": {
        "tenderQty": 5,
        "designQty": 3
      },
      "kesalwada": {
        "tenderQty": 4,
        "designQty": 5
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 63,
    "itemNo": "",
    "subItem": "200",
    "pipeDiaMm": 200,
    "description": "200",
    "unit": "No",
    "rate": 30815.100000000002,
    "category": "AIR_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 16,
    "tenderAmount": 493041.60000000003,
    "designQty": 18,
    "designAmount": 554671.8,
    "diffAmount": 61630.20000000001,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 9,
        "designQty": 10
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 5,
        "designQty": 8
      },
      "kesalwada": {
        "tenderQty": 2,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 64,
    "itemNo": "",
    "subItem": "",
    "description": "Row 64",
    "unit": "",
    "rate": 0,
    "category": "AIR_VALVE_SHAFTS",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 65,
    "itemNo": "Item No. 10:- Air valves shaft",
    "subItem": "",
    "description": "Item No. 10:- Air valves shaft",
    "unit": "",
    "rate": 0,
    "category": "AIR_VALVE_SHAFTS",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 66,
    "itemNo": "",
    "subItem": "Upto 180 mm dia pipe line",
    "description": "Upto 180 mm dia pipe line",
    "unit": "No",
    "rate": 7524,
    "category": "AIR_VALVE_SHAFTS",
    "feedsGrandTotal": true,
    "tenderQty": 91,
    "tenderAmount": 684684,
    "designQty": 89,
    "designAmount": 669636,
    "diffAmount": -15048,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 11,
        "designQty": 5
      },
      "sarpewada": {
        "tenderQty": 5,
        "designQty": 4
      },
      "koka1": {
        "tenderQty": 27,
        "designQty": 25
      },
      "koka2": {
        "tenderQty": 4,
        "designQty": 5
      },
      "sonkund": {
        "tenderQty": 14,
        "designQty": 12
      },
      "palora": {
        "tenderQty": 24,
        "designQty": 29
      },
      "kesalwada": {
        "tenderQty": 6,
        "designQty": 9
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 67,
    "itemNo": "",
    "subItem": "200 m dia to 400 mm dia pipe line",
    "description": "200 m dia to 400 mm dia pipe line",
    "unit": "No",
    "rate": 9076.300000000001,
    "category": "AIR_VALVE_SHAFTS",
    "feedsGrandTotal": true,
    "tenderQty": 69,
    "tenderAmount": 626264.7000000001,
    "designQty": 85,
    "designAmount": 771485.5000000001,
    "diffAmount": 145220.80000000005,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 10,
        "designQty": 10
      },
      "sarpewada": {
        "tenderQty": 3,
        "designQty": 4
      },
      "koka1": {
        "tenderQty": 13,
        "designQty": 17
      },
      "koka2": {
        "tenderQty": 7,
        "designQty": 6
      },
      "sonkund": {
        "tenderQty": 5,
        "designQty": 10
      },
      "palora": {
        "tenderQty": 25,
        "designQty": 33
      },
      "kesalwada": {
        "tenderQty": 6,
        "designQty": 5
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 68,
    "itemNo": "",
    "subItem": "450 m dia to900 mm dia pipe line",
    "description": "450 m dia to900 mm dia pipe line",
    "unit": "No",
    "rate": 17283.4,
    "category": "AIR_VALVE_SHAFTS",
    "feedsGrandTotal": true,
    "tenderQty": 45,
    "tenderAmount": 777753.0000000001,
    "designQty": 42,
    "designAmount": 725902.8,
    "diffAmount": -51850.20000000007,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 5,
        "designQty": 5
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 19,
        "designQty": 17
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 5,
        "designQty": 4
      },
      "palora": {
        "tenderQty": 10,
        "designQty": 11
      },
      "kesalwada": {
        "tenderQty": 6,
        "designQty": 5
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 69,
    "itemNo": "",
    "subItem": "",
    "description": "Row 69",
    "unit": "",
    "rate": 0,
    "category": "CONCRETE_STEEL",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 70,
    "itemNo": "Item No. 11:-  M15",
    "subItem": "",
    "description": "Item No. 11:-  M15",
    "unit": "",
    "rate": 5507.6,
    "category": "CONCRETE_STEEL",
    "feedsGrandTotal": true,
    "tenderQty": 711.45,
    "tenderAmount": 3918382.0200000005,
    "designQty": 737.7400000000001,
    "designAmount": 4063176.824000001,
    "diffAmount": 144794.80400000047,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 79.09,
        "designQty": 68.36
      },
      "sarpewada": {
        "tenderQty": 42.34,
        "designQty": 44.580000000000005
      },
      "koka1": {
        "tenderQty": 182.99,
        "designQty": 182.32000000000002
      },
      "koka2": {
        "tenderQty": 39.35,
        "designQty": 38.910000000000004
      },
      "sonkund": {
        "tenderQty": 83.4,
        "designQty": 88.85000000000001
      },
      "palora": {
        "tenderQty": 220.25,
        "designQty": 250.47999999999996
      },
      "kesalwada": {
        "tenderQty": 64.03,
        "designQty": 64.24
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 71,
    "itemNo": "Item No. 12:-  M20",
    "subItem": "",
    "description": "Item No. 12:-  M20",
    "unit": "",
    "rate": 7210.7,
    "category": "CONCRETE_STEEL",
    "feedsGrandTotal": true,
    "tenderQty": 4233.758175625,
    "tenderAmount": 30528360.076979186,
    "designQty": 4384.769388625001,
    "designAmount": 31617256.630558293,
    "diffAmount": 1088896.553579107,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 477.5987775,
        "designQty": 419.024812375
      },
      "sarpewada": {
        "tenderQty": 210.24,
        "designQty": 224.94
      },
      "koka1": {
        "tenderQty": 1065.7034478750002,
        "designQty": 1061.3039016250002
      },
      "koka2": {
        "tenderQty": 257.415086,
        "designQty": 254.513032
      },
      "sonkund": {
        "tenderQty": 524.083993375,
        "designQty": 555.950122125
      },
      "palora": {
        "tenderQty": 1308.25,
        "designQty": 1479.17
      },
      "kesalwada": {
        "tenderQty": 390.46687087500004,
        "designQty": 389.8675205
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 72,
    "itemNo": "",
    "subItem": "",
    "description": "Row 72",
    "unit": "",
    "rate": 0,
    "category": "CONCRETE_STEEL",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 73,
    "itemNo": "Item No.13:-Providing and fixing in position TMT  -\r\nFE  -  500  bar  reinforcement  of  various",
    "subItem": "",
    "description": "Item No.13:-Providing and fixing in position TMT  - FE  -  500  bar  reinforcement  of  various",
    "unit": "MT",
    "rate": 76604.45,
    "category": "CONCRETE_STEEL",
    "feedsGrandTotal": true,
    "tenderQty": 232.99,
    "tenderAmount": 17848070.8055,
    "designQty": 240.743,
    "designAmount": 18441985.106349997,
    "diffAmount": 593914.3008499965,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 26.88,
        "designQty": 23.973
      },
      "sarpewada": {
        "tenderQty": 14.08,
        "designQty": 14.81
      },
      "koka1": {
        "tenderQty": 56.6,
        "designQty": 56.38
      },
      "koka2": {
        "tenderQty": 15.47,
        "designQty": 15.32
      },
      "sonkund": {
        "tenderQty": 29.35,
        "designQty": 30.94
      },
      "palora": {
        "tenderQty": 68.49,
        "designQty": 77.03
      },
      "kesalwada": {
        "tenderQty": 22.12,
        "designQty": 22.29
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 74,
    "itemNo": "Item No. 14:- Providing, supplying & erecting of CI\r\ndouble flange sluice valve confirming for IS-14846",
    "subItem": "",
    "description": "Item No. 14:- Providing, supplying & erecting of CI double flange sluice valve confirming for IS-14846",
    "unit": "",
    "rate": 0,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 75,
    "itemNo": "c",
    "subItem": "100",
    "pipeDiaMm": 100,
    "description": "c 100",
    "unit": "No.",
    "rate": 11767.5,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 200,
    "tenderAmount": 2353500,
    "designQty": 200,
    "designAmount": 2353500,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 18,
        "designQty": 18
      },
      "sarpewada": {
        "tenderQty": 7,
        "designQty": 7
      },
      "koka1": {
        "tenderQty": 47,
        "designQty": 47
      },
      "koka2": {
        "tenderQty": 7,
        "designQty": 7
      },
      "sonkund": {
        "tenderQty": 19,
        "designQty": 19
      },
      "palora": {
        "tenderQty": 95,
        "designQty": 95
      },
      "kesalwada": {
        "tenderQty": 7,
        "designQty": 7
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 76,
    "itemNo": "d",
    "subItem": "150",
    "pipeDiaMm": 150,
    "description": "d 150",
    "unit": "No.",
    "rate": 16556.95,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 38,
    "tenderAmount": 629164.1,
    "designQty": 38,
    "designAmount": 629164.1,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 5,
        "designQty": 5
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 3,
        "designQty": 3
      },
      "koka2": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sonkund": {
        "tenderQty": 5,
        "designQty": 5
      },
      "palora": {
        "tenderQty": 13,
        "designQty": 13
      },
      "kesalwada": {
        "tenderQty": 10,
        "designQty": 10
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 77,
    "itemNo": "e",
    "subItem": "200",
    "pipeDiaMm": 200,
    "description": "e 200",
    "unit": "No.",
    "rate": 25959,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 22,
    "tenderAmount": 571098,
    "designQty": 22,
    "designAmount": 571098,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 3,
        "designQty": 3
      },
      "sarpewada": {
        "tenderQty": 2,
        "designQty": 2
      },
      "koka1": {
        "tenderQty": 3,
        "designQty": 3
      },
      "koka2": {
        "tenderQty": 2,
        "designQty": 2
      },
      "sonkund": {
        "tenderQty": 2,
        "designQty": 2
      },
      "palora": {
        "tenderQty": 6,
        "designQty": 6
      },
      "kesalwada": {
        "tenderQty": 4,
        "designQty": 4
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 78,
    "itemNo": "f",
    "subItem": "250",
    "pipeDiaMm": 250,
    "description": "f 250",
    "unit": "No.",
    "rate": 44962.1,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 12,
    "tenderAmount": 539545.2,
    "designQty": 12,
    "designAmount": 539545.2,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 3,
        "designQty": 3
      },
      "koka2": {
        "tenderQty": 4,
        "designQty": 4
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 2,
        "designQty": 2
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 79,
    "itemNo": "g",
    "subItem": "300",
    "pipeDiaMm": 300,
    "description": "g 300",
    "unit": "No.",
    "rate": 59153.75,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 8,
    "tenderAmount": 473230,
    "designQty": 8,
    "designAmount": 473230,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 3,
        "designQty": 3
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 3,
        "designQty": 3
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 80,
    "itemNo": "h",
    "subItem": "350",
    "pipeDiaMm": 350,
    "description": "h 350",
    "unit": "No.",
    "rate": 75117.75,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 13,
    "tenderAmount": 976530.75,
    "designQty": 13,
    "designAmount": 976530.75,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 4,
        "designQty": 4
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 4,
        "designQty": 4
      },
      "palora": {
        "tenderQty": 3,
        "designQty": 3
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 81,
    "itemNo": "i",
    "subItem": "400",
    "pipeDiaMm": 400,
    "description": "i 400",
    "unit": "No.",
    "rate": 97113.7,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 7,
    "tenderAmount": 679795.9,
    "designQty": 7,
    "designAmount": 679795.9,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 3,
        "designQty": 3
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 2,
        "designQty": 2
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 82,
    "itemNo": "j",
    "subItem": "450",
    "pipeDiaMm": 450,
    "description": "j 450",
    "unit": "No.",
    "rate": 126066.2,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 10,
    "tenderAmount": 1260662,
    "designQty": 10,
    "designAmount": 1260662,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 5,
        "designQty": 5
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 3,
        "designQty": 3
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 83,
    "itemNo": "k",
    "subItem": "500",
    "pipeDiaMm": 500,
    "description": "k 500",
    "unit": "No.",
    "rate": 144514.9,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 8,
    "tenderAmount": 1156119.2,
    "designQty": 8,
    "designAmount": 1156119.2,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 5,
        "designQty": 5
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1,
        "designQty": 1
      },
      "kesalwada": {
        "tenderQty": 2,
        "designQty": 2
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 84,
    "itemNo": "l",
    "subItem": "600",
    "pipeDiaMm": 600,
    "description": "l 600",
    "unit": "No.",
    "rate": 243850.4,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 5,
    "tenderAmount": 1219252,
    "designQty": 5,
    "designAmount": 1219252,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 2,
        "designQty": 2
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 3,
        "designQty": 3
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 85,
    "itemNo": "m",
    "subItem": "700",
    "pipeDiaMm": 700,
    "description": "m 700",
    "unit": "No.",
    "rate": 388320.75,
    "category": "SLUICE_VALVES",
    "feedsGrandTotal": true,
    "tenderQty": 4,
    "tenderAmount": 1553283,
    "designQty": 4,
    "designAmount": 1553283,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 4,
        "designQty": 4
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 86,
    "itemNo": "",
    "subItem": "",
    "description": "Row 86",
    "unit": "",
    "rate": 0,
    "category": "MS_PLATES",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 87,
    "itemNo": "Item o. 15:-  Providing and fixing M.S. chequerred\r\nplate flooring of following thickness supported on",
    "subItem": "",
    "description": "Item o. 15:-  Providing and fixing M.S. chequerred plate flooring of following thickness supported on",
    "unit": "Sqm",
    "rate": 5104.45,
    "category": "MS_PLATES",
    "feedsGrandTotal": true,
    "tenderQty": 39.2,
    "tenderAmount": 200094.44,
    "designQty": 39.2,
    "designAmount": 200094.44,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "sarpewada": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "koka1": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "koka2": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "sonkund": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "palora": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "kesalwada": {
        "tenderQty": 5.6,
        "designQty": 5.6
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 90,
    "itemNo": "Item No. 16:- Preparation of upto date digital\r\ncommand maps showing Juridiction of W.U.A. with",
    "subItem": "",
    "description": "Item No. 16:- Preparation of upto date digital command maps showing Juridiction of W.U.A. with",
    "unit": "Ha",
    "rate": 110.9,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 1470.75,
    "tenderAmount": 163106.17500000002,
    "designQty": 1835.7900000000002,
    "designAmount": 203589.11100000003,
    "diffAmount": 40482.936000000016,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 124.95,
        "designQty": 149.06
      },
      "sarpewada": {
        "tenderQty": 47.61,
        "designQty": 58.72
      },
      "koka1": {
        "tenderQty": 454.04,
        "designQty": 529.95
      },
      "koka2": {
        "tenderQty": 52.19,
        "designQty": 77.92
      },
      "sonkund": {
        "tenderQty": 164.88,
        "designQty": 222.49
      },
      "palora": {
        "tenderQty": 493.5,
        "designQty": 636.46
      },
      "kesalwada": {
        "tenderQty": 133.58,
        "designQty": 161.19
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 91,
    "itemNo": "Item No. 17:- Preparation and Publication of\r\nBenificiers list of WUA etc. Complete",
    "subItem": "",
    "description": "Item No. 17:- Preparation and Publication of Benificiers list of WUA etc. Complete",
    "unit": "Ha",
    "rate": 109.55,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 1470.75,
    "tenderAmount": 161120.6625,
    "designQty": 1835.7900000000002,
    "designAmount": 201110.79450000002,
    "diffAmount": 39990.13200000001,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 124.95,
        "designQty": 149.06
      },
      "sarpewada": {
        "tenderQty": 47.61,
        "designQty": 58.72
      },
      "koka1": {
        "tenderQty": 454.04,
        "designQty": 529.95
      },
      "koka2": {
        "tenderQty": 52.19,
        "designQty": 77.92
      },
      "sonkund": {
        "tenderQty": 164.88,
        "designQty": 222.49
      },
      "palora": {
        "tenderQty": 493.5,
        "designQty": 636.46
      },
      "kesalwada": {
        "tenderQty": 133.58,
        "designQty": 161.19
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 92,
    "itemNo": "Item No. 18:- Providing and making arrangemens\r\nfor Holding of  WUA Election as per instructions of",
    "subItem": "",
    "description": "Item No. 18:- Providing and making arrangemens for Holding of  WUA Election as per instructions of",
    "unit": "Ha",
    "rate": 39.15,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 1470.75,
    "tenderAmount": 57579.862499999996,
    "designQty": 1835.7900000000002,
    "designAmount": 71871.17850000001,
    "diffAmount": 14291.316000000013,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 124.95,
        "designQty": 149.06
      },
      "sarpewada": {
        "tenderQty": 47.61,
        "designQty": 58.72
      },
      "koka1": {
        "tenderQty": 454.04,
        "designQty": 529.95
      },
      "koka2": {
        "tenderQty": 52.19,
        "designQty": 77.92
      },
      "sonkund": {
        "tenderQty": 164.88,
        "designQty": 222.49
      },
      "palora": {
        "tenderQty": 493.5,
        "designQty": 636.46
      },
      "kesalwada": {
        "tenderQty": 133.58,
        "designQty": 161.19
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 93,
    "itemNo": "Item No. 19:- Capacity Building of WUA -Arranging\r\nand conducting Meetings and Trainings to",
    "subItem": "",
    "description": "Item No. 19:- Capacity Building of WUA -Arranging and conducting Meetings and Trainings to",
    "unit": "",
    "rate": 0,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 94,
    "itemNo": "A) Meeting to be conducted before formation of\r\nWUAs ,",
    "subItem": "",
    "description": "A) Meeting to be conducted before formation of WUAs ,",
    "unit": "meeting",
    "rate": 13342.9,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 7,
    "tenderAmount": 93400.3,
    "designQty": 7,
    "designAmount": 93400.3,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka2": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 1,
        "designQty": 1
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 95,
    "itemNo": "B) Training  to be conducted before formation of\r\nWUAs ,",
    "subItem": "",
    "description": "B) Training  to be conducted before formation of WUAs ,",
    "unit": "training",
    "rate": 25706.5,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 7,
    "tenderAmount": 179945.5,
    "designQty": 7,
    "designAmount": 179945.5,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka2": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 1,
        "designQty": 1
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 96,
    "itemNo": "C) Training to be conducted after formation of",
    "subItem": "",
    "description": "C) Training to be conducted after formation of",
    "unit": "training",
    "rate": 25706.5,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 7,
    "tenderAmount": 179945.5,
    "designQty": 7,
    "designAmount": 179945.5,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka2": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 1,
        "designQty": 1
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 97,
    "itemNo": "Item No. 20 :-Labour  charges for collections of",
    "subItem": "",
    "description": "Item No. 20 :-Labour  charges for collections of",
    "unit": "ha",
    "rate": 169,
    "category": "CADWM_WUA",
    "feedsGrandTotal": true,
    "tenderQty": 2941.5,
    "tenderAmount": 497113.5,
    "designQty": 3671.5800000000004,
    "designAmount": 620497.02,
    "diffAmount": 123383.52000000002,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 249.9,
        "designQty": 298.12
      },
      "sarpewada": {
        "tenderQty": 95.22,
        "designQty": 117.44
      },
      "koka1": {
        "tenderQty": 908.08,
        "designQty": 1059.9
      },
      "koka2": {
        "tenderQty": 104.38,
        "designQty": 155.84
      },
      "sonkund": {
        "tenderQty": 329.76,
        "designQty": 444.98
      },
      "palora": {
        "tenderQty": 987,
        "designQty": 1272.92
      },
      "kesalwada": {
        "tenderQty": 267.16,
        "designQty": 322.38
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 98,
    "itemNo": "Item No. 21:- Full Bore Electromagnetic Flow Meter",
    "subItem": "",
    "description": "Item No. 21:- Full Bore Electromagnetic Flow Meter",
    "unit": "",
    "rate": 0,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 99,
    "itemNo": "a",
    "subItem": "300",
    "pipeDiaMm": 300,
    "description": "a 300",
    "unit": "No",
    "rate": 216024,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 1,
    "designAmount": 216024,
    "diffAmount": 216024,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 100,
    "itemNo": "b",
    "subItem": "350",
    "pipeDiaMm": 350,
    "description": "b 350",
    "unit": "No",
    "rate": 298787,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 1,
    "tenderAmount": 298787,
    "designQty": 1,
    "designAmount": 298787,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 101,
    "itemNo": "c",
    "subItem": "600",
    "pipeDiaMm": 600,
    "description": "c 600",
    "unit": "No",
    "rate": 487378,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 2,
    "tenderAmount": 974756,
    "designQty": 2,
    "designAmount": 974756,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 102,
    "itemNo": "d",
    "subItem": "700",
    "pipeDiaMm": 700,
    "description": "d 700",
    "unit": "No",
    "rate": 523463,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 1,
    "tenderAmount": 523463,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": -523463,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 103,
    "itemNo": "e",
    "subItem": "900",
    "pipeDiaMm": 900,
    "description": "e 900",
    "unit": "No",
    "rate": 715824,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 2,
    "tenderAmount": 1431648,
    "designQty": 2,
    "designAmount": 1431648,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1,
        "designQty": 1
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 104,
    "itemNo": "",
    "subItem": "1200",
    "pipeDiaMm": 1200,
    "description": "1200",
    "unit": "No",
    "rate": 523463.49,
    "category": "FLOW_METERS",
    "feedsGrandTotal": true,
    "tenderQty": 1,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 105,
    "itemNo": "Item No. 22:- Manufacturing, providing and\r\nsupplying tapers, \"Y\" connection with crotch plate,",
    "subItem": "",
    "description": "Item No. 22:- Manufacturing, providing and supplying tapers, \"Y\" connection with crotch plate,",
    "unit": "kg",
    "rate": 107.75,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 7433.450000000001,
    "tenderAmount": 800954.2375,
    "designQty": 7433.450000000001,
    "designAmount": 800954.2375,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 2616.85,
        "designQty": 2616.85
      },
      "koka1": {
        "tenderQty": 1130.59,
        "designQty": 1130.5900000000001
      },
      "koka2": {
        "tenderQty": 2579.8,
        "designQty": 2579.8
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1106.21,
        "designQty": 1106.21
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 106,
    "itemNo": "Item No. 23:- Hydraulic testing of H. D. P. E. pipe\r\nline to specified pressure including cost of all",
    "subItem": "",
    "description": "Item No. 23:- Hydraulic testing of H. D. P. E. pipe line to specified pressure including cost of all",
    "unit": "",
    "rate": 0,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 107,
    "itemNo": "a",
    "subItem": "110",
    "pipeDiaMm": 110,
    "description": "a 110",
    "unit": "Km",
    "rate": 7818.95,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.09,
    "tenderAmount": 8522.6555,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": -8522.6555,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.88,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.21,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 108,
    "itemNo": "b",
    "subItem": "125",
    "pipeDiaMm": 125,
    "description": "b 125",
    "unit": "Km",
    "rate": 8021.3,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 4.640000000000001,
    "tenderAmount": 37218.832,
    "designQty": 0.116,
    "designAmount": 930.4708,
    "diffAmount": -36288.3612,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1.54,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 2.24,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0.86,
        "designQty": 0.116
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 109,
    "itemNo": "c",
    "subItem": "140",
    "pipeDiaMm": 140,
    "description": "c 140",
    "unit": "Km",
    "rate": 8643.4,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 16.45,
    "tenderAmount": 142183.93,
    "designQty": 21.189299999999996,
    "designAmount": 183147.59561999995,
    "diffAmount": 40963.665619999956,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.33,
        "designQty": 1.2913
      },
      "sarpewada": {
        "tenderQty": 0.48,
        "designQty": 1.24
      },
      "koka1": {
        "tenderQty": 4.73,
        "designQty": 6.103
      },
      "koka2": {
        "tenderQty": 0.45,
        "designQty": 0.829
      },
      "sonkund": {
        "tenderQty": 3.21,
        "designQty": 2.689
      },
      "palora": {
        "tenderQty": 6.66,
        "designQty": 7.21
      },
      "kesalwada": {
        "tenderQty": 0.59,
        "designQty": 1.827
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 110,
    "itemNo": "d",
    "subItem": "160",
    "pipeDiaMm": 160,
    "description": "d 160",
    "unit": "Km",
    "rate": 8976.3,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 5.18,
    "tenderAmount": 46497.234,
    "designQty": 5.06369,
    "designAmount": 45453.200547,
    "diffAmount": -1044.0334529999964,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.66,
        "designQty": 0.17269
      },
      "sarpewada": {
        "tenderQty": 0.89,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.78,
        "designQty": 1.257
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0.642
      },
      "sonkund": {
        "tenderQty": 0.94,
        "designQty": 0.766
      },
      "palora": {
        "tenderQty": 0.59,
        "designQty": 1.36
      },
      "kesalwada": {
        "tenderQty": 1.32,
        "designQty": 0.866
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 111,
    "itemNo": "e",
    "subItem": "180",
    "pipeDiaMm": 180,
    "description": "e 180",
    "unit": "Km",
    "rate": 9348.1,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 3.8099999999999996,
    "tenderAmount": 35616.261,
    "designQty": 5.33902,
    "designAmount": 49909.692861999996,
    "diffAmount": 14293.431861999998,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1.04,
        "designQty": 1.06702
      },
      "sarpewada": {
        "tenderQty": 0.47,
        "designQty": 0.36
      },
      "koka1": {
        "tenderQty": 0.99,
        "designQty": 1.475
      },
      "koka2": {
        "tenderQty": 0.32,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0.35,
        "designQty": 0.227
      },
      "palora": {
        "tenderQty": 0.53,
        "designQty": 2.01
      },
      "kesalwada": {
        "tenderQty": 0.11,
        "designQty": 0.2
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 112,
    "itemNo": "f",
    "subItem": "200",
    "pipeDiaMm": 200,
    "description": "f 200",
    "unit": "Km",
    "rate": 9758.65,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.8900000000000001,
    "tenderAmount": 18443.8485,
    "designQty": 3.36985,
    "designAmount": 32885.186702499996,
    "diffAmount": 14441.338202499996,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.84,
        "designQty": 0.17085
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0.372
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0.094
      },
      "sonkund": {
        "tenderQty": 0.29,
        "designQty": 1.252
      },
      "palora": {
        "tenderQty": 0.59,
        "designQty": 1.02
      },
      "kesalwada": {
        "tenderQty": 0.17,
        "designQty": 0.461
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 113,
    "itemNo": "g",
    "subItem": "225",
    "pipeDiaMm": 225,
    "description": "g 225",
    "unit": "Km",
    "rate": 10326.55,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 2.83,
    "tenderAmount": 29224.136499999997,
    "designQty": 3.12735,
    "designAmount": 32294.736142499994,
    "diffAmount": 3070.5996424999976,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.26,
        "designQty": 0.11435
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0.09
      },
      "koka1": {
        "tenderQty": 0.48,
        "designQty": 1.147
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0.506
      },
      "palora": {
        "tenderQty": 1.27,
        "designQty": 1.27
      },
      "kesalwada": {
        "tenderQty": 0.82,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 114,
    "itemNo": "h",
    "subItem": "250",
    "pipeDiaMm": 250,
    "description": "h 250",
    "unit": "Km",
    "rate": 10955.1,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.53,
    "tenderAmount": 16761.303,
    "designQty": 2.9026699999999996,
    "designAmount": 31799.040116999997,
    "diffAmount": 15037.737116999997,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.18,
        "designQty": 0.9856699999999999
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0.47
      },
      "koka1": {
        "tenderQty": 0.13,
        "designQty": 0.212
      },
      "koka2": {
        "tenderQty": 0.22,
        "designQty": 0.211
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0.315
      },
      "palora": {
        "tenderQty": 0.86,
        "designQty": 0.41
      },
      "kesalwada": {
        "tenderQty": 0.14,
        "designQty": 0.299
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 115,
    "itemNo": "i",
    "subItem": "280",
    "pipeDiaMm": 280,
    "description": "i 280",
    "unit": "Km",
    "rate": 11789.45,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 2.4,
    "tenderAmount": 28294.68,
    "designQty": 2.25909,
    "designAmount": 26633.428600500003,
    "diffAmount": -1661.2513994999972,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.23,
        "designQty": 0.15609
      },
      "sarpewada": {
        "tenderQty": 0.31,
        "designQty": 0.31
      },
      "koka1": {
        "tenderQty": 0.44,
        "designQty": 0.388
      },
      "koka2": {
        "tenderQty": 0.14,
        "designQty": 0.232
      },
      "sonkund": {
        "tenderQty": 0.24,
        "designQty": 0.226
      },
      "palora": {
        "tenderQty": 1.04,
        "designQty": 0.71
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0.237
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 116,
    "itemNo": "j",
    "subItem": "315",
    "pipeDiaMm": 315,
    "description": "j 315",
    "unit": "Km",
    "rate": 13646.9,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 2.51,
    "tenderAmount": 34253.719,
    "designQty": 1.8699999999999999,
    "designAmount": 25519.702999999998,
    "diffAmount": -8734.016,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.35,
        "designQty": 0.302
      },
      "koka2": {
        "tenderQty": 0.61,
        "designQty": 0.168
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1.43,
        "designQty": 1.4
      },
      "kesalwada": {
        "tenderQty": 0.12,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 117,
    "itemNo": "k",
    "subItem": "355",
    "pipeDiaMm": 355,
    "description": "k 355",
    "unit": "Km",
    "rate": 16566.25,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 2.2,
    "tenderAmount": 36445.75,
    "designQty": 4.990000000000001,
    "designAmount": 82665.58750000002,
    "diffAmount": 46219.83750000002,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.38,
        "designQty": 0.23
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.56,
        "designQty": 0.9
      },
      "koka2": {
        "tenderQty": 0.88,
        "designQty": 1.12
      },
      "sonkund": {
        "tenderQty": 0.14,
        "designQty": 0.33
      },
      "palora": {
        "tenderQty": 0.24,
        "designQty": 2.41
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 118,
    "itemNo": "l",
    "subItem": "400",
    "pipeDiaMm": 400,
    "description": "l 400",
    "unit": "Km",
    "rate": 20106.25,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 2.0700000000000003,
    "tenderAmount": 41619.93750000001,
    "designQty": 0.66,
    "designAmount": 13270.125,
    "diffAmount": -28349.812500000007,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.91,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0.13,
        "designQty": 0.27
      },
      "palora": {
        "tenderQty": 0.55,
        "designQty": 0.39
      },
      "kesalwada": {
        "tenderQty": 0.48,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 119,
    "itemNo": "m",
    "subItem": "450",
    "pipeDiaMm": 450,
    "description": "m 450",
    "unit": "Km",
    "rate": 23986.05,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.34,
    "tenderAmount": 32141.307,
    "designQty": 1.46,
    "designAmount": 35019.633,
    "diffAmount": 2878.326000000001,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0.5
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0.44
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0.33,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 1.01,
        "designQty": 0.21
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0.31
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 120,
    "itemNo": "n",
    "subItem": "500",
    "pipeDiaMm": 500,
    "description": "n 500",
    "unit": "Km",
    "rate": 28108.55,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 3.68,
    "tenderAmount": 103439.464,
    "designQty": 2.17,
    "designAmount": 60995.553499999995,
    "diffAmount": -42443.91050000001,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.94,
        "designQty": 0.16
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.92,
        "designQty": 0.75
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0.25
      },
      "palora": {
        "tenderQty": 1.53,
        "designQty": 0.38
      },
      "kesalwada": {
        "tenderQty": 0.29,
        "designQty": 0.63
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 121,
    "itemNo": "o",
    "subItem": "560",
    "pipeDiaMm": 560,
    "description": "o 560",
    "unit": "Km",
    "rate": 31320.85,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.93,
    "tenderAmount": 60449.24049999999,
    "designQty": 3.01,
    "designAmount": 94275.75849999998,
    "diffAmount": 33826.51799999999,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 1.37
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.96,
        "designQty": 0.79
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0.43
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0.25
      },
      "kesalwada": {
        "tenderQty": 0.97,
        "designQty": 0.17
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 122,
    "itemNo": "p",
    "subItem": "630",
    "pipeDiaMm": 630,
    "description": "p 630",
    "unit": "Km",
    "rate": 35108.4,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 3.14,
    "tenderAmount": 110240.376,
    "designQty": 1.7900000000000003,
    "designAmount": 62844.036000000015,
    "diffAmount": -47396.33999999999,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0.44,
        "designQty": 0.11
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1.17,
        "designQty": 0.52
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 1.53,
        "designQty": 0.64
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0.52
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 123,
    "itemNo": "q",
    "subItem": "710",
    "pipeDiaMm": 710,
    "description": "q 710",
    "unit": "Km",
    "rate": 40353.8,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 2.16,
    "tenderAmount": 87164.20800000001,
    "designQty": 1.83,
    "designAmount": 73847.45400000001,
    "diffAmount": -13316.754,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 1.54,
        "designQty": 1.33
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0.32
      },
      "kesalwada": {
        "tenderQty": 0.62,
        "designQty": 0.18
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 124,
    "itemNo": "r",
    "subItem": "800",
    "pipeDiaMm": 800,
    "description": "r 800",
    "unit": "Km",
    "rate": 46997.45,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.06,
    "tenderAmount": 49817.297,
    "designQty": 1.59,
    "designAmount": 74725.9455,
    "diffAmount": 24908.648500000003,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.52,
        "designQty": 1.05
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0.54,
        "designQty": 0.54
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 125,
    "itemNo": "Item No. 24:- Hydraulic testing of Pre-Stressed\r\nCement Concrete Pipes with rubber ring joints to",
    "subItem": "",
    "description": "Item No. 24:- Hydraulic testing of Pre-Stressed Cement Concrete Pipes with rubber ring joints to",
    "unit": "",
    "rate": 0,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 126,
    "itemNo": "a",
    "subItem": "900",
    "pipeDiaMm": 900,
    "description": "a 900",
    "unit": "Km",
    "rate": 55275.6,
    "category": "SPECIALS_TESTING",
    "feedsGrandTotal": true,
    "tenderQty": 1.56,
    "tenderAmount": 86229.936,
    "designQty": 1.0899999999999999,
    "designAmount": 60250.40399999999,
    "diffAmount": -25979.532000000014,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0.72,
        "designQty": 0.52
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0.84,
        "designQty": 0.57
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 127,
    "itemNo": "Item No. 25:-Providing, Laying, Jointing, Painting &\r\nIdentification Numbering to R.C.C. pipe of 1200",
    "subItem": "",
    "description": "Item No. 25:-Providing, Laying, Jointing, Painting & Identification Numbering to R.C.C. pipe of 1200",
    "unit": "",
    "rate": 0,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 0,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 128,
    "itemNo": "T Joint chambers",
    "subItem": "",
    "description": "T Joint chambers",
    "unit": "Rmt",
    "rate": 10349.45,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 355,
    "tenderAmount": 3674054.7500000005,
    "designQty": 355,
    "designAmount": 3674054.7500000005,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 42.5,
        "designQty": 42.5
      },
      "sarpewada": {
        "tenderQty": 12.5,
        "designQty": 12.5
      },
      "koka1": {
        "tenderQty": 112.5,
        "designQty": 112.5
      },
      "koka2": {
        "tenderQty": 15,
        "designQty": 15
      },
      "sonkund": {
        "tenderQty": 20,
        "designQty": 20
      },
      "palora": {
        "tenderQty": 117.5,
        "designQty": 117.5
      },
      "kesalwada": {
        "tenderQty": 35,
        "designQty": 35
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 129,
    "itemNo": "Item No. 26:-Providing B.B. masonry with",
    "subItem": "",
    "description": "Item No. 26:-Providing B.B. masonry with",
    "unit": "Cum",
    "rate": 6133.55,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 66.63999999999999,
    "tenderAmount": 408739.77199999994,
    "designQty": 66.64999999999999,
    "designAmount": 408801.1075,
    "diffAmount": 61.3355000000447,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 9.52,
        "designQty": 9.522
      },
      "sarpewada": {
        "tenderQty": 9.52,
        "designQty": 9.52
      },
      "koka1": {
        "tenderQty": 9.52,
        "designQty": 9.522
      },
      "koka2": {
        "tenderQty": 9.52,
        "designQty": 9.522
      },
      "sonkund": {
        "tenderQty": 9.52,
        "designQty": 9.522
      },
      "palora": {
        "tenderQty": 9.52,
        "designQty": 9.52
      },
      "kesalwada": {
        "tenderQty": 9.52,
        "designQty": 9.522
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 130,
    "itemNo": "Item No. 27:-Providing internal cement plaster",
    "subItem": "",
    "description": "Item No. 27:-Providing internal cement plaster",
    "unit": "Sqm",
    "rate": 273.55,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 283.5,
    "tenderAmount": 77551.425,
    "designQty": 283.5,
    "designAmount": 77551.425,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "sarpewada": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "koka1": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "koka2": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "sonkund": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "palora": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "kesalwada": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 131,
    "itemNo": "Item No. 28:-Providing sand faced plaster",
    "subItem": "",
    "description": "Item No. 28:-Providing sand faced plaster",
    "unit": "Sqm",
    "rate": 642.75,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 308.70000000000005,
    "tenderAmount": 198416.92500000002,
    "designQty": 308.69999999999993,
    "designAmount": 198416.92499999996,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "sarpewada": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "koka1": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "koka2": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "sonkund": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "palora": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "kesalwada": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 132,
    "itemNo": "Item No. 29:-Providing and applying two coats of",
    "subItem": "",
    "description": "Item No. 29:-Providing and applying two coats of",
    "unit": "Sqm",
    "rate": 79,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 308.70000000000005,
    "tenderAmount": 24387.300000000003,
    "designQty": 308.69999999999993,
    "designAmount": 24387.299999999996,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "sarpewada": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "koka1": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "koka2": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "sonkund": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "palora": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "kesalwada": {
        "tenderQty": 44.1,
        "designQty": 44.099999999999994
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 133,
    "itemNo": "Item No. 30:-Providing and applying colour-wash of",
    "subItem": "",
    "description": "Item No. 30:-Providing and applying colour-wash of",
    "unit": "Sqm",
    "rate": 10,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 283.5,
    "tenderAmount": 2835,
    "designQty": 283.5,
    "designAmount": 2835,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "sarpewada": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "koka1": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "koka2": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "sonkund": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "palora": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "kesalwada": {
        "tenderQty": 40.5,
        "designQty": 40.5
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 134,
    "itemNo": "Item No. 31:-Providing and fixing rolling shutter",
    "subItem": "",
    "description": "Item No. 31:-Providing and fixing rolling shutter",
    "unit": "Sqm",
    "rate": 4828.9,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 22.049999999999997,
    "tenderAmount": 106477.24499999998,
    "designQty": 22.050000000000004,
    "designAmount": 106477.24500000001,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "sarpewada": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "koka1": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "koka2": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "sonkund": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "palora": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "kesalwada": {
        "tenderQty": 3.15,
        "designQty": 3.1500000000000004
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 135,
    "itemNo": "Item No. 32:-Providing and fixing steel window",
    "subItem": "",
    "description": "Item No. 32:-Providing and fixing steel window",
    "unit": "Sqm",
    "rate": 4345,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 16.8,
    "tenderAmount": 72996,
    "designQty": 16.8,
    "designAmount": 72996,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "sarpewada": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "koka1": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "koka2": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "sonkund": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "palora": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "kesalwada": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 136,
    "itemNo": "Item No. 33:-Providing and fixing mild steel grill\r\nwork for windows, ventilators, etc. 15",
    "subItem": "",
    "description": "Item No. 33:-Providing and fixing mild steel grill work for windows, ventilators, etc. 15",
    "unit": "Sqm",
    "rate": 1707.1,
    "category": "STRUCTURES",
    "feedsGrandTotal": true,
    "tenderQty": 16.8,
    "tenderAmount": 28679.28,
    "designQty": 16.8,
    "designAmount": 28679.28,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "sarpewada": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "koka1": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "koka2": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "sonkund": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "palora": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "kesalwada": {
        "tenderQty": 2.4,
        "designQty": 2.4
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 137,
    "itemNo": "Item No. 34:- Supplying, installing, testing and\r\ncommissioning of 1 kWp off grid  solar power pack",
    "subItem": "",
    "description": "Item No. 34:- Supplying, installing, testing and commissioning of 1 kWp off grid  solar power pack",
    "unit": "Each",
    "rate": 75762,
    "category": "SOLAR_PLANNING",
    "feedsGrandTotal": true,
    "tenderQty": 7,
    "tenderAmount": 530334,
    "designQty": 7,
    "designAmount": 530334,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sarpewada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka1": {
        "tenderQty": 1,
        "designQty": 1
      },
      "koka2": {
        "tenderQty": 1,
        "designQty": 1
      },
      "sonkund": {
        "tenderQty": 1,
        "designQty": 1
      },
      "palora": {
        "tenderQty": 1,
        "designQty": 1
      },
      "kesalwada": {
        "tenderQty": 1,
        "designQty": 1
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 138,
    "itemNo": "Item No. 35:-Preparation of detailed construction\r\nplan for pipe distribution network system including",
    "subItem": "",
    "description": "Item No. 35:-Preparation of detailed construction plan for pipe distribution network system including",
    "unit": "Ha. CCA",
    "rate": 676,
    "category": "SOLAR_PLANNING",
    "feedsGrandTotal": true,
    "tenderQty": 1470.75,
    "tenderAmount": 994227,
    "designQty": 1835.79,
    "designAmount": 1240994.04,
    "diffAmount": 246767.04000000004,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 124.95,
        "designQty": 149.06
      },
      "sarpewada": {
        "tenderQty": 47.61,
        "designQty": 58.72
      },
      "koka1": {
        "tenderQty": 454.04,
        "designQty": 529.95
      },
      "koka2": {
        "tenderQty": 52.19,
        "designQty": 77.92
      },
      "sonkund": {
        "tenderQty": 164.88,
        "designQty": 222.49
      },
      "palora": {
        "tenderQty": 493.5,
        "designQty": 636.46
      },
      "kesalwada": {
        "tenderQty": 133.58,
        "designQty": 161.19
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 139,
    "itemNo": "Item No. 36:-Providing assistance in collecting data\r\nfor preparation of voter list from relevanat",
    "subItem": "",
    "description": "Item No. 36:-Providing assistance in collecting data for preparation of voter list from relevanat",
    "unit": "Ha. CCA",
    "rate": 41.6,
    "category": "SOLAR_PLANNING",
    "feedsGrandTotal": true,
    "tenderQty": 1470.75,
    "tenderAmount": 61183.200000000004,
    "designQty": 1835.79,
    "designAmount": 76368.864,
    "diffAmount": 15185.663999999997,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 124.95,
        "designQty": 149.06
      },
      "sarpewada": {
        "tenderQty": 47.61,
        "designQty": 58.72
      },
      "koka1": {
        "tenderQty": 454.04,
        "designQty": 529.95
      },
      "koka2": {
        "tenderQty": 52.19,
        "designQty": 77.92
      },
      "sonkund": {
        "tenderQty": 164.88,
        "designQty": 222.49
      },
      "palora": {
        "tenderQty": 493.5,
        "designQty": 636.46
      },
      "kesalwada": {
        "tenderQty": 133.58,
        "designQty": 161.19
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 140,
    "itemNo": "Item No. 37:-Five year operation maintenance, and\r\nrepair  and  of pipe distribution network ,consists of",
    "subItem": "",
    "description": "Item No. 37:-Five year operation maintenance, and repair  and  of pipe distribution network ,consists of",
    "unit": "",
    "rate": 0,
    "category": "OM",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 1133506.2479310883,
    "designQty": 0,
    "designAmount": 1213874.2462272712,
    "diffAmount": 80367.99829618284,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 141,
    "itemNo": "1 year",
    "subItem": "",
    "description": "1 year",
    "unit": "",
    "rate": 1134362,
    "category": "OM",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 1133506.2479310883,
    "designQty": 0,
    "designAmount": 1213874.2462272712,
    "diffAmount": 80367.99829618284,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 142,
    "itemNo": "2 year",
    "subItem": "",
    "description": "2 year",
    "unit": "",
    "rate": 1134362,
    "category": "OM",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 1133506.2479310883,
    "designQty": 0,
    "designAmount": 1213874.2462272712,
    "diffAmount": 80367.99829618284,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 143,
    "itemNo": "3 year",
    "subItem": "",
    "description": "3 year",
    "unit": "",
    "rate": 1134362,
    "category": "OM",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 1133506.2479310883,
    "designQty": 0,
    "designAmount": 1213874.2462272712,
    "diffAmount": 80367.99829618284,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 144,
    "itemNo": "4 year",
    "subItem": "",
    "description": "4 year",
    "unit": "",
    "rate": 1134362,
    "category": "OM",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 1133506.2479310883,
    "designQty": 0,
    "designAmount": 1213874.2462272712,
    "diffAmount": 80367.99829618284,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 145,
    "itemNo": "5 year",
    "subItem": "",
    "description": "5 year",
    "unit": "",
    "rate": 1134362,
    "category": "OM",
    "feedsGrandTotal": true,
    "tenderQty": 0,
    "tenderAmount": 1133506.2479310883,
    "designQty": 0,
    "designAmount": 1213874.2462272712,
    "diffAmount": 80367.99829618284,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 146,
    "itemNo": "",
    "subItem": "",
    "description": "Row 146",
    "unit": "",
    "rate": 0,
    "category": "TOTAL",
    "feedsGrandTotal": false,
    "tenderQty": 0,
    "tenderAmount": 290177599.47035843,
    "designQty": 0,
    "designAmount": 310751807.03418136,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  },
  {
    "row": 147,
    "itemNo": "",
    "subItem": "",
    "description": "Row 147",
    "unit": "",
    "rate": 0,
    "category": "TOTAL",
    "feedsGrandTotal": false,
    "tenderQty": 0,
    "tenderAmount": 0,
    "designQty": 0,
    "designAmount": 20574207.563822925,
    "diffAmount": 0,
    "pctDiff": 0,
    "minors": {
      "injewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sarpewada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka1": {
        "tenderQty": 0,
        "designQty": 0
      },
      "koka2": {
        "tenderQty": 0,
        "designQty": 0
      },
      "sonkund": {
        "tenderQty": 0,
        "designQty": 0
      },
      "palora": {
        "tenderQty": 0,
        "designQty": 0
      },
      "kesalwada": {
        "tenderQty": 0,
        "designQty": 0
      },
      "dudhara": {
        "tenderQty": 0,
        "designQty": 0
      }
    }
  }
];

export const TABLE_1_SUMMARY = {
  projectName: 'Construction of Pipe Distribution Network on Minors along with CADWM',
  reach: 'RD 0 to 10000 M on Main Canal of Surewada Lift Irrigation Scheme (2073 Ha)',
  tenderTotalAmount: 290177599.47035843,
  designTotalAmount: 310751807.03418136,
  diffAmount: 20574207.563822925,
  pctDiff: 0.07090212214488347,
  tenderCcaHa: 1470.75,
  designCcaHa: 1812.39,
  tenderCostPerHa: 197299.06474272202,
  designCostPerHa: 171459.67867521965,
  tenderPipeCostPerHa: 114004.66540880501,
  designPipeCostPerHa: 99849.38948653435
};
