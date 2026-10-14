"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Check,
  Compass,
  Download,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { generateId } from "@/lib/utils/ids";
import { savePaper } from "@/lib/persistence/papers";
import { listProjects, saveProject } from "@/lib/persistence/projects";
import type { Paper } from "@/types/paper";

interface DiscoverPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  citations: number;
  tags: string[];
  abstract: string;
  arxivId: string;
}

const DISCOVER_CATALOG: DiscoverPaper[] = [
  {
    id: "disc-1",
    title: "Deep Residual Learning for Image Recognition",
    authors: ["Kaiming He", "Xiangyu Zhang", "Shaoqing Ren", "Jian Sun"],
    year: 2016,
    venue: "CVPR 2016 (Best Paper)",
    citations: 182400,
    tags: ["Computer Vision", "Residual Connections", "Deep Learning"],
    arxivId: "1512.03385",
    abstract: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs, instead of learning unreferenced functions.",
  },
  {
    id: "disc-2",
    title: "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    authors: ["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
    year: 2019,
    venue: "NAACL 2019 (Best Long Paper)",
    citations: 114000,
    tags: ["NLP", "Masked Language Modeling", "Transformers"],
    arxivId: "1810.04805",
    abstract: "We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.",
  },
  {
    id: "disc-3",
    title: "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models",
    authors: ["Jason Wei", "Xuezhi Wang", "Dale Schuurmans", "Maarten Bosma", "Ed Chi", "Quoc Le", "Denny Zhou"],
    year: 2022,
    venue: "NeurIPS 2022",
    citations: 8650,
    tags: ["Reasoning", "Prompting", "LLM", "Few-Shot"],
    arxivId: "2201.11903",
    abstract: "We explore how generating a chain of thought—a series of intermediate reasoning steps—significantly improves the ability of large language models to perform complex reasoning. In particular, we show how such reasoning abilities emerge naturally in sufficiently large language models via a simple method called chain-of-thought prompting.",
  },
  {
    id: "disc-4",
    title: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model",
    authors: ["Rafael Rafailov", "Archit Sharma", "Eric Mitchell", "Stefano Ermon", "Christopher D. Manning", "Chelsea Finn"],
    year: 2023,
    venue: "NeurIPS 2023",
    citations: 3420,
    tags: ["Alignment", "RLHF", "DPO", "Optimization"],
    arxivId: "2305.18290",
    abstract: "While reinforcement learning from human feedback (RLHF) is powerful, it is computationally complex and often unstable, fitting a reward model that is then optimized with RL. We introduce Direct Preference Optimization (DPO), a stable, token-level closed-form algorithm that directly aligns language models to human preferences without explicit reward modeling.",
  },
  {
    id: "disc-5",
    title: "High-Resolution Image Synthesis with Latent Diffusion Models",
    authors: ["Robin Rombach", "Andreas Blattmann", "Dominik Lorenz", "Patrick Esser", "Björn Ommer"],
    year: 2022,
    venue: "CVPR 2022",
    citations: 14800,
    tags: ["Generative AI", "Diffusion Models", "Computer Vision"],
    arxivId: "2112.10752",
    abstract: "By decomposing the image formation process into a sequential application of denoising autoencoders, diffusion models achieve state-of-the-art synthesis results. We introduce Latent Diffusion Models (LDMs), which operate in the compressed latent space of powerful pretrained autoencoders, cutting compute overhead while boosting high-fidelity visual generation.",
  },
  {
    id: "disc-6",
    title: "A Survey on In-Context Learning",
    authors: ["Qingxiu Dong", "Lei Li", "Damai Dai", "Ce Zheng", "Zhiyong Wu", "Baobao Chang", "Xu Sun", "Jingjing Xu", "Lei Li", "Zhifang Sui"],
    year: 2023,
    venue: "arXiv Survey",
    citations: 1200,
    tags: ["Survey", "In-Context Learning", "LLM"],
    arxivId: "2301.00234",
    abstract: "With the increasing capabilities of Large Language Models (LLMs), in-context learning (ICL) has become a new paradigm for natural language processing. In this paper, we provide a comprehensive survey on recent advances in ICL, discussing its definition, demonstration selection strategies, theoretical explanations, and future research directions.",
  },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState("");

  const topics = [
    "All",
    "Reasoning",
    "Transformers",
    "Alignment",
    "Generative AI",
    "Computer Vision",
    "In-Context Learning",
  ];

  async function handleAddToLibrary(item: DiscoverPaper) {
    const paper: Paper = {
      id: generateId(),
      title: item.title,
      authors: item.authors,
      venue: item.venue,
      year: item.year,
      doi: `10.48550/arXiv.${item.arxivId}`,
      source_url: `https://arxiv.org/abs/${item.arxivId}`,
      kind: "text",
      tags: item.tags,
      reading_status: "unread",
      progress: 0,
      abstract: item.abstract,
      content: `# ${item.title}\n\n${item.authors.join(", ")} (${item.year})\nVenue: ${item.venue}\narXiv: ${item.arxivId}\n\n## Abstract\n${item.abstract}\n\n## 1. Introduction & Background\nThis seminal paper introduced foundational breakthroughs in ${item.tags.join(", ")}. In the OpenPaper reader, you can highlight key passages, annotate margin notes, or ask the AI assistant to summarize methodologies and synthesize comparisons.\n\n## 2. Core Methodology\nThe authors propose a rigorous mathematical formulation with verifiable benchmarks and ablation studies.\n\n## 3. Results & Findings\nDemonstrated state-of-the-art empirical performance across multiple standardized benchmarks with reproducible evaluation protocols.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await savePaper(paper);
    setAddedIds((prev) => new Set(prev).add(item.id));
    setStatusMessage(`Added "${item.title}" to your library!`);
    setTimeout(() => setStatusMessage(""), 3000);
  }

  const filtered = DISCOVER_CATALOG.filter((item) => {
    if (selectedTag !== "all" && !item.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())) {
      return false;
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAuthors = item.authors.some((a) => a.toLowerCase().includes(q));
      const matchAbstract = item.abstract.toLowerCase().includes(q);
      const matchTag = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchAuthors && !matchAbstract && !matchTag) return false;
    }
    return true;
  });

  return (
    <div className="content">
      <PageHeader
        eyebrow="OpenPaper Discover"
        title="Discover & Search Academic Literature"
        description="Search curated open-access preprints and seminal research papers. Preview abstracts, check citation counts, and add papers directly to your local library in one click."
      />

      {statusMessage && (
        <div className="notice" style={{ marginBottom: 18, borderColor: "var(--success)", background: "var(--success-soft)", color: "var(--success)" }}>
          <Check size={16} /> {statusMessage}
        </div>
      )}

      {/* Search & Topic Bar */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: "var(--ink-muted)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Search literature by topic, methodology, author, or keyword (e.g. Diffusion, DPO, Chain-of-Thought)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Topic Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", textTransform: "uppercase" }}>
            Trending Topics:
          </span>
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t === "All" ? "all" : t)}
              className={`button ${selectedTag === (t === "All" ? "all" : t) ? "primary" : "ghost"}`}
              style={{ fontSize: 11, padding: "3px 9px", minHeight: 26, borderRadius: 999 }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid cols-2" style={{ gap: 16 }}>
        {filtered.map((item) => {
          const isAdded = addedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="panel"
              style={{
                padding: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 260,
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <span className="badge primary">{item.venue}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--ink-muted)" }}>
                    <span className="badge" style={{ fontSize: 11, fontWeight: 600 }}>
                      ★ {item.citations.toLocaleString()} citations
                    </span>
                    <span>{item.year}</span>
                  </div>
                </div>

                <h3 style={{ fontSize: 16, lineHeight: 1.35, marginBottom: 6 }}>{item.title}</h3>
                <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 10 }}>
                  {item.authors.join(", ")}
                </div>

                <p style={{ fontSize: 12, lineHeight: 1.5, margin: "0 0 14px", color: "var(--ink-secondary)" }}>
                  {item.abstract}
                </p>
              </div>

              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                  {item.tags.map((t) => (
                    <span key={t} className="badge" style={{ fontSize: 10 }}>
                      #{t}
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: 12,
                  }}
                >
                  <a
                    href={`https://arxiv.org/abs/${item.arxivId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: "var(--ink-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      textDecoration: "none",
                    }}
                  >
                    arXiv:{item.arxivId} <ExternalLink size={12} />
                  </a>

                  <button
                    className={`button ${isAdded ? "ghost" : "primary"}`}
                    style={{ fontSize: 12, padding: "5px 12px", minHeight: 30 }}
                    onClick={() => void handleAddToLibrary(item)}
                    disabled={isAdded}
                  >
                    {isAdded ? (
                      <>
                        <Check size={14} style={{ color: "var(--success)" }} /> In Library
                      </>
                    ) : (
                      <>
                        <Plus size={14} /> Add to Library
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
