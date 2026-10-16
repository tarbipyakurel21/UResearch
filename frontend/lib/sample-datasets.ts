export const SAMPLE_CSV_DATA = `model_name,benchmark,accuracy,f1_score,latency_ms,cost_per_1k,status
GPT-4o,MMLU,0.887,0.879,420,0.005,passed
GPT-4o,GSM8k,0.923,0.915,510,0.005,passed
GPT-4o,HumanEval,0.902,0.895,680,0.005,passed
Claude-3.5-Sonnet,MMLU,0.883,0.876,460,0.003,passed
Claude-3.5-Sonnet,GSM8k,0.931,0.924,530,0.003,passed
Claude-3.5-Sonnet,HumanEval,0.920,0.912,640,0.003,passed
Gemini-1.5-Pro,MMLU,0.859,0.850,380,0.0035,passed
Gemini-1.5-Pro,GSM8k,0.892,0.885,470,0.0035,passed
Gemini-1.5-Pro,HumanEval,0.841,0.835,590,0.0035,passed
Llama-3-70B,MMLU,0.820,0.812,310,0.0008,passed
Llama-3-70B,GSM8k,0.845,0.838,390,0.0008,passed
Llama-3-70B,HumanEval,0.817,0.809,480,0.0008,passed
Mistral-Large,MMLU,0.812,0.804,330,0.002,passed
Mistral-Large,GSM8k,0.832,0.825,410,0.002,passed
Mistral-Large,HumanEval,0.795,0.788,520,0.002,passed
Qwen-2.5-72B,MMLU,0.861,0.854,340,0.0012,passed
Qwen-2.5-72B,GSM8k,0.916,0.908,440,0.0012,passed
Qwen-2.5-72B,HumanEval,0.864,0.855,510,0.0012,passed
DeepSeek-V2.5,MMLU,0.852,0.845,390,0.0014,passed
DeepSeek-V2.5,GSM8k,0.892,0.884,490,0.0014,passed
DeepSeek-V2.5,HumanEval,0.838,0.829,580,0.0014,passed`;

export const SAMPLE_JSONL_DATA = `{"run_id":"run_001","architecture":"Transformer","dataset":"WMT-14-EnDe","bleu_score":28.4,"training_hours":12.0,"gpus":8,"loss":1.42}
{"run_id":"run_002","architecture":"Transformer","dataset":"WMT-14-EnFr","bleu_score":41.8,"training_hours":84.0,"gpus":8,"loss":1.18}
{"run_id":"run_003","architecture":"ConvS2S","dataset":"WMT-14-EnDe","bleu_score":25.16,"training_hours":38.0,"gpus":8,"loss":1.89}
{"run_id":"run_004","architecture":"ConvS2S","dataset":"WMT-14-EnFr","bleu_score":40.46,"training_hours":288.0,"gpus":8,"loss":1.35}
{"run_id":"run_005","architecture":"ByteNet","dataset":"WMT-14-EnDe","bleu_score":23.75,"training_hours":48.0,"gpus":8,"loss":2.10}
{"run_id":"run_006","architecture":"GNMT+RL","dataset":"WMT-14-EnDe","bleu_score":24.60,"training_hours":144.0,"gpus":8,"loss":1.95}
{"run_id":"run_007","architecture":"GNMT+RL","dataset":"WMT-14-EnFr","bleu_score":39.92,"training_hours":180.0,"gpus":8,"loss":1.41}
{"run_id":"run_008","architecture":"Transformer-XL","dataset":"WMT-14-EnDe","bleu_score":29.1,"training_hours":22.0,"gpus":8,"loss":1.38}
{"run_id":"run_009","architecture":"Transformer-XL","dataset":"WMT-14-EnFr","bleu_score":42.5,"training_hours":96.0,"gpus":8,"loss":1.12}
{"run_id":"run_010","architecture":"Reformer","dataset":"WMT-14-EnDe","bleu_score":27.6,"training_hours":16.0,"gpus":4,"loss":1.51}
{"run_id":"run_011","architecture":"Performer","dataset":"WMT-14-EnDe","bleu_score":26.9,"training_hours":14.0,"gpus":4,"loss":1.58}
{"run_id":"run_012","architecture":"Mamba-SSM","dataset":"WMT-14-EnDe","bleu_score":28.0,"training_hours":11.0,"gpus":8,"loss":1.45}`;
